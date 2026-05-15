import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, limit, getDoc, doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, ArrowRight, Sparkles, Layers } from "lucide-react";

export default OnboardingPage;

function OnboardingPage() {
  const { user, claims } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(1);
  const [storeName, setStoreName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [businessType, setBusinessType] = React.useState("retail");
  const [complexity, setComplexity] = React.useState("basic");
  const [loading, setLoading] = React.useState(false);

  const businessTypes = [
    { id: "retail", label: "Retail", icon: "🛍️" },
    { id: "wholesale", label: "Wholesale", icon: "📦" },
    { id: "services", label: "Services", icon: "🛠️" },
    { id: "restaurant", label: "Restaurant", icon: "🍳" },
    { id: "other", label: "Other", icon: "✨" },
  ];

  const complexityLevels = [
    { 
      id: "basic", 
      label: "Simple", 
      desc: "Essentials only. Fast and clean.",
      icon: "⚡" 
    },
    { 
      id: "advanced", 
      label: "Power User", 
      desc: "Full analytics & complex inventory.",
      icon: "💎" 
    },
  ];

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

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      console.log("[Onboarding] Checking slug availability...");
      const q = query(collection(db, "stores"), where("slug", "==", slug.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("This store URL is already taken.");
        setLoading(false);
        return;
      }

      console.log("[Onboarding] Creating store document...");

      const storeRef = await addDoc(collection(db, "stores"), {
        name: storeName,
        slug: slug.toLowerCase(),
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        businessType,
        complexityLevel: complexity,
        setupComplete: true,
        storeDetails: {
          name: storeName,
          address: "",
          phone: "",
        }
      });

      console.log("[Onboarding] Creating staff record...");

      await setDoc(doc(db, "staff", user.uid), {
        email: user.email,
        displayName: user.displayName || "Store Owner",
        role: "admin",
        storeId: storeRef.id,
        ownerId: user.uid,
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      toast.success("Store created! Launching system...");

      const host = window.location.host;
      const protocol = window.location.protocol;
      const isLocalhost = host.includes("localhost");

      if (isLocalhost) {
        window.location.href = `${protocol}//${host}/app/dashboard?s=${slug.toLowerCase()}&tour=true`;
      } else {
        const baseDomain = host.split(".").slice(-2).join(".");
        window.location.href = `${protocol}//${slug.toLowerCase()}.${baseDomain}/app/dashboard?tour=true`;
      }
    } catch (err: any) {
      console.error("[Onboarding] Error during store launch:", err);
      if (err.message?.includes("index")) {
        toast.error("Database indexes are still building. Please wait a minute and try again.");
      } else {
        toast.error(err.message || "Failed to create store");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 selection:bg-primary/30">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[150px]" />
      </div>

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 flex text-primary mb-6 shadow-inner ring-8 ring-primary/5">
             <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Setup Nexa OS</h1>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[1, 2].map((s) => (
              <div key={s} className={`h-1 rounded-full transition-all duration-500 ${step === s ? "w-8 bg-primary" : "w-2 bg-muted"}`} />
            ))}
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-2 border-border shadow-2xl overflow-hidden bg-card/50 backdrop-blur-xl group relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              {step === 1 ? <><Building2 className="h-5 w-5" /> Identity</> : <><Layers className="h-5 w-5" /> Preferences</>}
            </CardTitle>
            <CardDescription className="font-medium">
              {step === 1 ? "Start with your store name and custom URL." : "Customize Nexa for your business needs."}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10">
            {step === 1 ? (
              <div className="space-y-6">
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
                        className="h-12 rounded-xl border-2 font-bold focus:border-primary/50 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground">
                        .nexa.com
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => storeName && slug && setStep(2)} 
                  className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-2"
                  disabled={!storeName || !slug}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Business Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {businessTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setBusinessType(type.id)}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${businessType === type.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}
                      >
                        <span className="text-xl">{type.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-tighter">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dashboard Complexity</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {complexityLevels.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setComplexity(level.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-1 group/item ${complexity === level.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{level.icon}</span>
                          <div className={`h-2 w-2 rounded-full ${complexity === level.id ? "bg-primary" : "bg-transparent border border-muted"}`} />
                        </div>
                        <span className={`text-xs font-black uppercase mt-2 ${complexity === level.id ? "text-primary" : "text-foreground"}`}>{level.label}</span>
                        <p className="text-[9px] text-muted-foreground font-medium leading-tight">{level.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setStep(1)} className="h-12 rounded-xl font-bold px-6">Back</Button>
                  <Button onClick={handleCreateStore} className="flex-1 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-2" disabled={loading}>
                    {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <>Launch OS <Sparkles className="h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
