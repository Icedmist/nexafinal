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
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground uppercase tracking-wide">
          System Command Center
        </h1>
        <p className="text-sm text-muted-foreground">Platform-wide overview and real-time operational metrics.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Businesses", value: stats.totalStores, trend: "Live Platform", icon: Building2, color: "teal" },
          { label: "Platform Users", value: stats.totalUsers, trend: "Registered", icon: Users, color: "blue" },
          { label: "Total Staff Accounts", value: stats.totalStaff, trend: "Active Staff", icon: Activity, color: "indigo" },
          { label: "System Health", value: `${stats.systemHealth}%`, trend: "Operational", icon: Shield, color: "emerald" },
        ].map((kpi) => (
          <div 
            key={kpi.label} 
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "rounded-xl p-2.5 ring-1 transition-all",
                  kpi.color === "teal" && "bg-teal-500/10 text-teal-500 ring-teal-500/20",
                  kpi.color === "blue" && "bg-sky-500/10 text-sky-500 ring-sky-500/20",
                  kpi.color === "indigo" && "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20",
                  kpi.color === "emerald" && "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
                )}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-mono">
                  {kpi.trend}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold tracking-tight text-foreground font-sans">
                  {loading ? "..." : kpi.value}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{kpi.label}</span>
              </div>
            </div>
            <div className={cn(
              "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl transition-all group-hover:opacity-25 opacity-10",
              kpi.color === "teal" && "bg-teal-500",
              kpi.color === "blue" && "bg-sky-500",
              kpi.color === "indigo" && "bg-indigo-500",
              kpi.color === "emerald" && "bg-emerald-500",
            )} />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Onboarding Growth
            </h3>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border bg-muted/50 px-2.5 py-1 rounded-md font-mono">
              Last 6 Months
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorStores" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary, #0d9488)" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="var(--primary, #0d9488)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(148, 163, 184, 0.2)", borderRadius: "12px", color: "#f8fafc" }}
                  itemStyle={{ color: "#38bdf8", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="stores" stroke="var(--primary, #0d9488)" strokeWidth={3} fillOpacity={1} fill="url(#colorStores)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SystemActivityFeed />
        </div>
      </div>

      {/* Platform Sales Monitor */}
      <PlatformSalesMonitor />

      {/* Recent Businesses Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div>
            <h3 className="text-base font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Recently Joined Stores
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Live store registrations and account statuses</p>
          </div>
          <button 
            onClick={() => setProvisionOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Provision Store
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Business Name</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Domain Slug</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Status</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered</th>
                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground text-xs font-medium">
                    Loading recent stores...
                  </td>
                </tr>
              ) : recentStores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground text-xs font-medium">
                    No stores found in directory.
                  </td>
                </tr>
              ) : recentStores.map((store) => (
                <tr key={store.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground">{store.name || "Unnamed Store"}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{store.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono font-semibold text-primary">{store.slug || "no-slug"}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                      store.status === "active" 
                        ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25" 
                        : "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/25"
                    )}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", store.status === "active" ? "bg-emerald-500" : "bg-rose-500")} />
                      {store.status || "active"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{store.businessType || "Retail"}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                    {store.createdAt?.seconds ? new Date(store.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          const slug = store.slug;
                          window.open(`/app/dashboard?s=${slug}`, "_blank");
                        }}
                        title="Audit Store (Jump In)"
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground px-3 text-[11px] font-bold uppercase transition-all"
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
      <div className="rounded-2xl border border-border bg-slate-950 p-5 font-mono text-[11px] shadow-lg">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-slate-400 text-xs font-bold ml-2">Platform Console Output</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">LIVE_STREAM</span>
        </div>
        <div className="space-y-1.5 text-slate-300 overflow-hidden h-36 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
           <p><span className="text-emerald-400 font-bold">[SYSTEM]</span> Platform operational — {stats.totalStores} stores registered</p>
           <p><span className="text-sky-400 font-bold">[INFO]</span> {stats.totalUsers} users, {stats.totalStaff} staff members active</p>
           {recentStores.slice(0, 3).map(store => (
             <p key={store.id}><span className="text-amber-400 font-bold">[EVENT]</span> Store initialized: <span className="text-white font-bold">{store.name}</span> ({store.slug}.nexa.os)</p>
           ))}
           {recentStores.length === 0 && !loading && (
             <p className="text-slate-500 italic">No recent system activity recorded</p>
           )}
        </div>
      </div>
    </div>
  );
}
