import { useState } from "react";
import { Settings2, Bell, Monitor } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDeviceNotifications } from "@/hooks/useDeviceNotifications";

export interface NotificationPrefs {
  low_stock: boolean;
  zero_stock: boolean;
  po_reminder: boolean;
  po_overdue: boolean;
  inventory_request: boolean;
  sale: boolean;
  movement: boolean;
}

const PREF_LABELS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "low_stock", label: "Low Stock Alerts", description: "When an item drops below its reorder point" },
  { key: "zero_stock", label: "Zero Stock Alerts", description: "When an item reaches zero stock" },
  { key: "po_reminder", label: "PO Reminders", description: "When a PO delivery date is within 3 days" },
  { key: "po_overdue", label: "PO Overdue", description: "When a PO passes its expected delivery date" },
  { key: "inventory_request", label: "Request Updates", description: "When an inventory request status changes" },
  { key: "sale", label: "Sales Alerts", description: "When a new sale is recorded" },
  { key: "movement", label: "Inventory Movements", description: "When stock is transferred or adjusted" },
];

interface NotificationPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferences({ open, onOpenChange }: NotificationPreferencesProps) {
  const { permission, requestPermission } = useDeviceNotifications();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    low_stock: true, 
    zero_stock: true, 
    po_reminder: true, 
    po_overdue: true, 
    inventory_request: true,
    sale: true,
    movement: true,
  });

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = () => {
    // TODO: Save to API
    toast.success("Notification preferences saved.");
    onOpenChange(false);
  };

  const handleDeviceToggle = async () => {
    if (permission === "granted") {
      toast.info("Browser notifications are already enabled. To disable them, please use your browser settings.");
    } else {
      const result = await requestPermission();
      if (result === "granted") {
        toast.success("Device notifications enabled!");
      } else if (result === "denied") {
        toast.error("Permission denied. Please enable notifications in your browser settings.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Notification Preferences
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="mb-4 rounded-xl bg-primary/5 p-4 border border-primary/10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="mt-1 rounded-full bg-primary/10 p-2 h-fit">
                  <Monitor className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <Label className="text-sm font-bold">Device Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive real-time alerts on your desktop or mobile device</p>
                </div>
              </div>
              <Switch
                id="device-notifications"
                checked={permission === "granted"}
                onCheckedChange={handleDeviceToggle}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-1 mb-2">
            <Bell className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">App Alerts</span>
          </div>

          {PREF_LABELS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors">
              <div className="min-w-0">
                <Label htmlFor={`pref-${key}`} className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={`pref-${key}`}
                checked={prefs[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} className="w-full mt-2">Save Preferences</Button>
      </DialogContent>
    </Dialog>
  );
}
