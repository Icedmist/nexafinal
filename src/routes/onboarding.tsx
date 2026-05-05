import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, limit } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, claims } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkExisting = async () => {
      // 1. Check if staff (has storeId claim)
      if (claims?.storeId) {
        // Fetch the slug for this storeId to redirect
        const q = query(collection(db, "stores"), where("id", "==", claims.storeId), limit(1));
        // Note: collection(db, "stores") works, but we might need to query by ID directly if we had it.
        // Actually, stores are indexed by ID.
        // Let's just use the ownerId check as a primary for merchants.
      }

      // 2. Check if owner
      const q = query(collection(db, "stores"), where("ownerId", "==", user.uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existingStore = snap.docs[0].data();
        const host = window.location.host;
        const protocol = window.location.protocol;
        const targetSlug = existingStore.slug;

        if (host.includes("localhost")) {
          window.location.href = `${protocol}//${host}/app/dashboard?s=${targetSlug}`;
        } else {
          const baseDomain = host.split(".").slice(-2).join(".");
          window.location.href = `${protocol}//${targetSlug}.${baseDomain}/app/dashboard`;
        }
      }
    };
    checkExisting();
  }, [user, claims]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 1. Validate slug uniqueness
      const q = query(collection(db, "stores"), where("slug", "==", slug.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("This store URL is already taken.");
        setLoading(true); // reset loading is handled in finally
        return;
      }

      // 2. Create Store Document
      const storeRef = await addDoc(collection(db, "stores"), {
        name: storeName,
        slug: slug.toLowerCase(),
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        complexityLevel: "basic",
        storeDetails: {
          name: storeName,
          address: "",
          phone: "",
        }
      });

      // 3. Create User Profile Document (if it doesn't exist)
      // This is usually handled by a trigger, but we'll ensure it has the complexityLevel
      // await setDoc(doc(db, "users", user.uid), { ... });

      toast.success("Store created! Redirecting to your dashboard...");

      // 4. Redirect to Custom Domain
      const host = window.location.host;
      const protocol = window.location.protocol;
      const isLocalhost = host.includes("localhost");

      if (isLocalhost) {
        // For localhost, use query parameter as fallback
        window.location.href = `${protocol}//${host}/app/dashboard?s=${slug.toLowerCase()}`;
      } else {
        // For production, use subdomain
        const baseDomain = host.split(".").slice(-2).join("."); // assuming nexa.com
        window.location.href = `${protocol}//${slug.toLowerCase()}.${baseDomain}/app/dashboard`;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create store");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 selection:bg-primary/30">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 flex text-primary mb-6 shadow-inner">
             <Sparkles className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Setup your Store</h1>
          <p className="mt-2 text-sm font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">The last step to commerce control</p>
        </div>

        <Card className="rounded-[2.5rem] border-2 border-border shadow-2xl overflow-hidden group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Store Details</CardTitle>
            <CardDescription>Give your store a name and a unique URL.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStore} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="storeName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Store Name</Label>
                  <Input
                    id="storeName"
                    placeholder="My Awesome Shop"
                    required
                    value={storeName}
                    onChange={(e) => {
                      setStoreName(e.target.value);
                      if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                    }}
                    className="h-12 rounded-xl border-2 font-bold focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Store URL (Slug)</Label>
                  <div className="relative">
                    <Input
                      id="slug"
                      placeholder="my-shop"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      className="h-12 rounded-xl border-2 font-bold focus:border-primary/50 transition-all pl-3"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground">
                      .nexa.com
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-2" disabled={loading}>
                {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <>Launch Store <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
