import { useEffect, useRef } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    
    const startScanner = async () => {
      if (!open || !videoRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        
        // Use native BarcodeDetector if available
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128'] });
          
          const scanFrame = async () => {
            if (!active || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                onScan(barcodes[0].rawValue);
                onOpenChange(false);
                return;
              }
              requestAnimationFrame(scanFrame);
            } catch (e) {
              console.error("Detection error:", e);
            }
          };
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            scanFrame();
          };
        } else {
          console.warn("BarcodeDetector not supported. Falling back to simple video feed (Scanning will not work without a library).");
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };

    startScanner();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Scan Product QR Code</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="relative overflow-hidden rounded-2xl border-4 border-primary/20 bg-muted shadow-inner aspect-square">
            <video 
              ref={videoRef} 
              className="h-full w-full object-cover"
              playsInline
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-2/3 h-2/3 border-2 border-primary rounded-xl opacity-50 border-dashed" />
            </div>
          </div>
          <p className="mt-4 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Align the QR code within the frame
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
