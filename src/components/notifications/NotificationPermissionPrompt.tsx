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
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-8 flex flex-col gap-6 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col items-center text-center gap-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse">
                <Bell className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-background border-4 border-card flex items-center justify-center shadow-lg">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                Stay in the Loop
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed px-4">
                Get real-time alerts for low stock, new sales, and urgent requests directly on your device, even when you're not looking at the app.
              </DialogDescription>
            </div>

            <div className="grid grid-cols-1 w-full gap-3 mt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50 text-left">
                <div className="h-8 w-8 rounded-xl bg-background flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Secure & Private</p>
                  <p className="text-[10px] font-medium text-muted-foreground">We only send essential store alerts.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleEnable} 
              className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-primary/20 nexa-button-shine"
            >
              Enable Notifications
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="w-full h-11 rounded-2xl font-bold text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Maybe Later
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
