import { Activity, Shield, UserPlus, Building, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_EVENTS = [
  { id: 1, type: 'business', message: 'New store "Gombe Tech" provisioned', time: '2m ago', icon: Building, color: 'blue' },
  { id: 2, type: 'user', message: 'User icedmist@gmail.com signed up', time: '15m ago', icon: UserPlus, color: 'emerald' },
  { id: 3, type: 'security', message: 'Rate limit triggered for IP 192.168.1.1', time: '45m ago', icon: Shield, color: 'rose' },
  { id: 4, type: 'performance', message: 'Function "listallusers" execution peak: 1.2s', time: '1h ago', icon: Zap, color: 'amber' },
  { id: 5, type: 'business', message: 'Store "Nexa Retail" updated subscription', time: '3h ago', icon: Building, color: 'indigo' },
];

export function SystemActivityFeed() {
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
        {MOCK_EVENTS.map((event) => (
          <div key={event.id} className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition-all hover:bg-slate-900 group">
            <div className={cn(
              "mt-0.5 rounded-lg p-2 ring-1",
              event.color === 'blue' && "bg-blue-500/10 text-blue-500 ring-blue-500/20",
              event.color === 'emerald' && "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
              event.color === 'rose' && "bg-rose-500/10 text-rose-500 ring-rose-500/20",
              event.color === 'amber' && "bg-amber-500/10 text-amber-500 ring-amber-500/20",
              event.color === 'indigo' && "bg-indigo-500/10 text-indigo-500 ring-indigo-500/20",
            )}>
              <event.icon className="h-4 w-4" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{event.message}</span>
              <span className="text-[10px] font-medium text-slate-500">{event.time}</span>
            </div>
          </div>
        ))}
      </div>
      
      <button className="mt-2 w-full rounded-xl border border-slate-800 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-900 hover:text-slate-300">
        View Full Audit Trail
      </button>
    </div>
  );
}
