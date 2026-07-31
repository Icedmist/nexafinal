import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, limit, getDoc, doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { SetupWizard, type SetupWizardData } from "@/components/onboarding/SetupWizard";

export default OnboardingPage;

function OnboardingPage() {
  const { user, claims } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  // Check if store already exists for the user on mount
  React.useEffect(() => {
    if (!user) return;

    const checkExisting = async () => {
      if (claims?.storeId) {
        try {
          const storeRef = doc(db, "stores", claims.storeId);
          const storeSnap = await getDoc(storeRef);
          
          if (storeSnap.exists()) {
            const data = storeSnap.data();
            const targetSlug = data.slug;
            const host = window.location.hostname;
            const port = window.location.port;
            const protocol = window.location.protocol;

            if (host.includes("localhost") || host.includes("127.0.0.1")) {
              window.location.href = `${protocol}//${targetSlug}.localhost${port ? `:${port}` : ""}/app/dashboard`;
            } else {
              const parts = host.split(".");
              const domain = parts.slice(-2).join(".");
              window.location.href = `${protocol}//${targetSlug}.${domain}/app/dashboard`;
            }
            return;
          }
        } catch (e) {
          console.error("Failed to check existing store:", e);
        }
      }

      const q = query(collection(db, "stores"), where("ownerId", "==", user.uid), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const existingStore = snap.docs[0].data();
        const targetSlug = existingStore.slug;
        const host = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol;

        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          window.location.href = `${protocol}//${targetSlug}.localhost${port ? `:${port}` : ""}/app/dashboard`;
        } else {
          const parts = host.split(".");
          const domain = parts.slice(-2).join(".");
          window.location.href = `${protocol}//${targetSlug}.${domain}/app/dashboard`;
        }
      }
    };
    checkExisting();
  }, [user, claims]);

  const handleCreateStore = async (data: SetupWizardData) => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Check if slug exists to prevent collision
      const q = query(collection(db, "stores"), where("slug", "==", data.slug), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("This store URL slug is already taken. Please choose a different name.");
        setLoading(false);
        return;
      }

      // 2. Create store document
      const storeRef = await addDoc(collection(db, "stores"), {
        name: data.storeName,
        slug: data.slug,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        businessType: data.sector,
        complexityLevel: "advanced",
        setupComplete: true,
        branding: {
          primaryColor: data.primaryColor,
        },
        settings: {
          moniepointEnabled: !!data.moniepointKey,
        },
        storeDetails: {
          name: data.storeName,
          address: "",
          phone: "",
          receiptFooter: "Thank you for your patronage!",
          taxRate: 0
        },
        // Write categories array to store document for BusinessContext
        categories: data.categories,
      });

      // 3. Create initial staff record for the owner
      await setDoc(doc(db, "staff", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "Store Owner",
        role: "admin",
        storeId: storeRef.id,
        ownerId: user.uid,
        isActive: true,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
      });

      // 4. Create Moniepoint integration linking if key is supplied
      if (data.moniepointKey) {
        await setDoc(doc(db, "moniepoint_accounts", storeRef.id), {
          apiKey: data.moniepointKey,
          storeId: storeRef.id,
          businessName: data.storeName,
          linkedAt: new Date().toISOString(),
        });
      }

      // 5. Create selected categories in Firestore
      const categoryMap = new Map<string, string>();
      for (const catName of data.categories) {
        const catRef = await addDoc(collection(db, "categories"), {
          name: catName,
          description: `${catName} category`,
          parentId: null,
          storeId: storeRef.id,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        categoryMap.set(catName, catRef.id);
      }

      // 6. Create quick products catalog in Firestore
      for (const prod of data.products) {
        // Attempt to find a matching category from the ones selected
        let matchedCatId: string | null = null;
        for (const [catName, catId] of categoryMap.entries()) {
          if (prod.name.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(prod.name.toLowerCase())) {
            matchedCatId = catId;
            break;
          }
        }
        
        // If not matched, default to the first created category or null
        if (!matchedCatId && data.categories.length > 0) {
          matchedCatId = categoryMap.get(data.categories[0]) || null;
        }

        const productRef = doc(collection(db, "products"));
        await setDoc(productRef, {
          id: productRef.id,
          sku: `SKU-${prod.name.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`,
          barcode: null,
          name: prod.name,
          description: "Initial stock load from setup",
          categoryId: matchedCatId,
          status: "active",
          unit: prod.unit || "Piece",
          currentStock: Number(prod.stock) || 0,
          reorderPoint: 5,
          reorderQuantity: 10,
          costPrice: Number(prod.costPrice) || 0,
          sellingPrice: Number(prod.price) || 0,
          locationId: null,
          supplierId: null,
          imageUrl: null,
          customFields: {},
          storeId: storeRef.id,
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      toast.success("Nexa store fully initialized! Loading dashboard...");

      // 7. Perform routing redirect to setup tenant subdomain context
      const host = window.location.host;
      const protocol = window.location.protocol;
      const isLocalhost = host.includes("localhost");

      if (isLocalhost) {
        window.location.href = `${protocol}//${host}/app/dashboard?s=${data.slug}&tour=true`;
      } else {
        const baseDomain = host.split(".").slice(-2).join(".");
        window.location.href = `${protocol}//${data.slug}.${baseDomain}/app/dashboard?tour=true`;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create store");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 selection:bg-primary/30 relative">
      {/* Dynamic ambient backgrounds */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col items-center">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 flex text-primary shadow-inner ring-8 ring-primary/5">
             <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">Setup Nexa Merchant OS</h1>
          <p className="text-xs text-muted-foreground max-w-sm">Powering smart point-of-sale and live bank transfers mirrors.</p>
        </div>

        <SetupWizard onComplete={handleCreateStore} loading={loading} />
      </div>
    </div>
  );
}
