import { useState, useEffect } from "react";
import { Store, Save, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStoreBranches, useStoreMutations, useStaff } from "@/hooks/useStaffData";
import { useSales } from "@/hooks/useSalesData";
import { useItems } from "@/hooks/useInventoryData";
import { Plus, MapPin, TrendingUp, Users, ShoppingCart, Package, Edit2 } from "lucide-react";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { isAdminRole } from "@/lib/roles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const NAIRA = "₦";
function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function StoreActivitySummary() {
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: items = [], isLoading: itemsLoading } = useItems();

  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalNgn || 0), 0);
  const totalSales = sales.length;
  const totalItems = items.length;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-widest">
          <TrendingUp className="h-4 w-4" /> Store Activity Summary
        </CardTitle>
        <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          A quick snapshot of inventory and sales performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Revenue</p>
          <p className="mt-3 text-2xl font-black text-foreground">{salesLoading ? "…" : fmtNgn(totalRevenue)}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sales Recorded</p>
          <p className="mt-3 text-2xl font-black text-foreground">{salesLoading ? "…" : totalSales}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Catalog Items</p>
          <p className="mt-3 text-2xl font-black text-foreground">{itemsLoading ? "…" : totalItems}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StoreSettings() {
  const { profile, updateProfile, loadingProfile } = useBusiness();
  const { claims } = useAuth();

  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [taxRate, setTaxRate] = useState("0");

  const isAdmin = isAdminRole(claims?.role);
  const isManager = claims?.role === 'manager';
  const branchId = claims?.branchId;
  const isRestrictedManager = isManager && !!branchId;
  const canEditGlobal = isAdmin || (isManager && !branchId);

  useEffect(() => {
    if (profile) {
      setStoreName(profile.storeDetails?.name || "");
      setPhone(profile.storeDetails?.phone || "");
      setAddress(profile.storeDetails?.address || "");
      setReceiptFooter(profile.storeDetails?.receiptFooter || "");
      setTaxRate(profile.storeDetails?.taxRate?.toString() || "0");
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        storeDetails: {
          ...profile?.storeDetails,
          name: storeName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          receiptFooter: receiptFooter.trim(),
          taxRate: parseFloat(taxRate) || 0,
        } as any
      });
      toast.success("Store settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
    }
  };

  if (loadingProfile) {
    return <div className="p-12 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  // Build subdomain-based login URL
  const getStaffLoginUrl = () => {
    const slug = profile?.storeDetails?.slug || "";
    if (!slug) return "";
    const { host, protocol } = window.location;
    
    // If current host is already on the subdomain or is the slug itself, just return current origin
    if (host.startsWith(`${slug}.`) || host.split(':')[0] === slug) {
      return `${protocol}//${host}`;
    }

    const parts = host.split(".");
    // Better base domain detection: if we have more than 2 parts (e.g. app.nexastore.com), 
    // or if we have 2 parts but the first isn't the slug (e.g. nexastore.com),
    // we want to strip the first part.
    let baseDomain = host;
    if (parts.length >= 3) {
      baseDomain = parts.slice(1).join(".");
    } else if (parts.length === 2 && !host.includes('localhost')) {
        // For domains like example.com, we don't want to strip unless we are adding a subdomain
        // But usually the admin app is on a subdomain like admin.example.com
    }
    
    return `${protocol}//${slug}.${baseDomain}`;
  };

  const staffLoginUrl = getStaffLoginUrl();

  return (
    <div className="space-y-6">
      <StoreActivitySummary />
      
      {staffLoginUrl && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Shop Login URL
            </CardTitle>
            <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Share this link with your staff to login to this store.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-4 rounded-xl border-2 border-primary/20 bg-background/50">
              <code className="flex-1 font-mono font-black text-primary text-sm truncate">
                {staffLoginUrl}
              </code>
              <Button 
                size="sm" 
                variant="outline" 
                className="rounded-lg h-8 px-3 font-bold text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(staffLoginUrl);
                  toast.success("URL copied to clipboard");
                }}
              >
                Copy Link
              </Button>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
              Staff access this URL to login directly to <strong>{storeName}</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="h-4 w-4" />Store Information</CardTitle>
          <CardDescription>Your store details appear on receipts and invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input id="store-name" value={storeName} disabled className="bg-muted/50 cursor-not-allowed font-black" />
              <p className="text-[10px] text-muted-foreground italic">Fixed store name.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Phone Number</Label>
              <Input id="store-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" className="font-mono font-bold" disabled={!canEditGlobal} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-address">Address</Label>
            <Textarea id="store-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street, Lagos" rows={2} className="font-bold" disabled={!canEditGlobal} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input id="tax-rate" type="number" min="0" max="100" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="font-bold" disabled={!canEditGlobal} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-footer">Receipt Footer Text</Label>
              <Input id="receipt-footer" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} placeholder="Thank you for your patronage!" className="font-bold" disabled={!canEditGlobal} />
            </div>
          </div>
          {canEditGlobal && (
            <Button onClick={handleSave} className="gap-1.5 rounded-xl font-bold">
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          )}
        </CardContent>
      </Card>

      {(isAdmin || isManager) && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Integrations & Add-ons
            </CardTitle>
            <CardDescription>Toggle optional external integrations and system features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-black uppercase tracking-tight text-foreground">Moniepoint POS Mirroring</Label>
                <p className="text-xs text-muted-foreground font-medium leading-normal max-w-md">
                  Enable bank transfer sync webhook listener interfaces, transaction logging, and settle panels.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const isEnabled = !profile?.settings?.moniepointEnabled;
                  try {
                    await updateProfile({
                      settings: {
                        ...profile?.settings,
                        moniepointEnabled: isEnabled,
                      }
                    });
                    toast.success(isEnabled ? "Moniepoint integration enabled! View Moniepoint Live in the sidebar." : "Moniepoint integration disabled.");
                  } catch (err) {
                    toast.error("Failed to update integration setting");
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  profile?.settings?.moniepointEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile?.settings?.moniepointEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <BranchManagement isRestrictedManager={isRestrictedManager} />
    </div>
  );
}


function BranchManagement({ isRestrictedManager }: { isRestrictedManager: boolean }) {
  const { data: branches, isLoading } = useStoreBranches();
  const { addBranch, updateBranch } = useStoreMutations();
  const [newBranch, setNewBranch] = useState({ name: "", location: "" });
  const [editingBranch, setEditingBranch] = useState<any>(null);

  const handleAdd = async () => {
    if (!newBranch.name || !newBranch.location) return;
    try {
      await addBranch({
        id: Math.random().toString(36).substr(2, 9),
        name: newBranch.name,
        location: newBranch.location,
        isMain: branches.length === 0,
      });
      setNewBranch({ name: "", location: "" });
      toast.success("Branch added");
    } catch (err) {
      toast.error("Failed to add branch");
    }
  };

  const handleUpdate = async () => {
    if (!editingBranch || !editingBranch.name || !editingBranch.location) return;
    try {
      await updateBranch(editingBranch.id, {
        name: editingBranch.name,
        location: editingBranch.location,
      });
      setEditingBranch(null);
      toast.success("Branch updated");
    } catch (err) {
      toast.error("Failed to update branch");
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Branch Management</CardTitle>
        <CardDescription>
          {isRestrictedManager ? "Manage your assigned branch details." : "Define locations for your store staff and inventory."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isRestrictedManager && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
            <div className="space-y-2">
              <Label>Branch Name</Label>
              <Input 
                placeholder="e.g. Lekki Phase 1" 
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                className="font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label>Location / Address</Label>
              <Input 
                placeholder="e.g. Plot 12, Lagos" 
                value={newBranch.location}
                onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                className="font-bold"
              />
            </div>
            <Button onClick={handleAdd} className="sm:col-span-2 gap-2 rounded-xl font-bold">
              <Plus className="h-4 w-4" /> Add Branch
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-black text-sm">{b.name} {b.isMain && <Badge className="ml-2 bg-primary/20 text-primary border-0 text-[8px] uppercase tracking-tighter">Main</Badge>}</div>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {b.location}
                  </p>
                </div>
              </div>
              
              <Dialog open={editingBranch?.id === b.id} onOpenChange={(open) => !open && setEditingBranch(null)}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingBranch(b)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-black uppercase tracking-widest text-primary">Edit Branch</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Branch Name</Label>
                      <Input 
                        value={editingBranch?.name || ""}
                        onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                        className="font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location / Address</Label>
                      <Input 
                        value={editingBranch?.location || ""}
                        onChange={(e) => setEditingBranch({ ...editingBranch, location: e.target.value })}
                        className="font-bold"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingBranch(null)} className="rounded-xl font-bold">Cancel</Button>
                    <Button onClick={handleUpdate} className="rounded-xl font-bold">Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ))}
          {branches.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground font-bold uppercase tracking-widest italic border-2 border-dashed rounded-2xl">
              No branches defined yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
