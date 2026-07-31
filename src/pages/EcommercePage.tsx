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
  Sparkles,
  Printer,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useItems } from "@/hooks/useInventoryData";
import { toast } from "sonner";
import { useBusiness } from "@/contexts/BusinessContext";
import { Badge } from "@/components/ui/badge";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { getStorefrontUrl, getCleanStoreSlug } from "@/lib/utils";
import { InStoreQrModal } from "@/components/store/InStoreQrModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";

export default function EcommercePage() {
  const { data: allItems } = useItems();
  const items = allItems.filter(i => i.status === "active");
  const ecommerceItems = items.filter(i => i.sellingPrice > 0 && i.currentStock > 0);
  const { profile, updateProfile } = useBusiness();
  const { flags } = useFeatureFlags();

  const storeSlug = getCleanStoreSlug(profile?.storeDetails?.slug, profile?.storeDetails?.name);
  const storeUrl = getStorefrontUrl(storeSlug);

  const [inStoreQrOpen, setInStoreQrOpen] = useState(false);
  const [activeProductQr, setActiveProductQr] = useState<{ id: string; name: string; price: number } | null>(null);

  // Edit payment account state
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [bankName, setBankName] = useState(profile?.storeDetails?.bankName || "Moniepoint Microfinance Bank");
  const [accountNumber, setAccountNumber] = useState(profile?.storeDetails?.accountNumber || "5028910423");
  const [accountName, setAccountName] = useState(profile?.storeDetails?.accountName || "NexaStoreOS / Paystack Merchant");
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const handleOpenEditAccount = () => {
    setBankName(profile?.storeDetails?.bankName || "Moniepoint Microfinance Bank");
    setAccountNumber(profile?.storeDetails?.accountNumber || "5028910423");
    setAccountName(profile?.storeDetails?.accountName || "NexaStoreOS / Paystack Merchant");
    setEditAccountOpen(true);
  };

  const handleSaveAccountDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccount(true);
    try {
      await updateProfile({
        storeDetails: {
          name: profile?.storeDetails?.name || "",
          phone: profile?.storeDetails?.phone || "",
          address: profile?.storeDetails?.address || "",
          bankName,
          accountNumber,
          accountName,
        },
      });
      toast.success("Checkout payment account updated and synced to backend!");
      setEditAccountOpen(false);
    } catch (err) {
      toast.error("Failed to save account details to backend.");
    } finally {
      setIsSavingAccount(false);
    }
  };

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
          <h1 className="text-2xl font-semibold tracking-tight">Digital Storefront & In-Store QR</h1>
          <p className="text-muted-foreground max-w-md">Manage catalog share links, in-store table QR flyers, and customer payment account details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button
             variant="default"
             onClick={() => setInStoreQrOpen(true)}
             className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-md shadow-teal-500/20"
           >
             <QrCode className="h-4 w-4" /> In-Store Table QR Standee
           </Button>
           <Button variant="outline" onClick={shareBulk} className="gap-2">
             <Share2 className="h-4 w-4" /> Share Store
           </Button>
           <Button variant="outline" className="gap-2" asChild>
             <a href={storeUrl} target="_blank" rel="noopener noreferrer">
               <ExternalLink className="h-4 w-4" /> Go to Webshop
             </a>
           </Button>
        </div>
      </div>

      {/* Bank Account Details Banner for Store Checkout */}
      <Card className="border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-none rounded-2xl">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Landmark className="h-3 w-3" /> Checkout Payment Account
              </span>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px]">
                Active for In-Store & Online Checkout
              </Badge>
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {profile?.storeDetails?.bankName || "Moniepoint Microfinance Bank"} — <span className="font-mono text-primary font-extrabold">{profile?.storeDetails?.accountNumber || "5028910423"}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Account Name: <span className="font-semibold text-foreground">{profile?.storeDetails?.accountName || "NexaStoreOS / Paystack Merchant"}</span>. Front-store buyers copy this account directly during checkout.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEditAccount}
            className="text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 h-9"
          >
            Edit Account Details
          </Button>
        </CardContent>
      </Card>

      {/* Edit Payment Account Modal */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent className="max-w-md bg-card border-border p-6 rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-emerald-600" />
              Edit Checkout Payment Account
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your store's bank account details. These will immediately sync to your backend and be displayed to customers during online and in-store checkout.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAccountDetails} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="bankName" className="text-xs font-semibold">Bank Name / Payment Gateway</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Wema Bank / Titan Paystack"
                required
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountNumber" className="text-xs font-semibold">Account Number</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 5028910423"
                required
                className="h-10 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountName" className="text-xs font-semibold">Account Name</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. NexaStoreOS / Paystack Merchant"
                required
                className="h-10 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditAccountOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingAccount} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSavingAccount ? "Saving to Backend..." : "Save Account Details"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setActiveProductQr({ id: item.id, name: item.name, price: item.sellingPrice })}
                  >
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

      {/* In-Store Standee & Table QR Modal */}
      <InStoreQrModal
        isOpen={inStoreQrOpen}
        onClose={() => setInStoreQrOpen(false)}
        storeName={profile?.storeDetails?.name || "Nexa OS Store"}
        storeSlug={storeSlug}
        logoUrl={profile?.branding?.logo}
        bankName={profile?.storeDetails?.bankName}
        accountNumber={profile?.storeDetails?.accountNumber}
      />

      {/* Product QR Dialog */}
      {activeProductQr && (
        <Dialog open={!!activeProductQr} onOpenChange={(open) => !open && setActiveProductQr(null)}>
          <DialogContent className="max-w-sm bg-card border-border text-center p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">{activeProductQr.name}</DialogTitle>
              <p className="text-xs text-primary font-bold">₦{activeProductQr.price.toLocaleString()}</p>
            </DialogHeader>
            <div className="my-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-border shadow-inner">
              <QRCodeSVG
                value={getStorefrontUrl(storeSlug, `?product=${activeProductQr.id}`)}
                size={180}
                level="M"
                includeMargin={true}
              />
              <p className="text-[10px] text-slate-500 font-mono mt-2">Scan to view item in catalog</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs font-bold gap-1.5"
                onClick={() => {
                  navigator.clipboard.writeText(getStorefrontUrl(storeSlug, `?product=${activeProductQr.id}`));
                  toast.success("Product QR link copied!");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </Button>
              <Button
                className="flex-1 text-xs font-bold gap-1.5"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" /> Print QR
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
