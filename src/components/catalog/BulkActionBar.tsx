import { X, Printer, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, Supplier, Location } from "@/types/inventory";
import { ItemStatus } from "@/types/inventory";

interface BulkActionBarProps {
  selectedCount: number;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  onUpdateCategory: (categoryId: string) => void;
  onUpdateSupplier: (supplierId: string) => void;
  onUpdateLocation: (locationId: string) => void;
  onUpdateStatus: (status: ItemStatus) => void;
  onDeselectAll: () => void;
  onPrintLabels?: () => void;
  onExportQRCodes?: () => void;
  b2bEnabled?: boolean;
  onPublishToB2B?: () => void;
}

const STATUS_OPTIONS = [
  { value: ItemStatus.Active, label: "Active" },
  { value: ItemStatus.Discontinued, label: "Discontinued" },
  { value: ItemStatus.Archived, label: "Archived" },
];

export function BulkActionBar({
  selectedCount,
  categories,
  suppliers,
  locations,
  onUpdateCategory,
  onUpdateSupplier,
  onUpdateLocation,
  onUpdateStatus,
  onDeselectAll,
  onPrintLabels,
  onExportQRCodes,
  b2bEnabled,
  onPublishToB2B,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const handleB2BClick = () => {
    if (!b2bEnabled) {
      toast.error("B2B Marketplace Sync Required", {
        description: "Publishing excess stock to the global trade marketplace requires an Enterprise plan and the B2B Sync feature enabled in settings."
      });
    } else {
      onPublishToB2B?.();
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-lg animate-in slide-in-from-bottom duration-300 sm:px-6"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className="shrink-0 text-sm font-medium text-foreground">
        {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {/* Category */}
        <Select onValueChange={onUpdateCategory}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Supplier */}
        <Select onValueChange={onUpdateSupplier}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location */}
        <Select onValueChange={onUpdateLocation}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select onValueChange={(v) => onUpdateStatus(v as ItemStatus)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onPrintLabels && (
          <Button variant="outline" size="sm" onClick={onPrintLabels} className="h-8 gap-1 text-xs">
            <Printer className="h-3 w-3" />
            Print Labels
          </Button>
        )}

        {onExportQRCodes && (
          <Button variant="outline" size="sm" onClick={onExportQRCodes} className="h-8 gap-1 text-xs">
            <QrCode className="h-3 w-3" />
            Export QRs
          </Button>
        )}

        {onPublishToB2B && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleB2BClick}
            className="h-8 gap-1.5 text-xs border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/5 font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            Publish to B2B
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onDeselectAll} className="h-8 gap-1 text-xs">
          <X className="h-3 w-3" />
          Deselect All
        </Button>
      </div>
    </div>
  );
}
