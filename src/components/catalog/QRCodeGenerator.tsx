import { useState } from "react";
import { Download, Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Item } from "@/types/inventory";

interface QRCodeGeneratorProps {
  item: Item;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// Simple QR code SVG generator for product ID
export function generateQRCodeSVG(text: string): string {
  // Use a simple QR API service URL
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
}

export function getQRCodeText(itemId: string): string {
  return `${window.location.origin}/scan/${itemId}`;
}

export function QRCodeGenerator({ item, open, onOpenChange }: QRCodeGeneratorProps) {
  const [downloading, setDownloading] = useState(false);

  const qrCodeText = getQRCodeText(item.id);
  const qrCodeUrl = generateQRCodeSVG(qrCodeText);

  const handleDownload = async () => {
    setDownloading(true);
    const toastId = toast.loading("Preparing QR code...");
    
    try {
      const response = await fetch(qrCodeUrl);
      if (!response.ok) throw new Error("Failed to fetch QR code");
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${item.sku || "product"}.png`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success("QR code downloaded!", { id: toastId });
      setDownloading(false);
    } catch (error) {
      console.error("QR Download Error:", error);
      toast.error("Failed to download QR code", { id: toastId });
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrCodeText);
    toast.success("QR code link copied!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code for {item.name}
          </DialogTitle>
          <DialogDescription>
            SKU: {item.sku}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center">
            <Card className="border-2">
              <CardContent className="p-4">
                <img
                  src={qrCodeUrl}
                  alt={`QR code for ${item.name}`}
                  className="h-80 w-80"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-xs text-muted-foreground font-mono break-all">
              {qrCodeText}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Downloading..." : "Download"}
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
