import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, RefreshCw, X } from "lucide-react";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (decodedText: string) => void;
}

export function QRScannerDialog({ open, onOpenChange, onScan }: QRScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualInput, setManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startScanner = async () => {
    setError(null);
    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setHasPermission(true);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          initDetection();
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please enable it in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Failed to access camera. Ensure you are on a secure (HTTPS) connection.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const initDetection = () => {
    if (!('BarcodeDetector' in window)) {
      // Provide clearer guidance on unsupported platforms (iOS Safari notably lacks BarcodeDetector)
      setError("This browser doesn't support native barcode scanning. Use Chrome on Android or use the manual input option below on iPhone.");
      return;
    }

    // @ts-ignore
    const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'code_39'] });
    
    const scanFrame = async () => {
      if (!streamRef.current || !videoRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          onScan(barcodes[0].rawValue);
          onOpenChange(false);
          return;
        }
        requestAnimationFrame(scanFrame);
      } catch (e) {
        // Silently handle detection errors during transition
      }
    };
    
    scanFrame();
  };

  useEffect(() => {
    if (open) {
      // Auto-start only if we already have permission or if it's the first time
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Camera className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight uppercase">Scanner</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative aspect-square overflow-hidden rounded-3xl border-4 border-primary/20 bg-muted shadow-2xl">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-muted/80 backdrop-blur-sm">
                <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                  <CameraOff className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-foreground mb-4">{error}</p>
                <Button onClick={startScanner} variant="outline" className="gap-2 font-black uppercase text-[10px] tracking-widest border-2">
                  <RefreshCw className="h-3 w-3" /> Retry Permission
                </Button>
                <div className="mt-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-2">If your device doesn't support live scanning, you can paste the QR content manually.</p>
                  {!manualInput ? (
                    <Button variant="ghost" size="sm" onClick={() => setManualInput(true)} className="mt-2">Enter code manually</Button>
                  ) : (
                    <div className="flex flex-col items-center gap-2 mt-2 w-full">
                      <input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Paste QR code or text here"
                        className="w-full p-2 rounded-md border border-border bg-background text-sm"
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => {
                          if (manualCode.trim()) {
                            onScan(manualCode.trim());
                            onOpenChange(false);
                          }
                        }}>Submit</Button>
                        <Button variant="outline" onClick={() => { setManualInput(false); setManualCode(""); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  className="h-full w-full object-cover scale-[1.02]"
                  playsInline
                  muted
                />
                
                {/* Scanner Overlay UI */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 border-2 border-primary rounded-[2rem] shadow-[0_0_0_100vw_rgba(0,0,0,0.4)]">
                    {/* Animated Scanning Line */}
                    <div className="absolute top-0 left-4 right-4 h-1 bg-primary/60 blur-[2px] animate-[scan_2s_infinite_ease-in-out]" />
                    
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-2xl" />
                  </div>
                </div>

                {isStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Initializing Camera</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-muted/50 rounded-2xl p-4">
            <p className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed">
              {hasPermission === false 
                ? "Camera access is required to scan codes" 
                : "Point your camera at a barcode or QR code"}
            </p>
          </div>
          
          <style>{`
            @keyframes scan {
              0% { top: 10%; opacity: 0; }
              20% { opacity: 1; }
              80% { opacity: 1; }
              100% { top: 90%; opacity: 0; }
            }
          `}</style>
        </div>
      </DialogContent>
    </Dialog>
  );
}
