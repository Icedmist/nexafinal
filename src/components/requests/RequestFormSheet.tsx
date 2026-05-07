import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, X, ClipboardList, Trash2 } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateRequest } from "@/hooks/useInventoryMutations";
import { RequestStatus } from "@/types/inventory";
import type { Item } from "@/types/inventory";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";


interface LineRow {
  id: string;
  itemId: string;
  quantity: number;
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  reason: z.string().min(1, "Reason is required"),
  priority: z.enum(["normal", "urgent"]),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1, "Select an item"),
        quantity: z.number().min(1, "Qty must be at least 1"),
      }),
    )
    .min(1, "Add at least one line item"),
});

interface RequestFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
}

export function RequestFormSheet({ open, onOpenChange, items }: RequestFormSheetProps) {
  const { user, claims } = useAuth();
  const { storeId } = useBusiness();

  const createRequest = useCreateRequest();
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [lines, setLines] = useState<LineRow[]>([
    { id: crypto.randomUUID(), itemId: "", quantity: 1 },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function resetForm() {
    setTitle("");
    setReason("");
    setPriority("normal");
    setLines([{ id: crypto.randomUUID(), itemId: "", quantity: 1 }]);
    setErrors({});
  }

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), itemId: "", quantity: 1 }]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function updateLine(id: string, field: "itemId" | "quantity", value: string | number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (field === "itemId") return { ...l, itemId: value as string };
        const item = itemMap.get(l.itemId);
        const max = item ? item.currentStock : 9999;
        const qty = Math.max(1, Math.min(Number(value), max));
        return { ...l, quantity: qty };
      }),
    );
  }

  function handleSubmit() {
    const result = schema.safeParse({
      title,
      reason,
      priority,
      lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        fieldErrors[key] = issue.message;
      }
      if (result.error.issues.some((i) => i.path[0] === "lines" && i.path.length === 1)) {
        fieldErrors["lines"] = "Add at least one line item";
      }
      setErrors(fieldErrors);
      return;
    }

    const now = new Date().toISOString();
    const reqNum = `REQ-${Date.now().toString(36).toUpperCase()}`;

    createRequest.mutate(
      {
        requestNumber: reqNum,
        title,
        status: RequestStatus.Pending,
        priority,
        items: lines.map((l, i) => ({
          id: `ri-${Date.now()}-${i + 1}`,
          requestId: "temp",
          itemId: l.itemId,
          quantity: l.quantity,
          notes: "",
        })),
        requestedBy: user?.email || user?.uid || "staff",
        approvedBy: null,
        storeId: storeId || "",
        branchId: claims?.branchId || null,
        reason,
        createdAt: now,
        updatedAt: now,
      },

      {
        onSuccess: () => {
          toast.success("Request submitted");
          resetForm();
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message || "Failed to submit request."),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">New Request</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inventory Procurement</span>
                </div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Title */}
            <div className="space-y-1.5 px-1">
              <Label htmlFor="req-title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Request Title *</Label>
              <Input
                id="req-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly stock replenishment"
                className="h-11 rounded-xl border-2 font-bold"
              />
              {errors["title"] && (
                <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors["title"]}</p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5 px-1">
              <Label htmlFor="req-reason" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason / Justification *</Label>
              <Textarea
                id="req-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly explain why these items are needed..."
                rows={2}
                className="rounded-xl border-2 font-bold resize-none"
              />
              {errors["reason"] && (
                <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors["reason"]}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1.5 px-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Urgency Level</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "normal" | "urgent")}>
                <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="normal" className="font-bold">Normal Priority</SelectItem>
                  <SelectItem value="urgent" className="font-bold text-destructive">Urgent / Immediate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Line items */}
            <div className="space-y-4 px-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Requested Items *</Label>
                {errors["lines"] && (
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">{errors["lines"]}</p>
                )}
              </div>
              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const selectedItem = itemMap.get(line.itemId);
                  const maxQty = selectedItem ? selectedItem.currentStock : 9999;
                  return (
                    <div key={line.id} className="flex items-start gap-2 p-3 rounded-2xl border-2 border-border/50 bg-muted/5">
                      <div className="flex-1 space-y-1.5">
                        <Select
                          value={line.itemId || undefined}
                          onValueChange={(v) => updateLine(line.id, "itemId", v)}
                        >
                          <SelectTrigger className="h-10 rounded-lg border-2 font-bold">
                            <SelectValue placeholder="Select an item..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {items
                              .filter((i) => i.currentStock > 0)
                              .map((i) => (
                                <SelectItem key={i.id} value={i.id} className="font-medium">
                                  {i.name} <span className="ml-2 font-mono text-[10px] opacity-60">({i.currentStock} in stock)</span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {errors[`lines.${idx}.itemId`] && (
                          <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors[`lines.${idx}.itemId`]}</p>
                        )}
                      </div>
                      <div className="w-24 space-y-1.5">
                        <Input
                          type="number"
                          min={1}
                          max={maxQty}
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, "quantity", Number(e.target.value))}
                          className="h-10 rounded-lg border-2 font-mono font-bold text-center"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <Button type="button" variant="outline" onClick={addLine} className="w-full h-11 rounded-xl border-2 border-dashed font-bold hover:bg-primary/5 hover:border-primary/50 transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Item
              </Button>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <Button onClick={handleSubmit} className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20" disabled={createRequest.isLoading}>
                {createRequest.isLoading ? "Submitting..." : "Submit Procurement Request"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full mt-2 font-bold text-muted-foreground">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
