import { useState } from "react";
import {
  Link2,
  Users,
  TrendingUp,
  Handshake,
  Mail,
  MessageSquare,
  Copy,
  Check,
  Plus,
  Trash2,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useItems } from "@/hooks/useInventoryData";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/contexts/BusinessContext";
import { getStorefrontUrl, getCleanStoreSlug } from "@/lib/utils";
import { useAffiliates } from "@/hooks/useAffiliates";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

export default function AffiliatesPage() {
  const { data: items } = useItems();
  const affiliateItems = items.filter(i => (i as any).affiliateCommission && (i as any).affiliateCommission > 0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { profile } = useBusiness();
  const { partners, stats, addPartner, removePartner } = useAffiliates();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const storeSlug = getCleanStoreSlug(
    profile?.storeDetails?.slug,
    profile?.storeDetails?.name
  );

  const copyReferralLink = (partnerId: string) => {
    const url = getStorefrontUrl(storeSlug, "", { aff: partnerId });
    navigator.clipboard.writeText(url);
    setCopiedId(partnerId);
    toast.success("Affiliate link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddPartner = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setIsAdding(true);
    try {
      const referralCode = `AFF-${Date.now().toString(36).toUpperCase()}`;
      await addPartner({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        status: "active",
        referralCode,
      });
      toast.success("Partner added successfully!");
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
    } catch (error: any) {
      toast.error(error.message || "Failed to add partner");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemovePartner = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from your affiliate program?`)) return;
    try {
      await removePartner(id);
      toast.success(`${name} removed from affiliate program`);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove partner");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Affiliate Program</h1>
          <p className="text-muted-foreground">Manage partners and commissions for your shared products.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4" /> Recruit Partner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Partners</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.totalPartners}</span>
              {stats.activePartners > 0 && (
                <span className="text-xs text-green-600 font-medium">{stats.activePartners} active</span>
              )}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commissions Paid</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">₦{stats.totalCommissions.toLocaleString()}</span>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partner Sales</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.totalPartnerSales}</span>
            </div>
          </CardHeader>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mt-8">Active Partners</h2>
      {partners.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No partners yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Recruit affiliate partners to promote your products and earn commissions on sales they drive.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setShowAddModal(true)}>
              <UserPlus className="h-4 w-4" /> Add First Partner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <div className="grid grid-cols-[1fr_100px_100px_140px_50px] gap-4 p-4 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Partner</div>
            <div className="text-right">Sales</div>
            <div className="text-right">Earnings</div>
            <div className="text-right">Referral Link</div>
            <div></div>
          </div>
          {partners.map((partner) => (
            <div key={partner.id} className="grid grid-cols-[1fr_100px_100px_140px_50px] gap-4 p-4 items-center border-b last:border-0 hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{partner.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{partner.email}</p>
                  <Badge variant={partner.status === "active" ? "outline" : partner.status === "pending" ? "secondary" : "destructive"} className="h-4 text-[10px] px-1">
                    {partner.status}
                  </Badge>
                </div>
              </div>
              <div className="text-right font-medium text-sm">
                {partner.totalSales}
              </div>
              <div className="text-right font-semibold text-green-600 text-sm">
                ₦{partner.totalEarnings.toLocaleString()}
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
              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemovePartner(partner.id, partner.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                ₦{(item as any).affiliateCommission?.toLocaleString()}
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

      {/* Add Partner Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Affiliate Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Partner Name *</label>
              <Input
                placeholder="e.g., Tunde Ednut"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-11 rounded-xl border-2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email *</label>
              <Input
                type="email"
                placeholder="partner@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-11 rounded-xl border-2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone (Optional)</label>
              <Input
                type="tel"
                placeholder="+234..."
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-11 rounded-xl border-2"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="rounded-xl font-bold">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleAddPartner}
              disabled={isAdding || !newName.trim() || !newEmail.trim()}
              className="rounded-xl font-bold px-8"
            >
              {isAdding ? "Adding..." : "Add Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
