import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  QrCode, 
  Sparkles, 
  Store, 
  MapPin, 
  Landmark,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStorefrontUrl } from "@/lib/utils";
import { toast } from "sonner";

interface InStoreQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  storeSlug: string;
  logoUrl?: string;
  bankName?: string;
  accountNumber?: string;
}

export function InStoreQrModal({
  isOpen,
  onClose,
  storeName,
  storeSlug,
  logoUrl,
  bankName,
  accountNumber,
}: InStoreQrModalProps) {
  const [locationType, setLocationType] = useState<"table" | "counter" | "aisle" | "general">("table");
  const [locationNumber, setLocationNumber] = useState("Table 01");
  const [copied, setCopied] = useState(false);

  // Construct query params
  const queryParamKey = 
    locationType === "table" ? "table" : 
    locationType === "aisle" ? "aisle" : 
    locationType === "counter" ? "section" : "";

  const cleanLocationVal = locationNumber.trim() || "Table 01";
  
  const qrSourceId = `qr_instore_${storeSlug}_${locationType}_${cleanLocationVal.toLowerCase().replace(/\s+/g, "")}`;

  let targetPath = "";
  if (queryParamKey) {
    targetPath = `?${queryParamKey}=${encodeURIComponent(cleanLocationVal)}&qrSourceId=${encodeURIComponent(qrSourceId)}`;
  } else {
    targetPath = `?qrSourceId=${encodeURIComponent(qrSourceId)}`;
  }

  const fullQrUrl = getStorefrontUrl(storeSlug, targetPath);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullQrUrl);
    setCopied(true);
    toast.success("In-store QR catalog link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden rounded-3xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">In-Store Standee & Table QR Code</DialogTitle>
                <p className="text-xs text-muted-foreground">Print or display QR codes for table ordering and instant catalog browsing.</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start max-h-[80vh] overflow-y-auto">
          {/* Controls */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Placement Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={locationType === "table" ? "default" : "outline"}
                  onClick={() => {
                    setLocationType("table");
                    setLocationNumber("Table 01");
                  }}
                  className="h-10 text-xs font-bold gap-1.5 justify-start px-3"
                >
                  <MapPin className="h-3.5 w-3.5" /> Dining Table
                </Button>
                <Button
                  type="button"
                  variant={locationType === "counter" ? "default" : "outline"}
                  onClick={() => {
                    setLocationType("counter");
                    setLocationNumber("Checkout Counter");
                  }}
                  className="h-10 text-xs font-bold gap-1.5 justify-start px-3"
                >
                  <Store className="h-3.5 w-3.5" /> Checkout Counter
                </Button>
                <Button
                  type="button"
                  variant={locationType === "aisle" ? "default" : "outline"}
                  onClick={() => {
                    setLocationType("aisle");
                    setLocationNumber("Aisle 01");
                  }}
                  className="h-10 text-xs font-bold gap-1.5 justify-start px-3"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Aisle / Shelf
                </Button>
                <Button
                  type="button"
                  variant={locationType === "general" ? "default" : "outline"}
                  onClick={() => {
                    setLocationType("general");
                    setLocationNumber("Storefront Poster");
                  }}
                  className="h-10 text-xs font-bold gap-1.5 justify-start px-3"
                >
                  <QrCode className="h-3.5 w-3.5" /> Storefront Poster
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Location Label / Number
              </Label>
              <Input
                value={locationNumber}
                onChange={(e) => setLocationNumber(e.target.value)}
                placeholder="e.g. Table 05, Bar Stand A, Aisle 2"
                className="h-11 rounded-xl bg-background"
              />
              <p className="text-[10px] text-muted-foreground">
                When customers scan this QR, their order is automatically tagged with this location.
              </p>
            </div>

            {/* Quick Links & Actions */}
            <div className="pt-2 space-y-2 border-t border-border">
              <Button
                variant="outline"
                className="w-full justify-between h-11 text-xs font-bold rounded-xl"
                onClick={handleCopyLink}
              >
                <span className="truncate max-w-[220px] text-muted-foreground font-mono">{fullQrUrl}</span>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-primary" />}
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={handlePrint}
                  className="flex-1 h-11 text-xs font-bold gap-2 rounded-xl"
                >
                  <Printer className="h-4 w-4" /> Print Standee
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-11 text-xs font-bold gap-1.5 rounded-xl border-primary/30 text-primary"
                >
                  <a href={fullQrUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Test Link
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Printable Standee Preview */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl relative print:fixed print:inset-0 print:bg-white print:text-black print:z-[999999]">
            <div className="w-full max-w-[260px] flex flex-col items-center text-center space-y-4">
              {/* Header Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-bold text-[10px] uppercase tracking-widest">
                <Sparkles className="h-3 w-3" /> SCAN & ORDER
              </div>

              {/* Logo / Store Name */}
              <div className="space-y-1">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="h-10 w-auto mx-auto object-contain bg-white/10 p-1 rounded-lg"
                  />
                ) : (
                  <h3 className="font-extrabold text-lg text-white tracking-tight">{storeName}</h3>
                )}
                <p className="text-[11px] text-slate-400 font-medium">Digital Catalog & Self-Checkout</p>
              </div>

              {/* Location Badge */}
              <div className="bg-primary text-white font-extrabold px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-primary/30">
                📍 {cleanLocationVal}
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl shadow-xl border-2 border-slate-700/50 inline-block">
                <QRCodeSVG
                  value={fullQrUrl}
                  size={160}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">Point Camera to View Menu</p>
                <p className="text-[10px] text-slate-400">Instant Order & Direct Bank Transfer Supported</p>
              </div>

              {/* Payment Info Badge */}
              <div className="pt-2 border-t border-slate-800/80 w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <Landmark className="h-3 w-3 text-teal-400" />
                <span>Pay to: {bankName || "Moniepoint MFB"} {accountNumber ? `(${accountNumber})` : ""}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
