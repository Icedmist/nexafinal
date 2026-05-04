import { useMemo } from "react";
import { format } from "date-fns";
import { X, ClipboardList, Calendar, User, FileText, AlertCircle, Clock, CheckCircle2, History, Ban, ArrowRightCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusStepper } from "@/components/requests/StatusStepper";
import { RequestStatus } from "@/types/inventory";
import type { InventoryRequest, Item } from "@/types/inventory";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<RequestStatus, string> = {
  [RequestStatus.Pending]: "Pending",
  [RequestStatus.Approved]: "Approved",
  [RequestStatus.PartiallyFulfilled]: "Partial",
  [RequestStatus.Fulfilled]: "Fulfilled",
  [RequestStatus.Declined]: "Declined",
  [RequestStatus.Cancelled]: "Cancelled",
};

const STATUS_CLASS: Record<RequestStatus, string> = {
  [RequestStatus.Pending]: "bg-primary/15 text-primary border-primary/20",
  [RequestStatus.Approved]: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  [RequestStatus.PartiallyFulfilled]: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  [RequestStatus.Fulfilled]: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  [RequestStatus.Declined]: "bg-destructive/15 text-destructive border-destructive/20",
  [RequestStatus.Cancelled]: "bg-muted text-muted-foreground",
};

interface RequestDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: InventoryRequest | null;
  items: Item[];
  canApprove: boolean;
  onApprove?: (req: InventoryRequest) => void;
  onDecline?: (req: InventoryRequest) => void;
  onPartial?: (req: InventoryRequest) => void;
  onCancel?: (req: InventoryRequest) => void;
}

export function RequestDetailSheet({
  open,
  onOpenChange,
  request,
  items,
  canApprove,
  onApprove,
  onDecline,
  onPartial,
  onCancel,
}: RequestDetailSheetProps) {
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  if (!request) return null;

  const isPending = request.status === RequestStatus.Pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">{request.requestNumber}</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className={cn("rounded-full font-black uppercase text-[9px] tracking-widest border-2", STATUS_CLASS[request.status])}>
                    {STATUS_LABEL[request.status]}
                  </Badge>
                  {request.priority === "urgent" && (
                    <Badge variant="outline" className="rounded-full font-black uppercase text-[9px] tracking-widest border-2 bg-destructive/10 text-destructive border-destructive/20">
                      Urgent
                    </Badge>
                  )}
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Stock Request</span>
                </div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-8 pr-1">
            {/* Progress Stepper */}
            <div className="rounded-2xl border-2 border-border/50 bg-muted/5 p-4">
               <StatusStepper status={request.status} />
            </div>

            {/* Meta Row */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <DetailField label="Submitted By" icon={<User className="h-3 w-3" />}>
                <span className="font-bold text-foreground">{request.requestedBy}</span>
              </DetailField>

              <DetailField label="Submission Date" icon={<Calendar className="h-3 w-3" />}>
                <span className="font-mono font-bold text-foreground">
                  {format(new Date(request.createdAt), "MMM d, yyyy")}
                </span>
              </DetailField>

              <DetailField label="Request Title" icon={<FileText className="h-3 w-3" />} full>
                <span className="font-black text-foreground">{request.title}</span>
              </DetailField>

              <DetailField label="Justification" icon={<AlertCircle className="h-3 w-3" />} full>
                <p className="text-sm font-medium italic text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">{request.reason}</p>
              </DetailField>
            </div>

            {/* Decline Reason */}
            {request.declineReason && (
              <div className="rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="h-4 w-4 text-destructive" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-destructive">Decline Reason</span>
                </div>
                <p className="text-sm font-bold text-destructive italic">{request.declineReason}</p>
              </div>
            )}

            {/* Line Items */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Requested Items ({request.items.length})</h3>
              <div className="rounded-2xl border-2 border-border overflow-hidden bg-muted/5">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b-2">
                      <TableHead className="text-[10px] font-black uppercase">Product</TableHead>
                      <TableHead className="w-[100px] text-right text-[10px] font-black uppercase">Requested Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {request.items.map((li) => {
                      const item = itemMap.get(li.itemId);
                      return (
                        <TableRow key={li.id} className="border-b hover:bg-muted/10 transition-colors">
                          <TableCell>
                            <p className="text-sm font-black text-foreground">{item?.name ?? li.itemId}</p>
                            <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{item?.sku ?? "—"}</p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-black text-primary">
                            {li.quantity}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                 <History className="h-4 w-4 text-muted-foreground" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Audit Timeline</h3>
              </div>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                <TimelineEntry label="Submitted" date={request.createdAt} by={request.requestedBy} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
                {request.status !== RequestStatus.Pending &&
                  request.status !== RequestStatus.Cancelled && (
                    <TimelineEntry
                      label={STATUS_LABEL[request.status]}
                      date={request.updatedAt}
                      by={request.approvedBy ?? undefined}
                      icon={<ArrowRightCircle className="h-4 w-4 text-primary" />}
                    />
                  )}
                {request.status === RequestStatus.Cancelled && (
                  <TimelineEntry label="Cancelled" date={request.updatedAt} by={request.requestedBy} icon={<Ban className="h-4 w-4 text-muted-foreground" />} />
                )}
              </div>
            </div>

            {/* Approval actions (admin/manager) */}
            {isPending && canApprove && (
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  {onApprove && (
                    <Button onClick={() => onApprove(request)} className="flex-1 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
                      Approve Request
                    </Button>
                  )}
                  {onPartial && (
                    <Button variant="outline" onClick={() => onPartial(request)} className="flex-1 h-12 rounded-xl font-bold border-2">
                      Partial Fulfill
                    </Button>
                  )}
                </div>
                {onDecline && (
                  <Button variant="ghost" onClick={() => onDecline(request)} className="w-full h-11 rounded-xl font-bold text-destructive hover:bg-destructive/5">
                    Decline Request
                  </Button>
                )}
              </div>
            )}

            {/* Cancel button (requestor's own pending request) */}
            {isPending && !canApprove && onCancel && (
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest border-2 text-destructive hover:bg-destructive/5"
                  onClick={() => onCancel(request)}
                >
                  Cancel My Request
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimelineEntry({ label, date, by, icon }: { label: string; date: string; by?: string; icon: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -left-[22px] top-0.5 h-4 w-4 rounded-full bg-background flex items-center justify-center ring-4 ring-background">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-black text-foreground">{label}</span>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
           <span>{format(new Date(date), "MMM d, yyyy")}</span>
           {by && (
             <>
               <span>•</span>
               <span>By {by}</span>
             </>
           )}
        </div>
      </div>
    </div>
  );
}

function DetailField({
  icon,
  label,
  children,
  full,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", full ? "sm:col-span-2" : "")}>
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
        {icon}
        {label}
      </div>
      <div className="text-sm px-1 truncate">{children}</div>
    </div>
  );
}
