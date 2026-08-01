import * as React from "react";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, limit, getDoc, doc, setDoc, writeBatch } from "firebase/firestore";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { BusinessOnboarding } from "@/components/onboarding/BusinessOnboarding";
import { useOnboardingNavigation } from "@/hooks/useOnboardingNavigation";
import { DEFAULT_PLANS } from "@/utils/subscriptionUtils";

export default OnboardingPage;

function OnboardingPage() {
  const { user, claims } = useAuth();
  const { handleOptionRoute } = useOnboardingNavigation();
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

  const handleCreateStore = async (data: {
    businessType: string;
    categories: string[];
    storeName: string;
    brandColor: string;
    moniepointKey?: string;
    storeSlug?: string;
    initialItems?: Array<{
      name: string;
      price: string;
      costPrice?: string;
      stock: string;
      unit: string;
      categoryId?: string;
    }>;
    country?: string;
    state?: string;
    lga?: string;
    selectedPlan?: "starter" | "professional" | "enterprise";
    entryMethod?: "camera" | "manual" | "skip" | "excel";
  }) => {
    if (!user) return;
    setLoading(true);

    const storeName = data.storeName || "My Store";
    const slug =
      data.storeSlug ||
      storeName.toLowerCase().replace(/[^a-z0-9]/g, "-");

    try {
      // 1. Check if slug exists to prevent collision
      const q = query(collection(db, "stores"), where("slug", "==", slug), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("This store URL slug is already taken. Please choose a different name.");
        setLoading(false);
        return;
      }

      // 2. Create store document
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const chosenPlan = DEFAULT_PLANS.find(p => p.planId === (data.selectedPlan || "starter")) || DEFAULT_PLANS[0];
      const storeRef = await addDoc(collection(db, "stores"), {
        name: storeName,
        slug,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        businessType: data.businessType,
        complexityLevel: "advanced",
        setupComplete: true,
        branding: {
          primaryColor: data.brandColor,
        },
        // Subscription tier assignment: new stores pick a plan at onboarding
        // and begin a 14-day trial before they need to make a payment.
        subscriptionTier: chosenPlan.planId,
        subscriptionStatus: "trialing",
        trialEndsAt,
        currentPeriodEnd: trialEndsAt,
        paymentMethodOnFile: false,
        settings: {
          moniepointEnabled: !!data.moniepointKey,
          planId: chosenPlan.planId,
          planName: chosenPlan.name,
          subscriptionStatus: "trialing",
          trialEndsAt,
        },
        storeDetails: {
          name: storeName,
          address: "",
          phone: "",
          receiptFooter: "Thank you for your patronage!",
          taxRate: 0,
          slug,
          country: data.country || "Nigeria",
          state: data.state || "",
          lga: data.lga || "",
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
          businessName: storeName,
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

      // 6. Create initial products catalog in Firestore (bulk batch write)
      const initialItems = data.initialItems?.filter(item => item.name.trim() !== "") || [];
      if (initialItems.length > 0) {
        const batch = writeBatch(db);
        for (const prod of initialItems) {
          // Attempt to find a matching category from the ones selected
          let matchedCatId: string | null = null;
          for (const [catName, catId] of categoryMap.entries()) {
            if (prod.categoryId && prod.categoryId === catName) {
              matchedCatId = catId;
              break;
            }
          }
          if (!matchedCatId) {
            const fallback = prod.categoryId || (data.categories && data.categories[0]) || "misc";
            matchedCatId = categoryMap.get(fallback) || null;
          }

          const sellP = (prod.price && !isNaN(Number(prod.price))) ? Number(prod.price) : 0;
          const costP = (prod.costPrice && !isNaN(Number(prod.costPrice))) ? Number(prod.costPrice) : Math.round(sellP * 0.7);
          const stockV = (prod.stock && !isNaN(Number(prod.stock))) ? Number(prod.stock) : 0;

          const productRef = doc(collection(db, "products"));
          batch.set(productRef, {
            id: productRef.id,
            sku: `SKU-${prod.name.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`,
            barcode: null,
            name: prod.name,
            description: "Initial stock load from setup",
            categoryId: matchedCatId,
            status: "active",
            unit: prod.unit || "Piece",
            currentStock: stockV,
            reorderPoint: 5,
            reorderQuantity: 10,
            costPrice: costP,
            sellingPrice: sellP,
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
        await batch.commit();
      }

      toast.success("Nexa store fully initialized! Loading your dashboard...");

      // 7. Route to the app by the chosen entry method
      handleOptionRoute(data.entryMethod);
    } catch (err: any) {
      toast.error(err.message || "Failed to create store");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <BusinessOnboarding onComplete={handleCreateStore} onSkip={() => handleOptionRoute("skip")} />

      {loading && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Initializing your Nexa store…
          </div>
        </div>
      )}
    </div>
  );
}
