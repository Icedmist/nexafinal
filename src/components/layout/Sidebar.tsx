import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Truck,
  ClipboardList,
  Inbox,
  MapPin,
  BarChart3,
  Sparkles,
  Settings,
  ChevronRight,
  HelpCircle,
  ShoppingCart,
  History,
  RotateCcw,
  Receipt,
  TrendingUp,
  Users,
  ShieldCheck,
  Building2,
  Globe,
  LogOut,
  Activity,
  Store,
  Handshake,
  Radar,
  UserPlus,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useSector } from "@/hooks/useSector";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import nexaLogo from "@/assets/nexa-logo.svg";
import type { RolePermissions } from "@/lib/roles";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  system_admin: "System Admin",
  suspended: "Suspended",
  loading: "Loading...",
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permKey?: keyof RolePermissions;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  permKey?: keyof RolePermissions;
}

const systemAdminGroups: NavGroup[] = [
  {
    label: "Platform Admin",
    items: [
      { label: "Command Center", href: "/system-admin/dashboard", icon: ShieldCheck },
      { label: "Businesses", href: "/system-admin/businesses", icon: Building2 },
      { label: "User Directory", href: "/system-admin/users", icon: Globe },
    ],
  },
];

const standaloneLinks: NavItem[] = [
  { label: "Requests", href: "/app/requests", icon: Inbox },
  { label: "Site Map", href: "/sitemap", icon: Globe },
  { label: "Help", href: "/app/help", icon: HelpCircle },
  { label: "Agent Portal", href: "/agents", icon: UserPlus },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { permissions, isSystemAdmin, role } = useRole();
  const sector = useSector();
  const { profile } = useBusiness();
  const { user, logout } = useAuth();
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "staff", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setStaffName(docSnap.data().displayName || "");
      }
    }, (err) => {
      console.error("Error subscribing to staff name in sidebar:", err);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const displayName = isSystemAdmin ? "System Admin" : (staffName || user?.displayName || user?.email?.split("@")[0] || "User");
  const userInitials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);

  const isBasicPOS = profile?.complexityLevel === "basic";

  const navGroups: NavGroup[] = [
    {
      label: "Operations",
      items: [
        { label: sector.labels.dashboard, href: "/app/dashboard", icon: LayoutDashboard },
        { label: sector.labels.sales, href: "/app/sales", icon: ShoppingCart },
        { label: "Sales History", href: "/app/sales-history", icon: History },
        { label: "Sales Analytics", href: "/app/sales-analytics", icon: TrendingUp, permKey: "canViewAnalytics" },
        { label: sector.labels.customers, href: "/app/customers", icon: Users },
        { label: sector.labels.catalog, href: "/app/catalog", icon: sector.icons.catalog, permKey: "canManageItems" },
        { label: sector.labels.movements, href: "/app/movements", icon: ArrowLeftRight, permKey: "canLogMovements" },
        { label: "Locations", href: "/app/locations", icon: MapPin, permKey: "canManageItems" },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Returns", href: "/app/returns", icon: RotateCcw },
        { label: "Expenses", href: "/app/expenses", icon: Receipt },
        { label: "Moniepoint Live", href: "/app/moniepoint", icon: Activity, permKey: "canViewAnalytics" },
      ],
    },
    {
      label: "Procurement",
      permKey: "canManagePOs",
      items: [
        { label: sector.labels.suppliers, href: "/app/suppliers", icon: Truck },
        { label: "Restocking", href: "/app/restocking", icon: ClipboardList },
      ],
    },
    {
      label: "Intelligence",
      permKey: "canViewAnalytics",
      items: [
        { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
        { label: "AI insights", href: "/app/ai-insights", icon: Sparkles },
      ],
    },
    {
      label: "Growth",
      items: [
        { label: "Digital Storefront", href: "/app/ecommerce", icon: Store },
        { label: "Affiliate Program", href: "/app/affiliates", icon: Handshake },
        { label: "Admin Tracker", href: "/app/tracker", icon: Radar },
      ],
    },
    {
      label: "Admin",
      permKey: "canAccessSettings",
      items: [
        { label: "Settings", href: "/app/settings", icon: Settings },
        { label: "Staff", href: "/app/staff", icon: Users, permKey: "canManageUsers" },
      ],
    },
  ];

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => location.pathname === href;
  const isSystemRoute = location.pathname.startsWith("/system-admin");

  // Filter groups and items based on permissions AND business complexity
  const visibleGroups = navGroups
    .filter((g) => {
      if (isSystemAdmin) return true;
      const hasPerm = !g.permKey || permissions[g.permKey];
      const isAllowedByComplexity = isBasicPOS ? !["Finance", "Procurement", "Intelligence"].includes(g.label) : true;
      return hasPerm && isAllowedByComplexity;
    })
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (i.href === "/app/moniepoint" && !profile?.settings?.moniepointEnabled) {
          return false;
        }
        return isSystemAdmin || !i.permKey || permissions[i.permKey];
      }),
    }))
    .filter((g) => g.items.length > 0);

  // For System Admins: 
  // If on a system route, show ONLY system groups.
  // If on an app route, show both but prioritize app groups (or just show all).
  const allVisibleGroups = isSystemAdmin 
    ? (isSystemRoute ? systemAdminGroups : [...systemAdminGroups, ...visibleGroups])
    : visibleGroups;

  return (
    <nav data-tour="sidebar" className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border/30">
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="bg-sidebar-primary/20 rounded-xl p-2.5 shadow-[0_0_15px_rgba(var(--sidebar-primary),0.2)]">
          <img src={nexaLogo} className="h-6 w-6" alt="NEXA Logo" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black tracking-[0.2em] uppercase text-sidebar-primary-foreground/40 leading-none mb-1">
            NEXA OS
          </span>
          <span className="text-sm font-bold tracking-tight text-sidebar-primary-foreground truncate max-w-[160px]">
            {isSystemAdmin ? "Platform Admin" : (profile?.storeDetails?.name || "Store OS")}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {allVisibleGroups.map((group, idx) => {
          const isCollapsed = collapsed[group.label] ?? false;
          return (
            <div key={group.label}>
              {idx > 0 && <div className="mx-2 my-2 border-t border-sidebar-border" />}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
              >
                <ChevronRight className={cn("h-3 w-3 transition-transform duration-150", !isCollapsed && "rotate-90")} />
                {group.label}
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      data-tour={item.label.toLowerCase()}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200",
                        isActive(item.href)
                          ? "bg-sidebar-primary/10 font-semibold text-sidebar-primary-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground",
                      )}
                    >
                      {isActive(item.href) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full shadow-[0_0_10px_rgba(var(--sidebar-primary),0.5)]" />
                      )}
                      <item.icon className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                        isActive(item.href) ? "text-sidebar-primary" : "text-sidebar-foreground/40"
                      )} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="mx-2 my-2 border-t border-sidebar-border/20" />
        <div className="space-y-0.5">
          {standaloneLinks.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200",
                isActive(item.href)
                  ? "bg-sidebar-primary/10 font-semibold text-sidebar-primary-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground",
              )}
            >
              {isActive(item.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full" />
              )}
              <item.icon className={cn(
                "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                isActive(item.href) ? "text-sidebar-primary" : "text-sidebar-foreground/40"
              )} />
              {item.label}
            </Link>
          ))}
          
          {/* System Admin View Toggle */}
          {isSystemAdmin && (
            <Link
              to={isSystemRoute ? "/app/dashboard" : "/system-admin/dashboard"}
              className="mt-6 flex items-center gap-3 rounded-2xl bg-primary/20 px-4 py-3 text-xs font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/30 border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
            >
              {isSystemRoute ? (
                <>
                  <LayoutDashboard className="h-4 w-4" />
                  Enter Store View
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Platform Command
                </>
              )}
            </Link>
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border/20 bg-sidebar-accent/10">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-10 w-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary-foreground font-bold border border-sidebar-primary/10 shadow-inner">
            {userInitials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-sidebar-primary-foreground truncate">
              {displayName}
            </span>
            <span className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-wider">
              {isSystemAdmin ? "Superuser" : (ROLE_LABELS[role || ""] || role || "Store Staff")}
            </span>
          </div>
        </div>
        
        <button
          onClick={async () => {
            onNavigate?.();
            try {
              await logout();
            } catch (err) {
              console.error("Logout failed:", err);
            }
          }}
          className="mt-4 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-all duration-200 group"
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-1" />
          Logout
        </button>
      </div>
    </nav>
  );
}
