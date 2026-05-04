import { Link } from "@tanstack/react-router";
import { useMovements, useItems } from "@/hooks/useInventoryData";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { ActivityItem } from "./ActivityItem";
import { format } from "date-fns";
import { User, ShoppingBag, LogIn } from "lucide-react";

export function RecentActivity() {
  const { data: movements } = useMovements(10);
  const { logs } = useActivityLogs(10);
  const { data: items } = useItems();

  const itemMap = new Map(items.map((i) => [i.id, i.name]));

  return (
    <div className="h-full rounded-[2rem] border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight">System Feed</h2>
        <Link to="/app/movements" search={{ item: undefined }} className="text-xs font-black uppercase tracking-widest text-primary hover:opacity-70">
          View all
        </Link>
      </div>

      <div className="max-h-[440px] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4 group">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
              {log.type === "login" ? <LogIn className="h-4 w-4 text-muted-foreground group-hover:text-primary" /> : <ShoppingBag className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground leading-none">{log.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{log.message}</p>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase">
                {log.createdAt ? format(log.createdAt.toDate(), "HH:mm") : "Just now"} • {log.userEmail}
              </p>
            </div>
          </div>
        ))}
        
        {movements.map((m) => (
          <ActivityItem key={m.id} movement={m} itemName={itemMap.get(m.itemId)} />
        ))}

        {movements.length === 0 && logs.length === 0 && (
          <p className="py-12 text-center text-sm font-medium text-muted-foreground">No recent activity detected</p>
        )}
      </div>
    </div>
  );
}
