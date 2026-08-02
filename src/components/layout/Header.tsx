import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Plus, Menu, User, LogOut, Settings, ChevronDown, ScanBarcode, Wifi, WifiOff, Building2 } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sidebar } from "./Sidebar";
import { SystemAdminSidebar } from "@/components/system-admin/SystemAdminSidebar";
import { QuickEntryMode } from "@/components/data/QuickEntryMode";
import { CommandPalette } from "@/components/command/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useRole } from "@/hooks/useRole";
import { PermissionGate } from "@/hooks/usePermissions";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useEffectiveBranch } from "@/hooks/useEffectiveBranch";
import { useStoreBranches } from "@/hooks/useStaffData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { doc, onSnapshot, collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/20",
  owner: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  manager: "bg-secondary/15 text-secondary-foreground border-secondary/20",
  staff: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  system_admin: "bg-purple-500/15 text-purple-600 border-purple-500/20",
  suspended: "bg-destructive/15 text-destructive border-destructive/20",
  loading: "bg-muted text-muted-foreground border-transparent",
};


const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  system_admin: "System Admin",
  suspended: "Suspended",
  loading: "Loading...",
};


export function Header({ sidebarCollapsed = false, onToggleSidebar }: { sidebarCollapsed?: boolean; onToggleSidebar?: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  
  const { logout } = useAuth();
  const { role, isSystemAdmin } = useRole();
  const { profile, switchStore, storeId, activeBranchId, setActiveBranchId } = useBusiness();
  const { user } = useAuth();
  const { data: branches = [], isLoading: branchesLoading } = useStoreBranches({ includeAll: true });
  const navigate = useNavigate();
  const location = useLocation();

  const [staffName, setStaffName] = useState("");
  const [allStores, setAllStores] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    if (!isSystemAdmin) return;
    const fetchAllStores = async () => {
      try {
        const q = query(collection(db, "stores"), orderBy("name"));
        const snap = await getDocs(q);
        const storesList = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || "Unnamed Store",
          slug: doc.data().slug || ""
        }));
        setAllStores(storesList);
      } catch (err) {
        console.error("Error fetching stores in store selector:", err);
      }
    };
    fetchAllStores();
  }, [isSystemAdmin]);

  // Safe connectivity indicator — reads browser online/offline state only.
  // IMPORTANT: We do NOT call Firestore disableNetwork()/enableNetwork() here
  // because those APIs trigger the known firebase-js-sdk #9172 WebChannel
  // race condition that causes "Unexpected state (ID: ca9)" assertion failures.
  const [isOfflineMode, setIsOfflineMode] = useState(() => {
    return typeof navigator !== "undefined" ? !navigator.onLine : false;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      toast.success("Internet connection restored! Synced with database.");
    };
    
    const handleOffline = () => {
      setIsOfflineMode(true);
      toast.warning("No internet connection detected. Operating in Offline Mode.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "staff", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setStaffName(docSnap.data().displayName || "");
      }
    }, (err) => {
      console.error("Error subscribing to staff name:", err);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const isSystemRoute = location.pathname.startsWith("/system-admin");
  const storeName = isSystemAdmin && isSystemRoute ? "PLATFORM COMMAND" : (profile?.storeDetails?.name || "NEXA");
  const displayName = staffName || user?.displayName || user?.email?.split("@")[0] || "User";
  const userInitials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  const photoURL = user?.photoURL;

  const handleLogout = async () => {
    try {
      await logout();
      // The deep logout in context will handle storage clearing and redirecting
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/";
    }
  };

  // Branch switcher: only admins and owners may jump into any branch of their
  // own shop. Managers/staff stay hard-scoped to their single branch.
  const maySwitchBranch = role === "admin" || role === "owner";
  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;

  // CMD+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className={cn(
      "flex h-16 items-center gap-3 border-b px-4 md:px-8 transition-all duration-500 sticky top-0 z-40",
      isSystemRoute 
        ? "border-slate-800 bg-slate-950 md:rounded-none" 
        : "border-border/40 bg-card/40 backdrop-blur-md md:rounded-t-[2rem]"
    )}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden rounded-xl hover:bg-primary/5 active:scale-95 transition-all" 
        onClick={() => setMobileOpen(true)} 
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {onToggleSidebar && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="hidden md:inline-flex rounded-xl hover:bg-primary/5 active:scale-95 transition-all" 
          onClick={onToggleSidebar} 
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className="flex flex-col md:hidden">
        <span className="text-xs font-black tracking-widest text-primary/70 uppercase">{storeName}</span>
      </div>

      <button 
        data-tour="search" 
        type="button" 
        onClick={() => setPaletteOpen(true)} 
        className={cn(
          "flex h-10 flex-1 items-center gap-3 rounded-2xl border px-4 text-sm transition-all md:max-w-xs group active:scale-[0.98]",
          isSystemRoute 
            ? "border-slate-800 bg-slate-900 text-slate-400 hover:border-blue-500/50" 
            : "border-border/60 bg-white/50 backdrop-blur-sm text-muted-foreground hover:border-primary/40 hover:bg-white/80 shadow-sm"
        )}
      >
        <Search className="h-4 w-4 shrink-0 group-hover:text-primary transition-colors" />
        <span className="font-medium">Command Palette</span>
        <kbd className={cn(
          "ml-auto hidden rounded-lg border px-1.5 py-0.5 font-mono text-[10px] font-bold md:inline-block",
          isSystemRoute ? "border-slate-800 bg-slate-950 text-slate-500" : "border-border/50 bg-muted/50 text-muted-foreground/60"
        )}>⌘K</kbd>
      </button>

      <div className="hidden flex-1 items-center justify-center md:flex">
         <span className={cn(
           "text-xs font-black tracking-[0.4em] uppercase italic transition-all drop-shadow-sm",
           isSystemRoute ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" : "text-muted-foreground/30 hover:text-muted-foreground/50"
         )}>
           {storeName}
         </span>
      </div>

      {!isSystemRoute && (
        <div className="flex items-center gap-2">
          {/* Nexa Connectivity Indicator (read-only — no Firestore network manipulation) */}
          <div 
            className={cn(
              "h-10 px-3 gap-2 rounded-xl flex items-center transition-all duration-300 text-xs font-black uppercase tracking-widest border cursor-default",
              isOfflineMode 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Offline</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </>
            )}
          </div>

          <div className="mx-1 h-6 w-[1px] bg-border/40" />

          {maySwitchBranch && branches.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 px-3 gap-2 rounded-xl border-border/60 bg-white/50 backdrop-blur-sm hover:border-primary/40 hover:bg-white/80 hover:text-primary text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center shrink-0"
                  title="Switch active branch"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="max-w-[110px] truncate">
                    {activeBranch ? activeBranch.name || "Branch" : "All Branches"}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-[300px] overflow-y-auto nexa-glass p-2 border-border/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Active Branch
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40 my-2" />
                <DropdownMenuItem
                  onClick={() => {
                    setActiveBranchId(null);
                    toast.success("Viewing all branches");
                  }}
                  className="rounded-xl h-10 px-3 cursor-pointer focus:bg-primary/5 focus:text-primary transition-all text-xs font-bold"
                >
                  {!activeBranchId ? "✓ " : ""}All Branches
                </DropdownMenuItem>
                {branches.map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => {
                      setActiveBranchId(b.id);
                      toast.success(`Operating in: ${b.name}`);
                    }}
                    className={cn(
                      "rounded-xl h-10 px-3 cursor-pointer focus:bg-primary/5 focus:text-primary transition-all text-xs font-bold",
                      activeBranchId === b.id ? "bg-primary/10 text-primary border border-primary/20" : ""
                    )}
                  >
                    {activeBranchId === b.id ? "✓ " : ""}{b.name || "Branch"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <PermissionGate permission="log_movement">
            <Button size="icon" variant="outline" className="shrink-0 h-10 w-10 rounded-xl border-border/60 bg-white/50 backdrop-blur-sm hover:border-primary/40 hover:bg-white/80 hover:text-primary transition-all active:scale-95" aria-label="Quick entry" onClick={() => setQuickEntryOpen(true)}>
              <ScanBarcode className="h-5 w-5" />
            </Button>
          </PermissionGate>

          <PermissionGate permission="create_item">
            <Button size="icon" variant="outline" className="shrink-0 h-10 w-10 rounded-xl border-border/60 bg-white/50 backdrop-blur-sm hover:border-primary/40 hover:bg-white/80 hover:text-primary transition-all active:scale-95 nexa-button-shine" aria-label="New item" onClick={() => navigate("/app/catalog?newItem=true")}>
              <Plus className="h-5 w-5" />
            </Button>
          </PermissionGate>
          
          <div className="mx-1 h-6 w-[1px] bg-border/40" />
          
          <NotificationBell onClick={() => setNotifOpen(true)} />
        </div>
      )}

      {isSystemAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="h-10 px-3 gap-2 rounded-xl border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500 text-blue-400 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center shrink-0"
            >
              <Building2 className="h-4 w-4" />
              <span className="max-w-[120px] truncate">
                {profile?.storeDetails?.name || "Select Store Sandbox"}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-[300px] overflow-y-auto nexa-glass p-2 border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
              Active Store Sandbox
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800 my-2" />
            <DropdownMenuItem 
              onClick={() => {
                if (switchStore) {
                  switchStore(null);
                  toast.success("Exited store view. Showing platform metrics.");
                  navigate("/system-admin/dashboard");
                }
              }}
              className="rounded-xl h-10 px-3 cursor-pointer focus:bg-slate-900 focus:text-white transition-all text-xs font-bold text-slate-400"
            >
              None (Global Command)
            </DropdownMenuItem>
            {allStores.map((s) => (
              <DropdownMenuItem 
                key={s.id}
                onClick={() => {
                  if (switchStore) {
                    localStorage.setItem("nexa_system_admin_selected_store_slug", s.slug);
                    switchStore(s.id);
                    toast.success(`Switched store context to: ${s.name}`);
                    navigate(`/app/dashboard?s=${s.slug}`);
                  }
                }}
                className={cn(
                  "rounded-xl h-10 px-3 cursor-pointer focus:bg-blue-600 focus:text-white transition-all text-xs font-bold",
                  storeId === s.id ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : "text-slate-200"
                )}
              >
                <div className="flex flex-col">
                  <span>{s.name}</span>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-300 font-medium lowercase">@{s.slug}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="group flex items-center gap-3 rounded-2xl pl-1 pr-3 py-1 hover:bg-primary/5 transition-all border border-transparent hover:border-primary/10 active:scale-95" aria-label="User menu">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-background shadow-lg ring-1 ring-border group-hover:ring-primary/40 transition-all duration-300">
                {photoURL ? (
                  <AvatarImage src={photoURL} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500 shadow-sm" />
            </div>
            <div className="hidden flex-col items-start md:flex">
              <span className="text-xs font-black tracking-tight leading-none group-hover:text-primary transition-colors uppercase">{displayName}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase bg-background/50 border-border/50 text-muted-foreground/70 group-hover:border-primary/20 group-hover:text-primary/70 transition-all tracking-widest">
                  {ROLE_LABELS[role]}
                </Badge>
                {isSystemAdmin && (
                  <div className="h-4 flex items-center px-1.5 rounded-sm bg-blue-600 text-white text-[7px] font-black uppercase leading-none tracking-tighter">
                    PLATFORM
                  </div>
                )}
              </div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground/30 md:inline-block transition-transform duration-300 group-data-[state=open]:rotate-180 group-hover:text-primary/40" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 nexa-glass p-2 border-border/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <DropdownMenuLabel className="flex flex-col gap-1 px-3 py-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Authenticated User</span>
             <div className="flex items-center justify-between">
                <span className="text-sm font-black truncate">{displayName}</span>
                <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-tighter", ROLE_BADGE_STYLES[role])}>
                  {ROLE_LABELS[role]}
                </Badge>
             </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/40 my-2" />
          <DropdownMenuItem className="rounded-xl h-11 px-3 cursor-pointer focus:bg-primary/5 focus:text-primary group transition-all" onClick={() => navigate("/app/settings")}>
            <Settings className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <span className="font-bold text-xs uppercase tracking-widest">System Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-xl h-11 px-3 cursor-pointer focus:bg-destructive/5 focus:text-destructive group transition-all" onClick={handleLogout}>
            <LogOut className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-destructive" />
            <span className="font-bold text-xs uppercase tracking-widest">Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 border-r border-slate-800">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {isSystemRoute ? (
            <SystemAdminSidebar />
          ) : (
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          )}
        </SheetContent>
      </Sheet>

      <QuickEntryMode open={quickEntryOpen} onOpenChange={setQuickEntryOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} onOpenPrefs={() => { setNotifOpen(false); setTimeout(() => setPrefsOpen(true), 300); }} />
      <NotificationPreferences open={prefsOpen} onOpenChange={setPrefsOpen} />
      
    </header>
  );
}
