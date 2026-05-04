import { useState, useMemo } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RequestStatus, MovementType } from "@/types/inventory";
import { useUpdateRequest, useCreateMovement, useUpdateItem } from "@/hooks/useInventoryMutations";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import type { InventoryRequest, Item, StockMovement } from "@/types/inventory";

type DialogType = "approve" | "partial" | "decline" | null;

function checkStock(
  reqItems: InventoryRequest["items"],
  itemMap: Map<string, Item>,
  qtys?: Record<string, number>,
): string | null {
  for (const li of reqItems) {
    const qty = qtys ? (qtys[li.id] ?? 0) : li.quantity;
    if (qty === 0) continue;
    const item = itemMap.get(li.itemId);
    if (!item) continue;
    if (qty > item.currentStock) {
      return `Insufficient stock for ${item.name} (available: ${item.currentStock}, requested: ${qty})`;
    }
  }
  return null;
}

function buildMovements(
  request: InventoryRequest,
  qtys?: Record<string, number>,
): StockMovement[] {
  const now = new Date().toISOString();
  return request.items
    .filter((li) => {
      const q = qtys ? (qtys[li.id] ?? 0) : li.quantity;
      return q > 0;
    })
    .map((li) => ({
      id: crypto.randomUUID(),
      itemId: li.itemId,
      type: MovementType.Shipped,
      quantity: qtys ? (qtys[li.id] ?? li.quantity) : li.quantity,
      fromLocationId: null,
      toLocationId: null,
      reference: request.requestNumber,
      notes: `Auto-generated from request ${request.requestNumber}`,
      performedBy: "demo-admin",
      createdAt: now,
    }));
}


export function useApprovalActions({ items }: { items: Item[] }) {
  const { user } = useAuth();
  const updateRequest = useUpdateRequest();
  const createMovement = useCreateMovement();
  const updateItem = useUpdateItem();

  const [dialog, setDialog] = useState<DialogType>(null);
  const [activeRequest, setActiveRequest] = useState<InventoryRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [partialQtys, setPartialQtys] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function openApprove(req: InventoryRequest) {
    setActiveRequest(req);
    setDialog("approve");
  }

  function openDecline(req: InventoryRequest) {
    setActiveRequest(req);
    setDeclineReason("");
    setDialog("decline");
  }

  function openPartial(req: InventoryRequest) {
    setActiveRequest(req);
    const initial: Record<string, number> = {};
    for (const li of req.items) {
      initial[li.id] = li.quantity;
    }
    setPartialQtys(initial);
    setDialog("partial");
  }

  async function confirmApprove() {
    if (!activeRequest || !user) return;
    const err = checkStock(activeRequest.items, itemMap);
    if (err) { toast.error(err); return; }

    const now = new Date().toISOString();
    const movements = buildMovements(activeRequest);
    setIsLoading(true);
    try {
      for (const m of movements) {
        await createMovement.mutate(m);
        // Deduct stock
        const item = itemMap.get(m.itemId);
        if (item) {
          await updateItem.mutate({ id: item.id, updates: { currentStock: item.currentStock - m.quantity } });
        }
      }
      await updateRequest.mutate({
        id: activeRequest.id,
        updates: {
          status: RequestStatus.Approved,
          approvedBy: user.email ?? user.uid,
          updatedAt: now,
        }
      });
      toast.success(`${activeRequest.requestNumber} approved`);
      setDialog(null);
      setActiveRequest(null);
    } catch (err) {
      toast.error("Failed to approve request");
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmDecline() {
    if (!activeRequest || !declineReason.trim() || !user) return;
    const now = new Date().toISOString();
    setIsLoading(true);
    try {
      await updateRequest.mutate({
        id: activeRequest.id,
        updates: {
          status: RequestStatus.Declined,
          approvedBy: user.email ?? user.uid,
          declineReason: declineReason.trim(),
          updatedAt: now,
        }
      });
      toast.success(`${activeRequest.requestNumber} declined`);
      setDialog(null);
      setActiveRequest(null);
    } catch (err) {
      toast.error("Failed to decline request");
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmPartial() {
    if (!activeRequest || !user) return;
    const allZero = activeRequest.items.every((li) => (partialQtys[li.id] ?? 0) === 0);
    if (allZero) { toast.error("Approve at least one item quantity"); return; }

    const err = checkStock(activeRequest.items, itemMap, partialQtys);
    if (err) { toast.error(err); return; }

    const allFull = activeRequest.items.every((li) => (partialQtys[li.id] ?? 0) >= li.quantity);
    const newStatus = allFull ? RequestStatus.Approved : RequestStatus.PartiallyFulfilled;
    const now = new Date().toISOString();
    const movements = buildMovements(activeRequest, partialQtys);

    setIsLoading(true);
    try {
      for (const m of movements) {
        await createMovement.mutate(m);
        // Deduct stock
        const item = itemMap.get(m.itemId);
        if (item) {
          await updateItem.mutate({ id: item.id, updates: { currentStock: item.currentStock - m.quantity } });
        }
      }
      await updateRequest.mutate({
        id: activeRequest.id,
        updates: {
          status: newStatus,
          approvedBy: user.email ?? user.uid,
          updatedAt: now,
        }
      });
      toast.success(
        `${activeRequest.requestNumber} ${allFull ? "approved" : "partially fulfilled"}`,
      );
      setDialog(null);
      setActiveRequest(null);
    } catch (err) {
      toast.error("Failed to process partial fulfillment");
    } finally {
      setIsLoading(false);
    }
  }

  function renderDialogs() {
    return (
      <>
        {/* Approve confirm */}
        <AlertDialog open={dialog === "approve"} onOpenChange={(o) => !o && setDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve {activeRequest?.requestNumber}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will approve all requested quantities and create stock movements.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmApprove}>
                Confirm Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Decline dialog */}
        <AlertDialog open={dialog === "decline"} onOpenChange={(o) => !o && setDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline {activeRequest?.requestNumber}?</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for declining this request.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="decline-reason">Reason *</Label>
              <Textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Why is this request being declined?"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDecline}
                disabled={!declineReason.trim()}
              >
                Confirm Decline
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Partial fulfill dialog */}
        <AlertDialog open={dialog === "partial"} onOpenChange={(o) => !o && setDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Partial Fulfill {activeRequest?.requestNumber}</AlertDialogTitle>
              <AlertDialogDescription>
                Enter the approved quantity for each line item.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 py-2">
              {activeRequest?.items.map((li) => {
                const item = itemMap.get(li.itemId);
                return (
                  <div key={li.id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium">
                      {item?.name ?? li.itemId}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      of {li.quantity} (avail: {item?.currentStock ?? 0})
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={li.quantity}
                      value={partialQtys[li.id] ?? 0}
                      onChange={(e) =>
                        setPartialQtys((prev) => ({
                          ...prev,
                          [li.id]: Math.max(0, Math.min(li.quantity, Number(e.target.value))),
                        }))
                      }
                      className="w-20 font-mono"
                    />
                  </div>
                );
              })}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmPartial}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return { openApprove, openDecline, openPartial, renderDialogs, isLoading };
}
