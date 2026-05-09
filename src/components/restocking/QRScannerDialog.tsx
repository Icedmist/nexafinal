import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (decodedText: string) => void;
}

export function QRScannerDialog({ open, onOpenChange, onScan }: QRScannerDialogProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (open) {
      // Small delay to ensure the container is rendered
      const timer = setTimeout(() => {
        if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
          );
          
          scannerRef.current.render(
            (decodedText) => {
              onScan(decodedText);
              onOpenChange(false);
            },
            (errorMessage) => {
              // Ignore scanning errors
            }
          );
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(error => {
            console.error("Failed to clear scanner", error);
          });
          scannerRef.current = null;
        }
      };
    }
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Scan Product QR Code</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div id="qr-reader" className="overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/50" style={{ width: '100%' }}></div>
          <p className="mt-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Align the QR code within the frame to scan
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
