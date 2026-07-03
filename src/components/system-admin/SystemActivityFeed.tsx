import { useState, useEffect } from "react";
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
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Live Activity</h3>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <Skeleton className="h-8 w-8 rounded-lg bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4 bg-slate-800" />
                  <div className="flex justify-between mt-2">
                    <Skeleton className="h-2 w-20 bg-slate-800" />
                    <Skeleton className="h-2 w-12 bg-slate-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-800 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No Recent Events</span>
          </div>
        ) : (
          logs.map((log) => {
            const Icon = getIcon(log.type);
            const color = getColor(log.type);
            return (
              <div key={log.id} className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition-all hover:bg-slate-900 group">
                <div className={cn(
                  "mt-0.5 rounded-lg p-2 ring-1",
                  color === 'blue' && "bg-blue-500/10 text-blue-500 ring-blue-500/20",
                  color === 'emerald' && "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
                  color === 'rose' && "bg-rose-500/10 text-rose-500 ring-rose-500/20",
                  color === 'amber' && "bg-amber-500/10 text-amber-500 ring-amber-500/20",
                  color === 'indigo' && "bg-indigo-500/10 text-indigo-500 ring-indigo-500/20",
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-2">{log.message}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-medium text-slate-500 italic">{log.userEmail || "System"}</span>
                    <span className="text-[10px] font-medium text-slate-600">{getTimeAgo(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <button className="mt-2 w-full rounded-xl border border-slate-800 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-900 hover:text-slate-300">
        View Full Audit Trail
      </button>
    </div>
  );
}
