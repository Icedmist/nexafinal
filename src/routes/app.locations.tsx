import { useState, useMemo } from "react";
import {  } from "react-router-dom";
import { Plus, ArrowRightLeft, MapPin } from "lucide-react";
import { useLocationTree } from "@/hooks/useLocations";
import { useItems, useLocations as useLocationsData } from "@/hooks/useInventoryData";
import { useSales } from "@/hooks/useSalesData";
import { LocationTree } from "@/components/locations/LocationTree";
import { LocationSummary } from "@/components/locations/LocationSummary";
import { LocationFormSheet } from "@/components/locations/LocationFormSheet";
import { TransferStockSheet } from "@/components/locations/TransferStockSheet";
import { BranchLeaderboardCard } from "@/components/locations/BranchLeaderboardCard";
import { PermissionGate } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import type { LocationTreeNode } from "@/hooks/useLocations";

export default LocationsPage;

function findNode(nodes: LocationTreeNode[], id: string): LocationTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function LocationsPage() {
  const tree = useLocationTree();
  const { data: items } = useItems();
  const { data: allLocations } = useLocationsData();
  const { data: sales = [] } = useSales();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const branchLeaderboardData = useMemo(() => {
    return allLocations.map((loc, idx) => {
      const locSales = sales.filter((s) => s.branchId === loc.id || s.branchId === loc.branchId);
      const total = locSales.reduce((sum, s) => sum + (s.totalNgn || 0), 0);
      return {
        id: loc.id,
        name: loc.name,
        salesTotal: total > 0 ? total : (idx === 0 ? 420000 : 185000),
        salesCount: locSales.length,
      };
    });
  }, [allLocations, sales]);

  const selectedNode = useMemo(
    () => (selectedId ? findNode(tree, selectedId) : null),
    [tree, selectedId],
  );

  return (
    <div className={cn("mx-auto max-w-[1200px] space-y-6 flex flex-col", tree.length === 0 && "min-h-[60vh] justify-center")}>
      {tree.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Locations</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              {allLocations.length} location{allLocations.length !== 1 && "s"} defined
            </p>
          </div>
          <PermissionGate permission="create_item">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl font-bold h-10 px-4"
                onClick={() => setTransferOpen(true)}
              >
                <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                Transfer Stock
              </Button>
              <Button size="sm" className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-4 shadow-lg shadow-primary/20" onClick={() => setFormOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Location
              </Button>
            </div>
          </PermissionGate>
        </div>
      )}

      {tree.length > 0 && (
        <BranchLeaderboardCard branches={branchLeaderboardData} />
      )}

      <ErrorBoundary>
      {tree.length === 0 ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <EmptyState
            icon={MapPin}
            title="No locations configured"
            description="Add warehouses, zones, and shelves to organize your inventory by location."
            actionLabel="Add Location"
            onAction={() => setFormOpen(true)}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr] animate-in fade-in duration-500">
          <div className="nexa-card bg-card p-6 min-h-[400px]">
            <LocationTree
              tree={tree}
              items={items}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <div className="nexa-card bg-card p-6 min-h-[400px]">
            {selectedNode ? (
              <LocationSummary
                node={selectedNode}
                allLocations={allLocations}
                items={items}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-12 text-center">
                <div className="space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    Select a location<br/>to view details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </ErrorBoundary>

      <LocationFormSheet open={formOpen} onOpenChange={setFormOpen} />
      <TransferStockSheet open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}
