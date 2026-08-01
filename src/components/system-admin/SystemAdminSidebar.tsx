import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Activity,
  ShieldCheck,
  LifeBuoy,
  UserCheck,
  CreditCard,
  Mail,
  Headphones,
  Radio,
  Bot,
  MessageSquare,
  Pill,
  PieChart,
  MapPin,
  Globe,
  Map
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import nexaLogo from "@/assets/nexa-logo.svg";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const systemAdminLinks: NavItem[] = [
  { label: "Overview", href: "/system-admin/dashboard", icon: LayoutDashboard },
  { label: "Businesses", href: "/system-admin/businesses", icon: Building2 },
  { label: "Platform Users", href: "/system-admin/users", icon: Users },
  { label: "Audit Logs", href: "/system-admin/audit", icon: ShieldCheck },
  { label: "System Health", href: "/system-admin/health", icon: Activity },
  { label: "Global Settings", href: "/system-admin/settings", icon: Settings },
  { label: "Agent Network", href: "/system-admin/agents-network", icon: UserCheck },
  { label: "Subscriptions", href: "/system-admin/subscriptions", icon: CreditCard },
  { label: "Retention", href: "/system-admin/retention", icon: Mail },
  { label: "Support Tickets", href: "/system-admin/support", icon: Headphones },
  { label: "Updates & Broadcasts", href: "/system-admin/updates", icon: Radio },
  { label: "AI Agents", href: "/system-admin/agents", icon: Bot },
  { label: "Live Chats", href: "/system-admin/chats", icon: MessageSquare },
  { label: "Drug Library", href: "/system-admin/drug-library", icon: Pill },
  { label: "Categories", href: "/system-admin/categories", icon: PieChart },
  { label: "Attribution", href: "/system-admin/attribution", icon: Globe },
  { label: "Operations", href: "/system-admin/operations", icon: MapPin },
  { label: "Store Map", href: "/system-admin/map", icon: Map },
];

export function SystemAdminSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const location = useLocation();
  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="flex h-full flex-col bg-slate-950 text-slate-200 border-r border-slate-800">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="bg-blue-500/20 rounded-lg p-1.5 ring-1 ring-blue-500/50">
          <img src={nexaLogo} className="h-6 w-6" alt="NEXA Logo" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white leading-none">NEXA OS</span>
            <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mt-1">Platform Admin</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {!collapsed && (
          <div className="px-2 mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Menu</span>
          </div>
        )}
        {systemAdminLinks.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            title={item.label}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-200 group",
              collapsed && "justify-center px-0",
              isActive(item.href)
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              isActive(item.href) ? "text-white" : "text-slate-500 group-hover:text-blue-400"
            )} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}

        {!collapsed && (
          <div className="pt-8 px-2 mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Support</span>
          </div>
        )}
        <Link
          to="/app/help"
          title="Support Center"
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-100 transition-all",
            collapsed && "justify-center px-0"
          )}
        >
          <LifeBuoy className="h-5 w-5 shrink-0 text-slate-500" />
          {!collapsed && <span className="font-medium">Support Center</span>}
        </Link>
      </div>

      <div className="p-4 border-t border-slate-900 bg-slate-950/50">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              SA
            </div>
          </div>
        ) : (
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
            SA
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">System Administrator</span>
            <span className="text-[10px] text-slate-500 truncate">Platform Oversight</span>
          </div>
        </div>
        )}
      </div>
    </nav>
  );
}
