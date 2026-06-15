import { useState, useMemo, useRef } from "react";

import { RotateCcw, Package, AlertCircle, Calendar, Filter, Upload, ImageIcon, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Refund, RefundReason } from "@/types/finance";
import { REFUND_REASONS } from "@/types/finance";
import { uploadImage } from "@/lib/storage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SaleTransaction, SaleLineItem } from "@/types/inventory";

const NAIRA = "₦";

export default ReturnsPage;

import { useSales } from "@/hooks/useSalesData";
import { useRefunds, useRefundsMutations } from "@/hooks/useRefundsData";

function ReturnsPage() {
  const { data: refunds, isLoading } = useRefunds();
  const { data: sales } = useSales();
  const [formOpen, setFormOpen] = useState(false);
  const [filterReason, setFilterReason] = useState<string>("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filtered = filterReason === "all" ? refunds : refunds.filter((r) => r.reason === filterReason);
  const totalRefunded = filtered.reduce((s, r) => s + r.amountNgn, 0);

  if (isLoading) {
    return <div className="p-12 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Returns & Refunds</h1>
          <p className="text-sm text-muted-foreground">Process refunds, damaged goods, and returns</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <RotateCcw className="h-4 w-4" /> New Refund
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Refunds</p>
          <p className="text-xl font-bold font-mono">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Refunded</p>
          <p className="text-xl font-bold font-mono text-destructive">{NAIRA}{totalRefunded.toLocaleString("en-NG")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">This Week</p>
          <p className="text-xl font-bold font-mono">
            {filtered.filter((r) => {
              const d = new Date(r.createdAt);
              const now = new Date();
              return now.getTime() - d.getTime() < 7 * 86400000;
            }).length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterReason} onValueChange={setFilterReason}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {REFUND_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Refund list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <RotateCcw className="h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">No refunds recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                {/* Proof image thumbnail or fallback icon */}
                {r.proofImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(r.proofImageUrl!)}
                    className="relative h-10 w-10 rounded-lg overflow-hidden border border-border shrink-0 group cursor-pointer"
                  >
                    <img src={r.proofImageUrl} alt="Return proof" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive shrink-0">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.itemName}</p>
                  <p className="text-xs text-muted-foreground">Qty: {r.quantity} · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono text-destructive">-{NAIRA}{r.amountNgn.toLocaleString("en-NG")}</p>
                  <Badge variant="outline" className="text-[10px]">{REFUND_REASONS.find((rr) => rr.value === r.reason)?.label ?? r.reason}</Badge>
                </div>
              </div>
              {/* Return description shown below the main row */}
              {r.returnDescription && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Return Description</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{r.returnDescription}</p>
                </div>
              )}

              {/* Additional Refund Details */}
              <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-y-1 gap-x-4 sm:grid-cols-4 text-[11px] text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground/75">Sale ID: </span>
                  <span className="font-mono">{r.saleId.slice(0, 8)}...</span>
                </div>
                {r.recordedByName && (
                  <div>
                    <span className="font-semibold text-foreground/75">Processed By: </span>
                    <span>{r.recordedByName}</span>
                  </div>
                )}
                {r.selectedUnit && (
                  <div>
                    <span className="font-semibold text-foreground/75">Unit: </span>
                    <span>{r.selectedUnit}{r.conversionFactor && r.conversionFactor !== 1 ? ` (x${r.conversionFactor})` : ""}</span>
                  </div>
                )}
                {r.notes && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="font-semibold text-foreground/75">Notes: </span>
                    <span>{r.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RefundFormSheet open={formOpen} onOpenChange={setFormOpen} sales={sales} />

      {/* Proof Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg p-2 rounded-2xl">
          {previewImage && (
            <img src={previewImage} alt="Return proof" className="w-full h-auto rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RefundFormSheet({ open, onOpenChange, sales }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sales: SaleTransaction[];
}) {
  const { addRefund } = useRefundsMutations();
  const [saleId, setSaleId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<RefundReason>("customer_return");
  const [notes, setNotes] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSale = sales.find((s) => s.id === saleId);
  const selectedItem = selectedSale?.items.find((i: SaleLineItem) => i.itemId === itemId);

  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearProof = () => {
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedSale || !selectedItem) return;
    if (!returnDescription.trim()) {
      toast.error("Please describe why the product is being returned");
      return;
    }

    try {
      let proofImageUrl: string | undefined;

      // Upload proof image if provided
      if (proofFile) {
        setIsUploading(true);
        try {
          const result = await uploadImage(proofFile, "refunds", `return_proof_${Date.now()}`);
          proofImageUrl = result.url;
        } catch (uploadErr) {
          toast.error("Failed to upload proof image, but refund will still be processed");
          console.error("Proof upload error:", uploadErr);
        }
        setIsUploading(false);
      }

      await addRefund({
        saleId,
        itemId: selectedItem.itemId,
        itemName: selectedItem.itemName,
        quantity: qty,
        amountNgn: selectedItem.unitPriceNgn * qty,
        reason,
        notes,
        returnDescription: returnDescription.trim(),
        proofImageUrl,
        selectedUnit: selectedItem.selectedUnit,
        conversionFactor: selectedItem.conversionFactor,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Refund processed: ${NAIRA}${(selectedItem.unitPriceNgn * qty).toLocaleString("en-NG")}`);
      onOpenChange(false);
      setSaleId("");
      setItemId("");
      setQty(1);
      setNotes("");
      setReturnDescription("");
      clearProof();
    } catch (err) {
      toast.error("Failed to process refund");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Process Refund</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Select Sale</Label>
            <Select value={saleId} onValueChange={(v) => { setSaleId(v); setItemId(""); }}>
              <SelectTrigger><SelectValue placeholder="Pick a sale..." /></SelectTrigger>
              <SelectContent>
                {sales.slice(0, 20).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {new Date(s.createdAt).toLocaleDateString()} — {s.items.length} items
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSale && (
            <div className="space-y-1.5">
              <Label className="text-xs">Select Item</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger><SelectValue placeholder="Pick item..." /></SelectTrigger>
                <SelectContent>
                  {selectedSale.items.map((i: SaleLineItem) => (
                    <SelectItem key={i.itemId} value={i.itemId}>{i.itemName} (×{i.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input type="number" min={1} max={selectedItem?.quantity ?? 1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as RefundReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Return Description — required */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Why is this product being returned? <span className="text-destructive">*</span></Label>
            <Textarea
              value={returnDescription}
              onChange={(e) => setReturnDescription(e.target.value)}
              placeholder="Describe the reason for return (e.g. Customer received wrong size, product was damaged in packaging, item arrived with scratches...)"
              rows={3}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">This description will be saved as the official return reason on record.</p>
          </div>

          {/* Proof Image Upload */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Proof of Return (Photo)</Label>
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-4">
              {proofPreview ? (
                <div className="relative">
                  <img src={proofPreview} alt="Proof preview" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={clearProof}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer py-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Tap to upload proof image</p>
                  <p className="text-[10px] text-muted-foreground/70">JPG, PNG up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProofSelect}
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Upload a photo showing the damaged/returned product as evidence.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Additional Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra details..." rows={2} />
          </div>

          {selectedItem && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Refund Amount</p>
              <p className="text-lg font-bold font-mono text-destructive">
                {NAIRA}{(selectedItem.unitPriceNgn * qty).toLocaleString("en-NG")}
              </p>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!selectedItem || isUploading} className="w-full gap-2">
            {isUploading ? (
              <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Uploading Proof...</>
            ) : (
              <><RotateCcw className="h-4 w-4" /> Process Refund</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
