import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PackageCheck, FileText, ShoppingCart, QrCode } from "lucide-react";
import type { PurchaseOrder, Item } from "@/types/inventory";
import { cn, extractItemIdentifier } from "@/lib/utils";
import { QRScannerDialog } from "../shared/QRScannerDialog";
import { toast } from "sonner";

interface ReceiveShipmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
  items: Item[];
  onConfirm: (receivedLines: { lineItemId: string; itemId: string; qty: number }[], notes: string) => void;
}

export function ReceiveShipmentSheet({
  open,
  onOpenChange,
  purchaseOrder,
  items,
  onConfirm,
}: ReceiveShipmentSheetProps) {
  const initialQtys = useMemo(
    () =>
      Object.fromEntries(
        purchaseOrder.items.map((li) => [
          li.id,
          Math.max(0, li.quantityOrdered - li.quantityReceived),
        ]),
      ),
    [purchaseOrder.items],
  );

  const [notes, setNotes] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>(initialQtys);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Reset when sheet opens with new PO
  const [lastPOId, setLastPOId] = useState(purchaseOrder.id);
  if (purchaseOrder.id !== lastPOId) {
    setLastPOId(purchaseOrder.id);
    setQtys(initialQtys);
    setNotes("");
  }

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const hasAnyQty = useMemo(
    () => Object.values(qtys).some((q) => q > 0),
    [qtys],
  );

  function handleQtyChange(lineId: string, remaining: number, value: string) {
    const num = Math.max(0, Math.min(remaining, Math.floor(Number(value) || 0)));
    setQtys((prev) => ({ ...prev, [lineId]: num }));
  }

  function handleConfirm() {
    const lines = purchaseOrder.items
      .filter((li) => (qtys[li.id] ?? 0) > 0)
      .map((li) => ({ lineItemId: li.id, itemId: li.itemId, qty: qtys[li.id] }));
    onConfirm(lines, notes);
  }

  function handleQRScan(code: string) {
    const cleanCode = extractItemIdentifier(code).toLowerCase();
    const lineItem = purchaseOrder.items.find(li => {
      const item = itemMap.get(li.itemId);
      return item?.id.toLowerCase() === cleanCode || item?.sku.toLowerCase() === cleanCode || item?.barcode?.toLowerCase() === cleanCode;
    });

    if (lineItem) {
      const remaining = Math.max(0, lineItem.quantityOrdered - lineItem.quantityReceived);
      if (remaining > 0) {
        setQtys(prev => ({ ...prev, [lineItem.id]: (prev[lineItem.id] || 0) + 1 }));
        toast.success(`Incremented ${itemMap.get(lineItem.itemId)?.name}`);
      } else {
        toast.error("Item already fully received");
      }
    } else {
      toast.error(`Item not found in this order: ${cleanCode}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none flex flex-col">
        <div className="nexa-card bg-card p-6 flex flex-col overflow-hidden max-h-full flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PackageCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Receive Shipment</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order Ref: {purchaseOrder.orderNumber}</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
              onClick={() => setIsScannerOpen(true)}
            >
              <QrCode className="h-4 w-4" />
              Scan Item
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            <div className="rounded-2xl border-2 border-border overflow-hidden bg-muted/5">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b-2">
                    <TableHead className="text-[10px] font-black uppercase">Product</TableHead>
                    <TableHead className="w-[80px] text-right text-[10px] font-black uppercase">Rem</TableHead>
                    <TableHead className="w-[100px] text-right text-[10px] font-black uppercase">Receiving</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.items.map((li) => {
                    const item = itemMap.get(li.itemId);
                    const remaining = Math.max(0, li.quantityOrdered - li.quantityReceived);
                    return (
                      <TableRow key={li.id} className="border-b hover:bg-muted/10 transition-colors">
                        <TableCell>
                          <p className="text-sm font-black text-foreground">{item?.name ?? li.itemId}</p>
                          <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{item?.sku ?? "—"}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-muted-foreground">
                          {remaining}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            value={qtys[li.id] ?? 0}
                            onChange={(e) => handleQtyChange(li.id, remaining, e.target.value)}
                            className="h-10 w-24 rounded-lg border-2 font-mono font-black text-right ml-auto bg-card"
                            disabled={remaining === 0}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-1.5 px-1">
              <Label htmlFor="receive-notes" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Shipment Notes</Label>
              <Textarea
                id="receive-notes"
                placeholder="Discrepancies, damage reports, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-xl border-2 font-bold resize-none"
              />
            </div>

            <div className="pt-4">
              <Button
                className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                disabled={!hasAnyQty}
                onClick={handleConfirm}
              >
                Log Received Quantities
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full mt-2 font-bold text-muted-foreground">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      <QRScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleQRScan}
      />
    </Dialog>
  );
}
