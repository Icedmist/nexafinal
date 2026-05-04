import * as React from "react";
import { Palette, Upload, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Ice Cream Palace"
              className="h-12 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest">Subdomain Slug</Label>
            <div className="flex items-center gap-2">
               <Input
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value)}
                placeholder="ice-cream-palace"
                className="h-12 rounded-xl"
              />
              <span className="text-sm font-bold text-muted-foreground">.nexa-store.os</span>
            </div>
          </div>
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

        <div className="space-y-2">
          <Label className="text-xs font-black uppercase tracking-widest">Logo Asset URL</Label>
          <div className="relative">
            <Upload className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://cloud.assets.com/my-logo.svg"
              className="h-12 rounded-xl pl-12"
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest gap-2 shadow-lg shadow-primary/20">
          <Save className="h-4 w-4" /> Finalize Branding
        </Button>
      </CardContent>
    </Card>
  );
}
