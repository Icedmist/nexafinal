import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Shield, UserPlus, Building, Zap, Info } from "lucide-react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLog {
  id: string;
  type: string;
  title: string;
  message: string;
  userEmail: string;
  timestamp: any;
  storeId?: string;
}

export function SystemActivityFeed() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "activity_logs"),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      setLogs(newLogs);
      setLoading(false);
    }, (error) => {
      console.error("Activity feed error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'platform_user_provisioned': return UserPlus;
      case 'login': return Zap;
      case 'security_alert': return Shield;
      case 'store_provisioned': return Building;
      default: return Info;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'platform_user_provisioned': return 'blue';
      case 'login': return 'amber';
      case 'security_alert': return 'rose';
      case 'store_provisioned': return 'emerald';
      default: return 'indigo';
    }
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Live Activity Feed
        </h3>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-mono">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Active
        </span>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
                <Skeleton className="h-8 w-8 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4 bg-muted" />
                  <div className="flex justify-between mt-2">
                    <Skeleton className="h-2 w-20 bg-muted" />
                    <Skeleton className="h-2 w-12 bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-border rounded-2xl">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">No Recent Events</span>
          </div>
        ) : (
          logs.map((log) => {
            const Icon = getIcon(log.type);
            const color = getColor(log.type);
            return (
              <div key={log.id} className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-3.5 transition-all hover:bg-muted/30 hover:border-primary/30 group shadow-sm">
                <div className={cn(
                  "mt-0.5 rounded-xl p-2 ring-1 shrink-0",
                  color === 'blue' && "bg-sky-500/10 text-sky-500 ring-sky-500/20",
                  color === 'emerald' && "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
                  color === 'rose' && "bg-rose-500/10 text-rose-500 ring-rose-500/20",
                  color === 'amber' && "bg-amber-500/10 text-amber-500 ring-amber-500/20",
                  color === 'indigo' && "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20",
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">{log.message}</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[140px]">{log.userEmail || "System"}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{getTimeAgo(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <button 
        onClick={() => navigate("/system-admin/audit")}
        className="mt-1 w-full rounded-xl border border-border py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
      >
        View Full Audit Trail
      </button>
    </div>
  );
}
