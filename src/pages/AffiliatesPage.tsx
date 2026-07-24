import { useState } from "react";
import {
  Link2,
  Users,
  TrendingUp,
  Handshake,
  Mail,
  MessageSquare,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useItems } from "@/hooks/useInventoryData";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/hooks/useDemo";
import { useBusiness } from "@/contexts/BusinessContext";
import { getStorefrontUrl, getCleanStoreSlug } from "@/lib/utils";

const DEMO_PARTNERS = [
  { id: "P101", name: "Tunde Ednut", email: "tunde@example.com", status: "active", sales: 12, earnings: 24000 },
  { id: "P102", name: "Ifeanyi Martha", email: "ifeanyi@example.com", status: "active", sales: 8, earnings: 16000 },
  { id: "P103", name: "Retail Hub", email: "hub@example.com", status: "pending", sales: 0, earnings: 0 },
];

export default function AffiliatesPage() {
  const { data: items } = useItems({ status: "active" });
  const affiliateItems = items.filter(i => i.affiliateCommission && i.affiliateCommission > 0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { profile: liveProfile } = useBusiness();
  const onboarding = isDemo ? demoOnboarding : liveProfile;
  const storeSlug = getCleanStoreSlug(
    isDemo ? demoOnboarding.storeName : liveProfile?.storeDetails?.slug,
    isDemo ? demoOnboarding.storeName : liveProfile?.storeDetails?.name
  );

  const copyReferralLink = (partnerId: string) => {
    const url = getStorefrontUrl(storeSlug, "", { aff: partnerId });
    navigator.clipboard.writeText(url);
    setCopiedId(partnerId);
    toast.success("Affiliate link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Affiliate Program</h1>
          <p className="text-muted-foreground">Manage partners and commissions for your shared products.</p>
        </div>
        <Button className="gap-2">
          <Handshake className="h-4 w-4" /> Recruit Partner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Partners</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">12</span>
              <span className="text-xs text-green-600 font-medium">+2 this week</span>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commissions Paid</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">₦45,200</span>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partner Sales</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">34</span>
              <span className="text-xs text-primary font-medium">12.5% share</span>
            </div>
          </CardHeader>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mt-8">Active Partners</h2>
      <div className="rounded-md border border-border bg-card">
        <div className="grid grid-cols-[1fr_100px_100px_140px] gap-4 p-4 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Partner</div>
          <div className="text-right">Sales</div>
          <div className="text-right">Earnings</div>
          <div className="text-right">Referral Link</div>
        </div>
        {DEMO_PARTNERS.map((partner) => (
          <div key={partner.id} className="grid grid-cols-[1fr_100px_100px_140px] gap-4 p-4 items-center border-b last:border-0 hover:bg-muted/50 transition-colors">
            <div>
              <p className="text-sm font-medium">{partner.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{partner.email}</p>
                <Badge variant={partner.status === "active" ? "outline" : "secondary"} className="h-4 text-[10px] px-1">
                  {partner.status}
                </Badge>
              </div>
            </div>
            <div className="text-right font-medium text-sm">
              {partner.sales}
            </div>
            <div className="text-right font-semibold text-green-600 text-sm">
              ₦{partner.earnings.toLocaleString()}
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2 text-xs"
                onClick={() => copyReferralLink(partner.id)}
              >
                {copiedId === partner.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copy Link
              </Button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-8">Active Commissions</h2>
      {affiliateItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No commission rules set</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Enable e-commerce on items and set a commission amount to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <div className="grid grid-cols-[1fr_120px_120px] gap-4 p-4 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Product</div>
            <div className="text-right">Commission</div>
            <div className="text-right">Actions</div>
          </div>
          {affiliateItems.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_120px_120px] gap-4 p-4 items-center border-b last:border-0 hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
              </div>
              <div className="text-right font-semibold text-green-600">
                ₦{item.affiliateCommission?.toLocaleString()}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
