import { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Search,
  ExternalLink,
  Zap,
  Shield
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { collection, query, getDocs, limit, orderBy } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { ProvisionStoreDialog } from "@/components/system-admin/ProvisionStoreDialog";
import { SystemActivityFeed } from "@/components/system-admin/SystemActivityFeed";
import { PlatformSalesMonitor } from "@/components/system-admin/PlatformSalesMonitor";
import { cn } from "@/lib/utils";

const data = [
  { name: "Jan", stores: 40, active: 2400 },
  { name: "Feb", stores: 55, active: 3100 },
  { name: "Mar", stores: 80, active: 4200 },
  { name: "Apr", stores: 120, active: 5500 },
  { name: "May", stores: 160, active: 6800 },
  { name: "Jun", stores: 220, active: 8000 },
];

export default function SystemDashboard() {
  const [stats, setStats] = useState({
    totalStores: 0,
    totalUsers: 0,
    totalStaff: 0,
    systemHealth: 100,
  });
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [recentStores, setRecentStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisionOpen, setProvisionOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch platform stats from Cloud Function
      const getStats = httpsCallable(functions, 'getplatformstats');
      const statsResult = await getStats();
      const platformData = statsResult.data as any;

      // 2. Fetch recent stores
      const recentSnap = await getDocs(query(
        collection(db, "stores"), 
        orderBy("createdAt", "desc"), 
        limit(5)
      ));

      setStats({
        totalStores: platformData.totalStores || 0,
        totalUsers: platformData.totalUsers || 0,
        totalStaff: platformData.totalStaff || 0,
        systemHealth: 100,
      });

      setGrowthData(platformData.growthData || []);

      setRecentStores(recentSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase italic text-glow">Command Center</h1>
        <p className="text-slate-400">Platform-wide overview and real-time system metrics.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Businesses", value: stats.totalStores, trend: "Live", icon: Building2, color: "blue" },
          { label: "Platform Users", value: stats.totalUsers, trend: "Live", icon: Users, color: "indigo" },
          { label: "Total Staff", value: stats.totalStaff, trend: "Live", icon: Activity, color: "amber" },
          { label: "System Health", value: `${stats.systemHealth}%`, trend: "Optimal", icon: Shield, color: "emerald" },
        ].map((kpi) => (
          <div key={kpi.label} className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 transition-all hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10">
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "rounded-xl p-2 ring-1",
                  kpi.color === "blue" && "bg-blue-500/10 text-blue-500 ring-blue-500/20",
                  kpi.color === "indigo" && "bg-indigo-500/10 text-indigo-500 ring-indigo-500/20",
                  kpi.color === "amber" && "bg-amber-500/10 text-amber-500 ring-amber-500/20",
                  kpi.color === "emerald" && "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
                )}>
                  <kpi.icon className="h-6 w-6" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500`}>
                  {kpi.trend}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">
                  {loading ? "..." : kpi.value}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
              </div>
            </div>
            <div className={cn(
              "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl transition-all group-hover:opacity-20 opacity-10",
              kpi.color === "blue" && "bg-blue-500",
              kpi.color === "indigo" && "bg-indigo-500",
              kpi.color === "amber" && "bg-amber-500",
              kpi.color === "emerald" && "bg-emerald-500",
            )} />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white uppercase italic tracking-wider">Onboarding Growth</h3>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 ring-1 ring-slate-800 px-2 py-1 rounded">
              Last 6 Months
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorStores" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "12px" }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="stores" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorStores)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <SystemActivityFeed />
        </div>
      </div>

      {/* Platform Sales Monitor */}
      <PlatformSalesMonitor />

      {/* Recent Businesses Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white uppercase italic tracking-wider">Recently Joined Stores</h3>
          <button 
            onClick={() => setProvisionOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            Provision Store
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Business Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Slug</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Created</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-medium">
                    Loading recent stores...
                  </td>
                </tr>
              ) : recentStores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-medium">
                    No stores found.
                  </td>
                </tr>
              ) : recentStores.map((store) => (
                <tr key={store.id} className="group hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{store.name || "Unnamed Store"}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{store.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-blue-500">{store.slug || "no-slug"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ring-1",
                      store.status === "active" 
                        ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-500 ring-rose-500/20"
                    )}>
                      <div className={cn("h-1 w-1 rounded-full", store.status === "active" ? "bg-emerald-500" : "bg-rose-500")} />
                      {store.status || "active"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-400 capitalize">{store.businessType || "Retail"}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {store.createdAt?.seconds ? new Date(store.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          const slug = store.slug;
                          window.open(`/app/dashboard?s=${slug}`, "_blank");
                        }}
                        title="Audit Store (Jump In)"
                        className="flex h-8 items-center gap-2 rounded-lg bg-blue-600/10 px-3 text-[10px] font-black uppercase text-blue-500 transition-all hover:bg-blue-600 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Jump In
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ProvisionStoreDialog 
        open={provisionOpen} 
        onOpenChange={setProvisionOpen} 
        onSuccess={fetchDashboardData}
      />

      {/* Platform Terminal (Real-time Audit Stream) */}
      <div className="rounded-2xl border border-slate-800 bg-black p-4 font-mono text-[11px] shadow-2xl">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-slate-500 ml-4">nexaos_platform_monitor — bash — 80x24</span>
          </div>
          <span className="text-emerald-500 animate-pulse">● LIVE_STREAM_ACTIVE</span>
        </div>
        <div className="space-y-1 text-slate-400 overflow-hidden h-40">
           <p><span className="text-emerald-500">[SYSTEM]</span> Initializing platform kernel...</p>
           <p><span className="text-blue-500">[INFO]</span> Auth service connected (Region: us-central1)</p>
           <p><span className="text-blue-500">[INFO]</span> Firestore listeners established for {stats.totalStores} stores</p>
           {recentStores.slice(0, 3).map(store => (
             <p key={store.id}><span className="text-amber-500">[EVENT]</span> New business provisioned: <span className="text-white font-bold">{store.name}</span> ({store.slug}.nexa.os)</p>
           ))}
           <p className="animate-pulse">_</p>
        </div>
      </div>
    </div>
  );
}
