import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Upload, QrCode, HelpCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CSVExportButton, type CSVColumn } from "@/components/data/CSVExportButton";
import { CSVImportSheet, type ImportField } from "@/components/data/CSVImportSheet";
import { CSVImportGuideModal } from "@/components/data/CSVImportGuideModal";
import { CSVProcessorStudio } from "@/components/data/CSVProcessorStudio";
import { QuickEntryModal } from "@/components/catalog/QuickEntryModal";
import { CatalogCompletenessMeter } from "@/components/catalog/CatalogCompletenessMeter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InStoreQRGeneratorModal } from "@/components/catalog/InStoreQRGeneratorModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CatalogTable, type SortState } from "@/components/catalog/CatalogTable";
import { CatalogGrid } from "@/components/catalog/CatalogGrid";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ItemFormSheet } from "@/components/catalog/ItemFormSheet";
import { BulkActionBar } from "@/components/catalog/BulkActionBar";
import { ItemDetailSheet } from "@/components/catalog/ItemDetailSheet";
import { RowActionsMenu } from "@/components/catalog/RowActionsMenu";
import { MovementFormSheet } from "@/components/movements/MovementFormSheet";
import { printBarcodeLabels } from "@/components/catalog/PrintBarcodeLabel";
import { useItems, useCategories, useSuppliers, useLocations } from "@/hooks/useInventoryData";
import { useCreateItem, useUpdateItem, useDeleteItem, useBatchCreateItems } from "@/hooks/useInventoryMutations";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useStoreBranches } from "@/hooks/useStaffData";
import { exportItemsQRCodes } from "@/lib/bulk-qr";
import { PermissionGate, usePermissions } from "@/hooks/usePermissions";
import { useRole } from "@/hooks/useRole";
import { useSector } from "@/hooks/useSector";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { Item } from "@/types/inventory";
import { ItemStatus, type ItemFilters } from "@/types/inventory";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface CatalogSearch {
  item?: string;
  newItem?: string;
}

export default CatalogPage;

function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { item: itemId, newItem, newBarcode } = Object.fromEntries(searchParams.entries()) as any;
  const navigate = useNavigate();

  // Auto-open create form when navigated with newItem param
  useEffect(() => {
    if (newItem === "true") {
      setEditItem(null);
      setSheetOpen(true);
    }
  }, [newItem]);

  // Hook into onboarding triggers (Scanner & CSV import auto-open)
  useEffect(() => {
    const triggerScanner = sessionStorage.getItem("nexa_open_scanner_after_onboarding");
    if (triggerScanner === "true") {
      sessionStorage.removeItem("nexa_open_scanner_after_onboarding");
      setIsQuickEntryOpen(true);
      toast.success("Welcome! Scan your packaged goods using the camera.");
    }

    const triggerImport = sessionStorage.getItem("nexa_open_import_after_onboarding");
    if (triggerImport === "true") {
      sessionStorage.removeItem("nexa_open_import_after_onboarding");
      setImportOpen(true);
      toast.success("Welcome! Choose your spreadsheet to match and import.");
    }
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setEditItem(null);
      if (searchParams.get("newItem") === "true") {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("newItem");
          next.delete("newBarcode");
          return next;
        }, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  const [filters, setFilters] = useState<ItemFilters>({});
  const [sort, setSort] = useState<SortState>({ key: "name", dir: "asc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [movementItemId, setMovementItemId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [isCsvStudioOpen, setIsCsvStudioOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isInStoreQRGeneratorOpen, setIsInStoreQRGeneratorOpen] = useState(false);
  const [view, setView] = useState<"list" | "grid">(() => {
    return (localStorage.getItem("nexa_catalog_view") as "list" | "grid") || "list";
  });

  const handleViewChange = (v: "list" | "grid") => {
    setView(v);
    localStorage.setItem("nexa_catalog_view", v);
  };

  const importFields = useMemo<ImportField[]>(() => [
    { key: "name", label: "Name", required: true },
    { key: "sku", label: "SKU" },
    { key: "description", label: "Description" },
    { key: "category", label: "Category" },
    { key: "supplier", label: "Supplier" },
    { key: "location", label: "Location" },
    { key: "quantity", label: "Quantity", numeric: true },
    { key: "reorderPoint", label: "Reorder Point", numeric: true },
    { key: "unit", label: "Unit" },
    { key: "costPrice", label: "Unit Cost", numeric: true },
    { key: "sellingPrice", label: "Retail Price", numeric: true },
    { key: "wholesalePrice", label: "Wholesale Price", numeric: true },
    { key: "barcode", label: "Barcode" },
  ], []);

  // Strip stock-level status before passing to store
  const storeFilters = useMemo(() => {
    const { status, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: allItems } = useItems(storeFilters);
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: locations } = useLocations();
  const { data: branches } = useStoreBranches();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const { batchCreate } = useBatchCreateItems();
  const { claims } = useAuth();
  const { can } = usePermissions();
  const { isAdmin } = useRole();
  const sector = useSector();
  const { flags } = useFeatureFlags();

  const filteredCategories = useMemo(() => {
    if (sector.type !== "pharmacy") {
      return categories.filter((c) => {
        const norm = (c.name || "").toLowerCase() + " " + (c.id || "").toLowerCase();
        return (
          !norm.includes("pharmacy") &&
          !norm.includes("medicine") &&
          !norm.includes("pharmaceutical") &&
          !norm.includes("prescription")
        );
      });
    }
    return categories;
  }, [categories, sector.type]);

  const handlePublishToB2B = () => {
    toast.success(`Successfully published ${selected.size} excess/wholesale items to global bulk B2B catalog!`, {
      description: "Interested merchant and retail buyers will contact you directly."
    });
    setSelected(new Set());
  };

  // Derive detail item from URL search param
  const detailItem = useMemo(() => {
    if (!itemId) return null;
    return allItems.find((i) => i.id === itemId) ?? null;
  }, [itemId, allItems]);

  const openDetail = useCallback((item: Item) => {
    navigate(`/app/catalog?item=${item.id}`);
  }, [navigate]);

  const closeDetail = useCallback(() => {
    navigate("/app/catalog");
  }, [navigate]);
  const items = useMemo(() => {
    let result = allItems;
    if (filters.status === "archived") {
      result = result.filter((i) => i.status === ItemStatus.Archived);
    } else {
      result = result.filter((i) => i.status !== ItemStatus.Archived);
      if (filters.status === "in_stock") result = result.filter((i) => i.currentStock > i.reorderPoint && !i.needsReview);
      else if (filters.status === "low_stock") result = result.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint && !i.needsReview);
      else if (filters.status === "out_of_stock") result = result.filter((i) => i.currentStock === 0 && !i.needsReview);
      else if (filters.status === "needs-review") result = result.filter((i) => i.needsReview === true);
    }
    return result;
  }, [allItems, filters.status]);

  const existingSkus = useMemo(() => allItems.map((i) => i.sku), [allItems]);

  const csvColumns = useMemo<CSVColumn<Item>[]>(() => [
    { header: "Name", accessor: (i) => i.name },
    { header: "SKU", accessor: (i) => i.sku },
    { header: "Category", accessor: (i) => categories.find((c) => c.id === i.categoryId)?.name ?? "" },
    { header: "Supplier", accessor: (i) => suppliers.find((s) => s.id === i.supplierId)?.name ?? "" },
    { header: "Location", accessor: (i) => locations.find((l) => l.id === i.locationId)?.name ?? "" },
    { header: "Branch", accessor: (i) => branches.find((b) => b.id === i.branchId)?.name ?? "All Branches" },
    { header: "Quantity", accessor: (i) => i.currentStock },
    { header: "Reorder Point", accessor: (i) => i.reorderPoint },
    { header: "Unit Cost", accessor: (i) => i.costPrice },
    { header: "Price", accessor: (i) => i.sellingPrice },
    { header: "Status", accessor: (i) => i.status },
  ], [categories, suppliers, locations, branches]);
  const handleSave = useCallback((data: Partial<Item>) => {
    if (editItem) {
      updateItem.mutate({ id: editItem.id, updates: { ...data, needsReview: false } }, {
        onSuccess: () => { toast.success(editItem.needsReview ? "Item updated & reviewed!" : "Item updated"); setSheetOpen(false); setEditItem(null); },
        onError: (e) => toast.error(e.message || "Failed to update item. Please try again."),
      });
    } else {
      const newItem: Item = {
        id: `item-${Date.now()}`,
        sku: data.sku ?? "",
        barcode: data.barcode ?? null,
        name: data.name ?? "",
        description: data.description ?? "",
        categoryId: data.categoryId ?? null,
        status: data.status ?? ItemStatus.Active,
        unit: data.unit ?? "each",
        currentStock: data.currentStock ?? 0,
        reorderPoint: data.reorderPoint ?? 0,
        reorderQuantity: data.reorderQuantity ?? 0,
        costPrice: data.costPrice ?? 0,
        sellingPrice: data.sellingPrice ?? 0,
        locationId: data.locationId ?? null,
        branchId: data.branchId ?? null,
        supplierId: data.supplierId ?? null,
        imageUrl: data.imageUrl || null,
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Pass through variant and menu item config
        ...(data.variantAttributes && { variantAttributes: data.variantAttributes }),
        ...(data.variants && { variants: data.variants }),
        ...(data.menuItemConfig && { menuItemConfig: data.menuItemConfig }),
        ...(data.pricingTiers && { pricingTiers: data.pricingTiers }),
        ...(data.pharmacy && { pharmacy: data.pharmacy }),
        ...(data.units && { units: data.units }),
      };
      createItem.mutate(newItem, {
        onSuccess: () => {
          toast.success("Item created", {
            action: { label: "Undo", onClick: () => { deleteItem.mutate(newItem.id, { onSuccess: () => toast.success("Item creation undone") }); } },
            duration: 5000,
          });
          setSheetOpen(false);
        },
        onError: (e) => toast.error(e.message || "Failed to create item. Please try again."),
      });
    }
  }, [editItem, createItem, updateItem, deleteItem]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    if (isAdmin) {
      deleteItem.mutate(deleteTarget.id, {
        onSuccess: () => { toast.success(`${deleteTarget.name} deleted`); setDeleteTarget(null); },
        onError: (e) => toast.error(e.message || "Failed to delete item."),
      });
    } else {
      updateItem.mutate({ id: deleteTarget.id, updates: { status: ItemStatus.Archived } }, {
        onSuccess: () => { toast.success(`${deleteTarget.name} archived`); setDeleteTarget(null); },
        onError: (e) => toast.error(e.message || "Failed to archive item."),
      });
    }
  }, [deleteTarget, isAdmin, deleteItem, updateItem]);

  const handleRestore = useCallback(() => {
    if (!deleteTarget) return;
    updateItem.mutate({ id: deleteTarget.id, updates: { status: ItemStatus.Active } }, {
      onSuccess: () => { toast.success(`${deleteTarget.name} restored`); setDeleteTarget(null); },
      onError: (e) => toast.error(e.message || "Failed to restore item."),
    });
  }, [deleteTarget, updateItem]);

  const openEdit = (item: Item) => { setEditItem(item); setSheetOpen(true); };
  const openCreate = () => { setEditItem(null); setSheetOpen(true); };

  const handleBulkUpdate = useCallback((updates: Partial<Item>) => {
    const ids = Array.from(selected);
    const count = ids.length;
    ids.forEach((id) => {
      updateItem.mutate({ id, updates });
    });
    toast.success(`Updated ${count} items`);
    setSelected(new Set());
  }, [selected, updateItem]);

  const actionRenderer = (item: Item) => (
    <RowActionsMenu
      item={item}
      onViewDetails={(i) => openDetail(i)}
      onEdit={(i) => openEdit(i)}
      onLogMovement={(i) => setMovementItemId(i.id)}
      onRestore={(i) => setDeleteTarget(i)}
      onDelete={(i) => setDeleteTarget(i)}
    />
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{sector.t("catalog")}</h1>
          <p className="text-sm text-muted-foreground">{items.length} {sector.t("item").toLowerCase()}s</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CSVExportButton
            data={items}
            columns={csvColumns}
            filename="nexa-items"
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="flex gap-1 items-center h-8 sm:h-9 text-[10px] sm:text-xs border-primary/20 hover:border-primary/50" 
            onClick={() => exportItemsQRCodes(items)}
          >
            <QrCode className="h-3.5 w-3.5" />Export QRs
          </Button>
          <PermissionGate permission="create_item">
            <Button variant="outline" size="sm" className="flex gap-1 items-center h-8 sm:h-9 text-[10px] sm:text-xs" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" />Import
            </Button>
          </PermissionGate>
          <PermissionGate permission="create_item">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCsvStudioOpen(true)}
              className="hidden gap-1.5 sm:inline-flex border-purple-500/30 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold h-8 sm:h-9 text-[10px] sm:text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />CSV & AI Studio
            </Button>
          </PermissionGate>
          <PermissionGate permission="create_item">
            <Button variant="outline" size="sm"
              className="hidden gap-1.5 sm:inline-flex border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold h-8 sm:h-9 text-[10px] sm:text-xs"
              onClick={() => setGuideOpen(true)}>
              <HelpCircle className="h-3.5 w-3.5" />CSV & AI Guide
            </Button>
          </PermissionGate>
          <PermissionGate permission="create_item">
            <Button variant="outline"
              onClick={() => setIsInStoreQRGeneratorOpen(true)}
              className="hidden gap-1.5 sm:inline-flex border-blue-200 hover:border-blue-400 bg-blue-500/5 hover:bg-blue-500/10 text-blue-700 font-semibold h-8 sm:h-9 text-[10px] sm:text-xs">
              <QrCode className="h-3.5 w-3.5" />In-Store QR
            </Button>
          </PermissionGate>
          <PermissionGate permission="create_item">
            <Button variant="outline"
              onClick={() => setIsQuickEntryOpen(true)}
              className="hidden gap-1.5 sm:inline-flex border-amber-200 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 font-semibold h-8 sm:h-9 text-[10px] sm:text-xs">
              <QrCode className="h-3.5 w-3.5" />Quick Entry
            </Button>
          </PermissionGate>
          <PermissionGate permission="create_item">
            <Button onClick={openCreate} className="flex gap-1 items-center h-8 sm:h-9 text-[10px] sm:text-xs">
              <Plus className="h-3.5 w-3.5" />{sector.primaryAction || "New Item"}
            </Button>
          </PermissionGate>
        </div>
      </div>

      <CatalogCompletenessMeter items={allItems.map(i => ({ ...i, imageUrl: i.imageUrl || undefined }))} onQuickActionClick={openCreate} />

      <Card className="p-4">
        <CatalogFilters filters={filters} onChange={setFilters} categories={filteredCategories} suppliers={suppliers} locations={locations} view={view} onViewChange={handleViewChange} needsReviewCount={allItems.filter((i) => i.needsReview).length} />
      </Card>

      <ErrorBoundary>
      {allItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items in your inventory yet"
          description="Start building your catalog by adding your first product or item."
          actionLabel={can("create_item") ? "Add First Item" : undefined}
          onAction={can("create_item") ? openCreate : undefined}
        />
      ) : view === "list" ? (
        <CatalogTable
          items={items}
          categories={filteredCategories}
          suppliers={suppliers}
          locations={locations}
          sort={sort}
          onSortChange={setSort}
          selected={selected}
          onSelectedChange={setSelected}
          onRowClick={(item) => openDetail(item)}
          actionRenderer={actionRenderer}
          showCheckboxes={can("edit_item")}
        />
      ) : (
        <CatalogGrid
          items={items}
          categories={filteredCategories}
          onRowClick={(item) => openDetail(item)}
          actionRenderer={actionRenderer}
          selected={selected}
          onSelectedChange={setSelected}
          showCheckboxes={can("edit_item")}
        />
      )}
      </ErrorBoundary>

      <ItemFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        item={editItem}
        defaultBarcode={newBarcode}
        categories={filteredCategories}
        suppliers={suppliers}
        locations={locations}
        branches={branches}
        existingSkus={existingSkus}
        onSave={handleSave}
        loading={createItem.isLoading || updateItem.isLoading}
      />

      <ItemDetailSheet
        open={!!detailItem}
        onOpenChange={(v) => { if (!v) closeDetail(); }}
        item={detailItem}
        categories={filteredCategories}
        suppliers={suppliers}
        locations={locations}
        onEdit={(item) => { closeDetail(); openEdit(item); }}
        onArchive={(item) => { closeDetail(); setDeleteTarget(item); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.status === ItemStatus.Archived
                ? `Restore ${deleteTarget?.name}?`
                : `${isAdmin ? "Delete" : "Archive"} ${deleteTarget?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.status === ItemStatus.Archived
                ? "The item will be restored and visible in the active catalog."
                : isAdmin
                ? "This action cannot be undone. The product will be permanently removed."
                : "The item will be archived and hidden from the default view."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTarget?.status === ItemStatus.Archived ? handleRestore : handleDelete}>
              {deleteTarget?.status === ItemStatus.Archived ? "Restore" : isAdmin ? "Delete" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PermissionGate permission="create_item">
        <button
          type="button"
          onClick={openCreate}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-accent shadow-lg transition-transform hover:scale-105 sm:hidden"
          aria-label="New Item"
        >
          <Plus className="h-6 w-6" />
        </button>
      </PermissionGate>

      <PermissionGate permission="edit_item">
        <BulkActionBar
          selectedCount={selected.size}
          categories={filteredCategories}
          suppliers={suppliers}
          locations={locations}
          onUpdateCategory={(id) => handleBulkUpdate({ categoryId: id })}
          onUpdateSupplier={(id) => handleBulkUpdate({ supplierId: id })}
          onUpdateLocation={(id) => handleBulkUpdate({ locationId: id })}
          onUpdateStatus={(s) => handleBulkUpdate({ status: s })}
          onDeselectAll={() => setSelected(new Set())}
          onPrintLabels={() => {
            const selectedItems = allItems.filter((i) => selected.has(i.id));
            const locMap = new Map(locations.map((l) => [l.id, l.name]));
            printBarcodeLabels(selectedItems, locMap);
          }}
          onExportQRCodes={() => {
            const selectedItems = allItems.filter((i) => selected.has(i.id));
            exportItemsQRCodes(selectedItems);
          }}
          b2bEnabled={flags.planId === "enterprise"}
          onPublishToB2B={handlePublishToB2B}
        />
      </PermissionGate>

      <MovementFormSheet
        open={!!movementItemId}
        onOpenChange={(v) => { if (!v) setMovementItemId(null); }}
        items={allItems}
        locations={locations}
        preSelectedItemId={movementItemId}
      />

      <CSVImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        fields={importFields}
        entityName="items"
        existingSkus={existingSkus}
        knownCategories={categories.map((c) => c.name)}
        knownSuppliers={suppliers.map((s) => s.name)}
        onImport={async (rows) => {
          // Build item objects — one per valid row
          const items = rows.map((row, idx) => {
            const retailPrice = Number(row.sellingPrice) || 0;
            const wholesalePrice = row.wholesalePrice ? Number(row.wholesalePrice) : undefined;

            return {
              id: crypto.randomUUID(),
              sku: row.sku?.trim() || `PROD-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
              barcode: row.barcode ?? null,
              name: row.name ?? "",
              description: row.description ?? "",
              categoryId:
                categories.find((c) => c.name.toLowerCase() === row.category?.toLowerCase())?.id ?? null,
              status: ItemStatus.Active,
              unit: row.unit || "each",
              currentStock: Number(row.quantity) || 0,
              reorderPoint: Number(row.reorderPoint) || 0,
              reorderQuantity: 0,
              costPrice: Number(row.costPrice) || 0,
              sellingPrice: retailPrice,
              wholesalePrice: wholesalePrice ?? null,
              pricingTiers: {
                retail: retailPrice,
                ...(wholesalePrice !== undefined && {
                  wholesale: wholesalePrice,
                  distributor: wholesalePrice,
                }),
                tierEnabled: wholesalePrice !== undefined,
              },
              locationId:
                locations.find((l) => l.name.toLowerCase() === row.location?.toLowerCase())?.id ?? null,
              supplierId:
                suppliers.find((s) => s.name.toLowerCase() === row.supplier?.toLowerCase())?.id ?? null,
              branchId: claims?.branchId ?? null,
              imageUrl: null,
              customFields: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any;
          });

          try {
            const { created, failed, error } = await batchCreate(items);
            if (failed > 0) {
              toast.warning(`Imported ${created} items — ${failed} failed to save.${error ? `\n${error}` : ""}`);
            } else {
              toast.success(`Successfully imported ${created} item${created !== 1 ? "s" : ""}.`);
            }
            return { created, failed, error };
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            toast.error(`Import failed: ${msg}`);
            return { created: 0, failed: items.length, error: msg };
          }
        }}
      />

      <QuickEntryModal open={isQuickEntryOpen} onOpenChange={setIsQuickEntryOpen} />
      <InStoreQRGeneratorModal open={isInStoreQRGeneratorOpen} onOpenChange={setIsInStoreQRGeneratorOpen} />
      <CSVImportGuideModal open={guideOpen} onOpenChange={setGuideOpen} />

      <Dialog open={isCsvStudioOpen} onOpenChange={setIsCsvStudioOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] w-[95vw] sm:w-[90vw] overflow-y-auto p-4 sm:p-6 mx-auto">
          <CSVProcessorStudio onClose={() => setIsCsvStudioOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
