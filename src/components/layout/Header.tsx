import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Plus, Menu, User, LogOut, Settings, ChevronDown, ScanBarcode } from "lucide-react";
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
import { cn } from "@/lib/utils";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/20",
  owner: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  manager: "bg-secondary/15 text-secondary-foreground border-secondary/20",
  staff: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  system_admin: "bg-purple-500/15 text-purple-600 border-purple-500/20",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  system_admin: "System Admin",
};


export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  
  const { logout } = useAuth();
  const { role, isSystemAdmin } = useRole();
  const { profile } = useBusiness();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSystemRoute = location.pathname.startsWith("/system-admin");
  const storeName = isSystemAdmin && isSystemRoute ? "PLATFORM COMMAND" : (profile?.storeDetails?.name || "NEXA");
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
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
