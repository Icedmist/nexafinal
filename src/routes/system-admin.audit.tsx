import { useState, useEffect } from "react";
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar, 
  ShieldAlert, 
  UserPlus, 
  Building, 
  Zap, 
  Info,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where,
  startAfter,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/shared/skeletons";

interface ActivityLog {
  id: string;
  type: string;
  title: string;
  message: string;
  userEmail: string;
  userId: string;
  timestamp: any;
  storeId?: string;
}

export default function SystemAudit() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [typeFilter]);

  const fetchLogs = async (isMore = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, "activity_logs"),
        orderBy("timestamp", "desc"),
        limit(20)
      );

      if (typeFilter !== "all") {
        q = query(
          collection(db, "activity_logs"),
          where("type", "==", typeFilter),
          orderBy("timestamp", "desc"),
          limit(20)
        );
      }

      if (isMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];

      if (isMore) {
        setLogs(prev => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'platform_user_provisioned': return UserPlus;
      case 'login': return Zap;
      case 'security_alert': return ShieldAlert;
      case 'store_provisioned': return Building;
      default: return Info;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'platform_user_provisioned': return 'text-blue-500 bg-blue-500/10 ring-blue-500/20';
      case 'login': return 'text-amber-500 bg-amber-500/10 ring-amber-500/20';
      case 'security_alert': return 'text-rose-500 bg-rose-500/10 ring-rose-500/20';
      case 'store_provisioned': return 'text-emerald-500 bg-emerald-500/10 ring-emerald-500/20';
      default: return 'text-slate-400 bg-slate-400/10 ring-slate-400/20';
    }
  };

  const filteredLogs = logs.filter(log => 
    log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Audit Trail</h1>
          <p className="text-slate-400 font-medium">Immutable ledger of platform-wide administrative actions.</p>
        </div>
        
        <button 
          onClick={() => {
            const headers = ["Timestamp","Type","Actor","Message","Store ID"];
            const rows = filteredLogs.map(l => [
              l.timestamp?.toDate?.() ? new Date(l.timestamp.toDate()).toISOString() : l.timestamp || "",
              l.type || "",
              l.userEmail || "",
              l.message || "",
              l.storeId || ""
            ]);
            const csv = [headers,...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "audit-log.csv"; a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${filteredLogs.length} audit entries`);
          }}
          className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 px-5 py-3 text-xs font-black text-white uppercase tracking-widest transition-all hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          Export Audit Data
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-slate-950/50 p-4 rounded-3xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Search events, users, or messages..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select 
              className="bg-transparent text-xs font-bold text-white outline-none"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Events</option>
              <option value="login">Logins</option>
              <option value="platform_user_provisioned">User Provisioning</option>
              <option value="store_provisioned">Store Creation</option>
              <option value="security_alert">Security Alerts</option>
            </select>
          </div>
          
          <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all">
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* High Density Audit Table */}
      <div className="rounded-[2.5rem] border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Event Identity</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Actor</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Event Details</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Timestamp</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Accessing Audit Ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <Activity className="h-12 w-12 text-slate-800" />
                       <span className="text-sm font-bold text-slate-600">No matching audit events found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = getIcon(log.type);
                  const colorClass = getColor(log.type);
                  return (
                    <tr key={log.id} className="group hover:bg-slate-900/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1", colorClass)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-white uppercase tracking-wider">{log.type.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">ID: {log.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-200">{log.userEmail || "System"}</span>
                          <span className="text-[10px] text-slate-500 font-medium tracking-tight">UID: {log.userId?.slice(0, 12) || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1 max-w-md">
                          <span className="text-xs font-bold text-slate-300 leading-relaxed">{log.message}</span>
                          <span className="text-[10px] text-slate-500 font-medium uppercase italic">Store: {log.storeId || "Global"}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-400">
                            {log.timestamp?.seconds 
                              ? new Date(log.timestamp.seconds * 1000).toLocaleString() 
                              : "Recently"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-600 hover:text-blue-500 hover:border-blue-500/50 transition-all">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination / Load More */}
        <div className="bg-slate-900/30 p-6 flex items-center justify-center border-t border-slate-900">
          {hasMore ? (
            <button 
              onClick={() => fetchLogs(true)}
              className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            >
              Load More Audit History
            </button>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 italic">End of Audit Record</span>
          )}
        </div>
      </div>
    </div>
  );
}
