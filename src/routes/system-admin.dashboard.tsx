import { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Search,
  ExternalLink
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
import { db } from "@/lib/firebase";

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
    activeSessions: 142, // Mock for now
    uptime: "99.98%"
  });

  useEffect(() => {
    const fetchStats = async () => {
      // In a real app, these would come from a platform_stats doc or Cloud Function
      const storesSnap = await getDocs(collection(db, "stores"));
      setStats(prev => ({
        ...prev,
        totalStores: storesSnap.size
      }));
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Command Center</h1>
        <p className="text-slate-400">Platform-wide overview and real-time system metrics.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Businesses", value: stats.totalStores, trend: "+12.5%", positive: true, icon: Building2, color: "blue" },
          { label: "Platform Users", value: stats.totalUsers || 1240, trend: "+18.2%", positive: true, icon: Users, color: "indigo" },
          { label: "Active Sessions", value: stats.activeSessions, trend: "-2.4%", positive: false, icon: Activity, color: "emerald" },
          { label: "System Uptime", value: stats.uptime, trend: "Stable", positive: true, icon: Activity, color: "violet" },
        ].map((kpi) => (
          <div key={kpi.label} className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 transition-all hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10">
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={`rounded-xl bg-${kpi.color}-500/10 p-2 text-${kpi.color}-500 ring-1 ring-${kpi.color}-500/20`}>
                  <kpi.icon className="h-6 w-6" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${kpi.positive ? "text-emerald-500" : "text-rose-500"}`}>
                  {kpi.trend}
                  {kpi.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{kpi.value}</span>
                <span className="text-sm font-medium text-slate-500">{kpi.label}</span>
              </div>
            </div>
            {/* Subtle background glow */}
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-${kpi.color}-500/5 blur-3xl transition-all group-hover:bg-${kpi.color}-500/10`} />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Business Registration Growth</h3>
            <select className="bg-slate-900 text-xs font-bold text-slate-400 border-none rounded-lg ring-1 ring-slate-800 px-3 py-1.5 focus:ring-blue-500">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorStores" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
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
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Platform Activity (Events)</h3>
            <Activity className="h-5 w-5 text-slate-500" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "12px" }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Bar dataKey="active" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Businesses Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white uppercase italic tracking-wider">Recently Joined Stores</h3>
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20">
            <Plus className="h-4 w-4" />
            Provision Store
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Business Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Owner</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Type</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Created</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="group hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">Nexa Retail {i}</span>
                      <span className="text-[10px] text-slate-500 font-medium">nexa-retail-{i}.nexa.os</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-800" />
                      <span className="text-sm font-medium text-slate-300">Admin User {i}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-500 ring-1 ring-emerald-500/20">
                      <div className="h-1 w-1 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-400 capitalize">Retail</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">May {i}, 2026</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-500 hover:text-blue-500 transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
