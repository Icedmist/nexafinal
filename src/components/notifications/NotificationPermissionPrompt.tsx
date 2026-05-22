import { Bell, Monitor, ShieldCheck, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeviceNotifications } from "@/hooks/useDeviceNotifications";
import { toast } from "sonner";

interface NotificationPermissionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPermissionPrompt({
  open,
  onOpenChange,
}: NotificationPermissionPromptProps) {
  const { requestPermission } = useDeviceNotifications();

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result === "granted") {
      toast.success("Device notifications enabled!");
      onOpenChange(false);
    } else if (result === "denied") {
      toast.error("Permission denied. Please enable notifications in your browser settings.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <div className="nexa-card bg-card p-8 flex flex-col gap-6 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col items-center text-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-pulse">
                <Bell className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-background border-4 border-card flex items-center justify-center shadow-xl">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-[2rem] border-2 border-primary/20 animate-ping [animation-duration:3s]" />
            </div>

            <div className="space-y-3">
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                Never Miss a Beat
              </DialogTitle>
              <DialogDescription className="text-sm font-bold text-muted-foreground leading-relaxed px-6 uppercase tracking-tight">
                Get real-time updates for low stock, sales, and urgent store alerts directly on your device.
              </DialogDescription>
            </div>

            <div className="grid grid-cols-1 w-full gap-4 mt-2 px-4">
              <div className="flex items-center gap-4 p-4 rounded-3xl bg-primary/[0.03] border-2 border-primary/10 text-left transition-colors hover:bg-primary/[0.06]">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Secure Architecture</p>
                  <p className="text-[10px] font-bold text-muted-foreground leading-tight mt-0.5">End-to-end encrypted system alerts only.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 pb-4">
            <Button 
              onClick={handleEnable} 
              className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-xl shadow-primary/30 nexa-button-shine"
            >
              Authorize Notifications
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all"
            >
              Dismiss for now
            </Button>
          </div>

          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
