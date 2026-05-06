import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, ArrowRightLeft, ShoppingBag, User } from "lucide-react";
import type { HistoryEntry } from "@/hooks/useItemHistory";

const ICON_MAP: Record<string, { icon: any; cls: string }> = {
  received: { icon: ArrowDownToLine, cls: "text-stock-healthy bg-stock-healthy/10" },
  shipped: { icon: ArrowUpFromLine, cls: "text-stock-out bg-stock-out/10" },
  adjusted: { icon: RefreshCw, cls: "text-primary bg-primary/10" },
  transferred: { icon: ArrowRightLeft, cls: "text-muted-foreground bg-muted" },
  Sold: { icon: ShoppingBag, cls: "text-amber-accent bg-amber-accent/10" },
};

interface MovementTimelineProps {
  history: HistoryEntry[];
  itemId: string;
  maxEntries?: number;
}

import { useStoreBranches } from "@/hooks/useStaffData";

export function MovementTimeline({ history, itemId, maxEntries = 20 }: MovementTimelineProps) {
  const { data: branches } = useStoreBranches();
  
  const filtered = useMemo(() => {
    return history.slice(0, maxEntries);
  }, [history, maxEntries]);

  if (filtered.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No movement history for this item.</p>;
  }

  return (
    <div className="space-y-1">
      {filtered.map((m) => {
        const { icon: Icon, cls } = ICON_MAP[m.action] || { icon: RefreshCw, cls: "text-muted-foreground bg-muted" };
        const isPositive = m.quantity > 0;
        return (
          <div key={m.id} className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted/40">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium capitalize">{m.action}</span>
                <span className={`font-mono text-sm font-semibold ${isPositive ? "text-stock-healthy" : "text-stock-out"}`}>
                  {isPositive ? "+" : ""}{m.quantity}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{m.performedByName}</span>
                </div>
                {m.reference && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">{m.reference}</span>
                  </>
                )}
                {m.branchId && (
                  <>
                    <span>·</span>
                    <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                      {branches.find(b => b.id === m.branchId)?.name || "Branch"}
                    </span>
                  </>
                )}
              </div>
              {m.notes && <p className="mt-1 text-xs text-muted-foreground italic">"{m.notes}"</p>}
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}

      {/* View all link */}
      <div className="pt-3 text-center">
        <a
          href={`/app/movements?item=${itemId}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View all in movements →
        </a>
      </div>
    </div>
  );
}
