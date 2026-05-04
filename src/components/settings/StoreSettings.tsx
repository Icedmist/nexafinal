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
import { useStoreBranches, useStoreMutations } from "@/hooks/useStaffData";
import { Plus, MapPin, Trash2 } from "lucide-react";

export function StoreSettings() {
  const { profile, updateProfile, loadingProfile } = useBusiness();

  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [taxRate, setTaxRate] = useState("0");

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

  return (
    <div className="space-y-6">
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
              {window.location.origin}/auth/login?s={profile?.storeDetails?.slug || "mystore"}
            </code>
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-lg h-8 px-3 font-bold text-xs"
              onClick={() => {
                const url = `${window.location.origin}/auth/login?s=${profile?.storeDetails?.slug || "mystore"}`;
                navigator.clipboard.writeText(url);
                toast.success("URL copied to clipboard");
              }}
            >
              Copy Link
            </Button>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
            This URL automatically tags the login page with *{storeName}*.
          </p>
        </CardContent>
      </Card>

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
              <Input id="store-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" className="font-mono font-bold" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-address">Address</Label>
            <Textarea id="store-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street, Lagos" rows={2} className="font-bold" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input id="tax-rate" type="number" min="0" max="100" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="font-bold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-footer">Receipt Footer Text</Label>
              <Input id="receipt-footer" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} placeholder="Thank you for your patronage!" className="font-bold" />
            </div>
          </div>
          <Button onClick={handleSave} className="gap-1.5 rounded-xl font-bold">
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </CardContent>
      </Card>
      <BranchManagement />
    </div>
  );
}


function BranchManagement() {
  const { data: branches, isLoading } = useStoreBranches();
  const { addBranch } = useStoreMutations();
  const [newBranch, setNewBranch] = useState({ name: "", location: "" });

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

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Branch Management</CardTitle>
        <CardDescription>Define locations for your store staff and inventory.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="space-y-3">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-black text-sm">{b.name} {b.isMain && <Badge className="ml-2 bg-primary/20 text-primary border-0 text-[8px] uppercase tracking-tighter">Main</Badge>}</p>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {b.location}
                  </p>
                </div>
              </div>
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
