import { useState } from "react";
import { Settings2 } from "lucide-react";
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
          {PREF_LABELS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
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
