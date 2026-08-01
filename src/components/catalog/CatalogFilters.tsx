import { useState } from "react";
import { Filter, X, QrCode, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Category, Supplier, Location } from "@/types/inventory";
import type { ItemFilters } from "@/types/inventory";
import { QRScannerDialog } from "../shared/QRScannerDialog";
import { extractItemIdentifier } from "@/lib/utils";

interface CatalogFiltersProps {
  filters: ItemFilters;
  onChange: (f: ItemFilters) => void;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  view?: "list" | "grid";
  onViewChange?: (v: "list" | "grid") => void;
  needsReviewCount?: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "needs-review", label: "Needs Review" },
  { value: "archived", label: "Archived" },
];

export function CatalogFilters({ filters, onChange, categories, suppliers, locations, view = "list", onViewChange, needsReviewCount = 0 }: CatalogFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const activeCount = [filters.categoryId, filters.supplierId, filters.status, filters.locationId, filters.search].filter(Boolean).length;

  const update = (patch: Partial<ItemFilters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({});

  const filterControls = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div className="relative flex-1 sm:w-48">
          <input
            type="text"
            placeholder="Search name or SKU…"
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value || undefined })}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-primary/20 hover:bg-primary/5 text-primary"
          onClick={() => setIsScannerOpen(true)}
          title="Scan QR Code"
        >
          <QrCode className="h-4 w-4" />
        </Button>
        {onViewChange && (
          <div className="flex items-center border border-input rounded-md bg-background h-9 overflow-hidden">
            <button
              type="button"
              onClick={() => onViewChange("list")}
              className={`flex items-center justify-center h-full px-2 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewChange("grid")}
              className={`flex items-center justify-center h-full px-2 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <Select value={filters.categoryId ?? "all"} onValueChange={(v) => update({ categoryId: v === "all" ? undefined : v })}>
        <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.filter(c => c.id).map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.supplierId ?? "all"} onValueChange={(v) => update({ supplierId: v === "all" ? undefined : v })}>
        <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder="Supplier" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Suppliers</SelectItem>
          {suppliers.filter(s => s.id).map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status ?? "all"} onValueChange={(v) => update({ status: v === "all" ? undefined : (v as "in_stock" | "low_stock" | "out_of_stock" | "needs-review") })}>
        <SelectTrigger className="h-9 w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => {
            if (o.value === "needs-review") {
              return (
                <SelectItem key={o.value} value={o.value}>
                  <span className="flex items-center gap-2">
                    {o.label}
                    {needsReviewCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/15 px-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">{needsReviewCount}</span>
                    )}
                  </span>
                </SelectItem>
              );
            }
            return <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>;
          })}
        </SelectContent>
      </Select>

      <Select value={filters.locationId ?? "all"} onValueChange={(v) => update({ locationId: v === "all" ? undefined : v })}>
        <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder="Location" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.filter(l => l.id).map((l) => (
            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-muted-foreground">
          <X className="h-3 w-3" />Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block">{filterControls}</div>

      {/* Mobile */}
      <div className="sm:hidden">
        <Button variant="outline" size="sm" onClick={() => setMobileOpen(true)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{activeCount}</span>
          )}
        </Button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="bottom" className="max-h-[80vh]">
            <SheetTitle>Filters</SheetTitle>
            <div className="mt-4 space-y-3">
              {onViewChange && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">View:</span>
                  <div className="flex items-center border border-input rounded-md bg-background h-9 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onViewChange("list")}
                      className={`flex items-center gap-1.5 h-full px-3 text-xs font-medium transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <List className="h-3.5 w-3.5" /> List
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewChange("grid")}
                      className={`flex items-center gap-1.5 h-full px-3 text-xs font-medium transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Grid
                    </button>
                  </div>
                </div>
              )}
              {filterControls}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <QRScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={(code) => update({ search: extractItemIdentifier(code) })}
      />
    </>
  );
}
