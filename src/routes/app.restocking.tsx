import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { PurchaseOrdersTable } from "@/components/purchase-orders/PurchaseOrdersTable";
import { POSummaryStats } from "@/components/purchase-orders/POSummaryStats";
import { PurchaseOrdersFilters } from "@/components/purchase-orders/PurchaseOrdersFilters";
import { PurchaseOrderFormSheet } from "@/components/purchase-orders/PurchaseOrderFormSheet";
import { PurchaseOrderDetailSheet } from "@/components/purchase-orders/PurchaseOrderDetailSheet";
import { ReceiveShipmentSheet } from "@/components/purchase-orders/ReceiveShipmentSheet";
import { usePurchaseOrders, useSuppliers, useItems, useMovements } from "@/hooks/useInventoryData";
import { usePermissions } from "@/hooks/usePermissions";
import { useRole } from "@/hooks/useRole";
import {
  useDeletePurchaseOrder,
  useUpdatePurchaseOrder,
  useCreateMovement,
  useUpdateItem,
} from "@/hooks/useInventoryMutations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { OrderStatus, MovementType } from "@/types/inventory";
import type { PurchaseOrder } from "@/types/inventory";
import { isAdminRole } from "@/lib/roles";
import type { POFilters } from "@/components/purchase-orders/po-filter-types";
import { EMPTY_PO_FILTERS } from "@/components/purchase-orders/po-filter-types";

interface POSearch {
  po?: string;
}

export default RestockingPage;

function RestockingPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { po: poParam, action } = Object.fromEntries(searchParams.entries()) as any;
  const { data: purchaseOrders } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { data: catalogItems } = useItems();
  const { data: allMovements } = useMovements();
  const { can } = usePermissions();
  const { role } = useRole();
  const deletePO = useDeletePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const createMovement = useCreateMovement();
  const updateItem = useUpdateItem();
  const canManagePOs = can("create_po");
  const isAdmin = isAdminRole(role);
  const [filters, setFilters] = useState<POFilters>(EMPTY_PO_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editPO, setEditPO] = useState<PurchaseOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivePO, setReceivePO] = useState<PurchaseOrder | null>(null);

  // Open detail from URL param
  useEffect(() => {
    if (poParam && purchaseOrders.length > 0) {
      const match = purchaseOrders.find((p) => p.id === poParam);
      if (match) {
        setDetailPO(match);
        setDetailOpen(true);
      }
    }
  }, [poParam, purchaseOrders]);

  // Handle action=new from dashboard
  useEffect(() => {
    if (action === "new") {
      setEditPO(null);
      setFormOpen(true);
      // Clean up URL
      const params = new URLSearchParams(searchParams);
      params.delete("action");
      window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    }
  }, [action, searchParams]);

  const filtered = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (filters.statuses.length > 0 && !filters.statuses.includes(po.status)) return false;
      if (filters.supplierId && po.supplierId !== filters.supplierId) return false;
      if (filters.dateFrom && po.createdAt < new Date(filters.dateFrom).toISOString()) return false;
      if (filters.dateTo) {
        const toEnd = new Date(filters.dateTo);
        toEnd.setDate(toEnd.getDate() + 1);
        if (po.createdAt >= toEnd.toISOString()) return false;
      }
      return true;
    });
  }, [purchaseOrders, filters]);

  // Keep detailPO in sync with latest data
  const currentDetailPO = useMemo(() => {
    if (!detailPO) return null;
    return purchaseOrders.find((po) => po.id === detailPO.id) ?? detailPO;
  }, [purchaseOrders, detailPO]);

  function openCreate() {
    setEditPO(null);
    setFormOpen(true);
  }

  function handleRowClick(po: PurchaseOrder) {
    setDetailPO(po);
    setDetailOpen(true);
  }

  function handleEdit(po: PurchaseOrder) {
    setDetailOpen(false);
    setEditPO(po);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Restocking</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} records</p>
        </div>
        {canManagePOs && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Restock
          </Button>
        )}
      </div>

      <POSummaryStats purchaseOrders={filtered} />

      <PurchaseOrdersFilters filters={filters} onChange={setFilters} suppliers={suppliers} />

      <ErrorBoundary>
      {purchaseOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No restocking records created"
          description="Create restocking records to track inventory procurement from your suppliers."
          actionLabel={canManagePOs ? "New Restock" : undefined}
          onAction={canManagePOs ? openCreate : undefined}
        />
      ) : (
        <PurchaseOrdersTable
          purchaseOrders={filtered}
          suppliers={suppliers}
          onRowClick={handleRowClick}
        />
      )}
      </ErrorBoundary>

      <PurchaseOrderDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        purchaseOrder={currentDetailPO}
        suppliers={suppliers}
        items={catalogItems}
        movements={allMovements}
        canEdit={canManagePOs}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onDelete={(id) => {
          deletePO.mutate(id, {
            onSuccess: () => {
              setDetailOpen(false);
              setDetailPO(null);
              toast.success("Restocking record deleted");
            },
          });
        }}
        onReceive={(po) => {
          setReceivePO(po);
          setReceiveOpen(true);
        }}
      />

      {receivePO && (
        <ReceiveShipmentSheet
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          purchaseOrder={receivePO}
          items={catalogItems}
          onConfirm={(receivedLines, notes) => {
            const now = new Date().toISOString();
            const po = receivePO!;

            // 1. Create stock movements for each received line
            for (const line of receivedLines) {
              createMovement.mutate({
                itemId: line.itemId,
                type: MovementType.Received,
                quantity: line.qty,
                fromLocationId: null,
                toLocationId: null,
                reference: po.orderNumber,
                notes: notes || `Received via ${po.orderNumber}`,
                performedBy: user?.email || "System",
                createdAt: now,
              });

              // 2. Update item currentStock
              const item = catalogItems.find((i) => i.id === line.itemId);
              if (item) {
                updateItem.mutate({
                  id: item.id,
                  updates: { currentStock: item.currentStock + line.qty, updatedAt: now },
                });
              }
            }

            // 3. Update PO line items received quantities
            const updatedItems = po.items.map((li) => {
              const received = receivedLines.find((r) => r.lineItemId === li.id);
              if (received) {
                return { ...li, quantityReceived: li.quantityReceived + received.qty };
              }
              return li;
            });

            // 4. Determine new PO status
            const allFullyReceived = updatedItems.every(
              (li) => li.quantityReceived >= li.quantityOrdered,
            );
            const newStatus = allFullyReceived ? OrderStatus.Received : OrderStatus.Partial;

            updatePO.mutate({
              id: po.id,
              updates: { items: updatedItems, status: newStatus, updatedAt: now },
            });

            const totalQty = receivedLines.reduce((sum, l) => sum + l.qty, 0);
            toast.success(
              `Received ${totalQty} items across ${receivedLines.length} line items`,
            );
            setReceiveOpen(false);
          }}
        />
      )}

      <PurchaseOrderFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        purchaseOrder={editPO}
        suppliers={suppliers}
        items={catalogItems}
      />
    </div>
  );
}
