import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Link2,
  Share2,
  Copy,
  ExternalLink,
  QrCode,
  Landmark,
  Layers,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useItems } from "@/hooks/useInventoryData";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";
import { Badge } from "@/components/ui/badge";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { getStorefrontUrl, getCleanStoreSlug } from "@/lib/utils";

export default function EcommercePage() {
  const { data: allItems } = useItems();
  const items = allItems.filter(i => i.status === "active");
  const ecommerceItems = items.filter(i => i.sellingPrice > 0 && i.currentStock > 0);
  const { profile } = useBusiness();
  const { flags } = useFeatureFlags();

  const storeSlug = getCleanStoreSlug(profile?.storeDetails?.slug, profile?.storeDetails?.name);
  const storeUrl = getStorefrontUrl(storeSlug);

  const copyLink = (id: string) => {
    const url = getStorefrontUrl(storeSlug, `product/${id}`);
    navigator.clipboard.writeText(url);
    toast.success("Product link copied to clipboard!");
  };

  const shareWhatsApp = (item: { id: string; name: string; sellingPrice: number }) => {
    const url = getStorefrontUrl(storeSlug, `product/${item.id}`);
    const text = `Check out ${item.name} on our store! Only ₦${item.sellingPrice.toLocaleString()}\n\nBuy here: ${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const shareBulk = () => {
    const text = `Browse our full catalog here: ${storeUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Digital Storefront</h1>
          <p className="text-muted-foreground max-w-sm">Manage your social commerce settings and product share links.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {profile?.settings?.moniepointKey ? (
             <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
               <Landmark className="h-3.5 w-3.5" /> Moniepoint Live
             </Badge>
           ) : (
             <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-amber-500/30 bg-amber-500/5 text-amber-600">
               <Landmark className="h-3.5 w-3.5" /> Setup Moniepoint
             </Badge>
           )}
          <Button variant="outline" onClick={shareBulk} className="gap-2">
            <Share2 className="h-4 w-4" /> Share Store
          </Button>
          <Button className="gap-2" asChild>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Go to Webshop
            </a>
          </Button>
        </div>
      </div>

      {/* B2B Marketplace Banner Section */}
      <Card className="border border-sky-500/10 bg-gradient-to-r from-sky-500/5 to-primary/5 shadow-none rounded-xl">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">B2B Wholesale Module</span>
              {!flags.hasEcommerce && (
                <span className="font-bold text-[9px] uppercase bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full flex items-center gap-1">Enterprise Plan</span>
              )}
            </div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-sky-500" /> Regional Supplier Directory & Bulk Sourcing
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Connect directly with authorized wholesalers and factories across Lagos, Abuja, and Kano. Instantly import product catalogs, compare bulk prices, and synchronize shipments with your local warehouses.
            </p>
          </div>
          <div className="flex-shrink-0">
            {flags.hasEcommerce ? (
              <Button onClick={() => toast.success("Accessing regional wholesale networks...")} className="bg-primary text-white text-xs gap-1 h-9">
                Browse Suppliers <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button onClick={() => toast.error(`Feature Gated: The B2B Wholesale Marketplace is an Enterprise feature. Your current ${flags.planName} does not include supplier matching. Upgrade to unlock direct factory sourcing.`)} variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs gap-1.5 h-9 font-semibold">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Unlock Supplier Sourcing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {ecommerceItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No items enabled for e-commerce</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Head to the Catalog, edit an item, and enable "E-commerce" to start generating shareable links for your customers.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <a href="/app/catalog">Go to Catalog</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ecommerceItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm">{item.name}</CardTitle>
                <CardDescription className="text-xs uppercase font-mono">{item.sku}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-semibold text-primary">₦{item.sellingPrice.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => copyLink(item.id)}>
                    <Copy className="h-3 w-3" /> Link
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <QrCode className="h-3 w-3" /> QR
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => shareWhatsApp(item)}>
                    <Share2 className="h-3 w-3" /> WA
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
