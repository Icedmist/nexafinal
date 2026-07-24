import { Globe, MessageCircle, Link as LinkIcon, Landmark, Eye, ShoppingCart, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { getStorefrontUrl } from "@/lib/utils";

export function SocialCommerceDashboard() {
  const { settings } = useSystemSettings();
  
  const fullStoreUrl = settings.storeSlug 
    ? getStorefrontUrl(settings.storeSlug)
    : `${window.location.origin}/store/demo-store`;

  const displayStoreUrl = settings.storeSlug 
    ? `store/${settings.storeSlug}`
    : "store/demo-store";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* ── Storefront Status ────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-fuchsia-500/10">
            <Globe className="h-5 w-5 text-fuchsia-600" />
          </div>
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">LIVE</Badge>
        </div>
        <h3 className="font-bold text-sm mb-1">Public Storefront</h3>
        <p className="text-xs text-muted-foreground mb-4 font-mono truncate">{displayStoreUrl}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] gap-1.5" onClick={() => window.open(fullStoreUrl, '_blank')}>
            <Eye className="h-3 w-3" /> View
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px] gap-1.5" onClick={() => {
            navigator.clipboard.writeText(fullStoreUrl);
          }}>
            <LinkIcon className="h-3 w-3" /> Copy
          </Button>
        </div>
      </div>

      {/* ── Moniepoint Integration ─────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Landmark className="h-5 w-5 text-emerald-600" />
          </div>
          <Badge variant={settings.moniepointKey ? "default" : "secondary"} className="text-[10px] px-2">
            {settings.moniepointKey ? "Connected" : "Inactive"}
          </Badge>
        </div>
        <h3 className="font-bold text-sm mb-1">Payment Gateway</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {settings.moniepointKey ? "Accepting Moniepoint payments." : "Connect Moniepoint to accept payments."}
        </p>
        <Button size="sm" variant="secondary" className="w-full h-8 text-[11px] gap-1.5" asChild>
          <a href="/app/settings">
             {settings.moniepointKey ? "Update Key" : "Connect Now"} <ArrowUpRight className="h-3 w-3" />
          </a>
        </Button>
      </div>

      {/* ── Social Share ────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-[#25D366]/10">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
          </div>
          <div className="flex -space-x-1.5">
             {[1,2,3].map(i => <div key={i} className="h-5 w-5 rounded-full border-2 border-background bg-slate-200" />)}
          </div>
        </div>
        <h3 className="font-bold text-sm mb-1">WhatsApp Marketing</h3>
        <p className="text-xs text-muted-foreground mb-4">Share your catalog link to your status or groups.</p>
        <Button size="sm" className="w-full h-8 text-[11px] bg-[#25D366] hover:bg-[#1fb355] text-white gap-1.5" onClick={() => {
           const text = `Browse our products here: ${fullStoreUrl}`;
           window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }}>
          Share Catalog <ArrowUpRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
