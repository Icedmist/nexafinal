import * as React from "react";
import { Palette, Upload, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/lib/storage";

const BRAND_COLORS = [
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Green", value: "#22c55e" },
];

export function StoreBranding() {
  const { profile, updateProfile, loadingProfile } = useBusiness();
  const [selectedColor, setSelectedColor] = React.useState("#0d9488");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [storeName, setStoreName] = React.useState("");
  const [storeSlug, setStoreSlug] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);


  const { staffLoginUrl, baseDomain } = React.useMemo(() => {
    if (!storeSlug || typeof window === "undefined") return { staffLoginUrl: "", baseDomain: "" };
    const { host, protocol } = window.location;
    
    let bd = host;
    const parts = host.split(".");
    if (parts.length >= 3) {
      bd = parts.slice(1).join(".");
    } else if (parts.length === 2 && !host.includes('localhost')) {
      // Keep as is for domains like example.com
    }

    if (host.startsWith(`${storeSlug}.`) || host.split(':')[0] === storeSlug) {
      return { staffLoginUrl: `${protocol}//${host}`, baseDomain: bd };
    }

    return { staffLoginUrl: `${protocol}//${storeSlug}.${bd}`, baseDomain: bd };
  }, [storeSlug]);

  React.useEffect(() => {
    if (profile) {
      setStoreName(profile.storeDetails?.name || "");
      // @ts-ignore - slug is added to the interface but TS might not see it yet in some contexts
      setStoreSlug(profile.storeDetails?.slug || "");
      if (profile.branding) {
        setSelectedColor(profile.branding.primaryColor || "#0d9488");
        setLogoUrl(profile.branding.logo || "");
      }
    }
  }, [profile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const result = await uploadImage(file, "branches", `logo_${profile?.id}`);
      setLogoUrl(result.url);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        storeDetails: {
          ...profile?.storeDetails,
          name: storeName.trim(),
          // @ts-ignore
          slug: storeSlug.trim().toLowerCase().replace(/\s+/g, "-"),
        },
        branding: {
          primaryColor: selectedColor,
          logo: logoUrl.trim(),
        }
      } as any);
      toast.success("Branding and store details updated");
    } catch (err) {
      toast.error("Failed to update branding");
    }
  };

  if (loadingProfile) {
    return <div className="p-12 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <Card className="rounded-[2rem] border-border bg-card/50 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Palette className="h-5 w-5 text-primary" /> Visual Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Store Display Name</Label>
            <Input
              value={storeName}
              disabled
              className="h-12 rounded-xl bg-muted/50 cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground italic">Store name is fixed and cannot be changed.</p>
          </div>
          {staffLoginUrl && (
            <div className="md:col-span-2 rounded-2xl bg-primary/5 p-6 border border-primary/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Shop Subdomain</p>
                  <h3 className="text-xl font-bold text-foreground lowercase tracking-tight">
                    {storeSlug}<span className="text-muted-foreground/50">.{baseDomain}</span>
                  </h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="pt-3 border-t border-primary/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Staff Login URL</p>
                <a 
                  href={staffLoginUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-mono font-bold text-primary hover:underline break-all"
                >
                  {staffLoginUrl}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-xs font-black uppercase tracking-widest">Brand Color Palette</Label>
          <div className="flex flex-wrap gap-4">
            {BRAND_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setSelectedColor(c.value)}
                className="group flex flex-col items-center gap-2"
              >
                <div
                  className="h-12 w-12 rounded-2xl border-4 transition-all group-hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    borderColor: selectedColor === c.value ? "var(--primary)" : "transparent",
                    boxShadow: selectedColor === c.value ? `0 10px 20px -5px ${c.value}40` : "none",
                  }}
                />
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", selectedColor === c.value ? "text-primary" : "text-muted-foreground")}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-xs font-black uppercase tracking-widest">Official Store Logo</Label>
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="h-32 w-32 rounded-3xl border-2 border-dashed border-primary/20 bg-muted/30 p-2 flex items-center justify-center overflow-hidden shrink-0 group relative">
              {logoUrl ? (
                <img src={logoUrl} alt="Store Logo" className="h-full w-full object-contain" />
              ) : (
                <Palette className="h-10 w-10 text-muted-foreground/20" />
              )}
              
              {isUploading && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="rounded-xl h-11 font-bold uppercase tracking-widest text-[10px] relative overflow-hidden px-6"
                  disabled={isUploading}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                  <Upload className="h-4 w-4 mr-2" />
                  {logoUrl ? "Replace Logo" : "Upload Logo"}
                </Button>
                
                {logoUrl && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="rounded-xl h-11 font-bold uppercase tracking-widest text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setLogoUrl("")}
                    disabled={isUploading}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Recommended format: PNG or SVG</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-relaxed">
                  Square or horizontal logos work best. Images are automatically compressed to 1MB and resized to 1024px for optimal performance.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest gap-2 shadow-lg shadow-primary/20">
          <Save className="h-4 w-4" /> Finalize Branding
        </Button>
      </CardContent>
    </Card>
  );
}
