import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { QuickEntryMode } from "@/components/data/QuickEntryMode";
import { CommandPalette } from "@/components/command/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useRole } from "@/hooks/useRole";
import { PermissionGate } from "@/hooks/usePermissions";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/20",
  owner: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  manager: "bg-secondary/15 text-secondary-foreground border-secondary/20",
  staff: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  system_admin: "bg-purple-500/15 text-purple-600 border-purple-500/20",
  requestor: "bg-muted text-muted-foreground border-border",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  system_admin: "System Admin",
  requestor: "Requestor",
};


export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  
  const { logout } = useAuth();
  const { role } = useRole();
  const { profile } = useBusiness();
  const { user } = useAuth();
  const navigate = useNavigate();

  const storeName = profile?.storeDetails?.name || "NEXA";
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const userInitials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  const photoURL = user?.photoURL;

  const handleLogout = async () => {
    await logout();
    
    // Clear all caches to prevent session ghosting
    sessionStorage.clear();
    localStorage.clear();

    // Reset domain context for localhost or production
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      window.location.href = `${protocol}//localhost${port ? `:${port}` : ""}`;
    } else {
      const parts = host.split(".");
      if (parts.length > 2) {
        const domain = parts.slice(-2).join(".");
        window.location.href = `${protocol}//${domain}`;
      } else {
        window.location.href = `${protocol}//${host}`;
      }
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
    <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 shadow-sm md:px-8 md:rounded-t-2xl">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-col md:hidden">
        <span className="text-sm font-black tracking-tight truncate max-w-[120px]">{storeName}</span>
      </div>

      <button data-tour="search" type="button" onClick={() => setPaletteOpen(true)} className="flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-white px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:max-w-sm">
        <Search className="h-4 w-4 shrink-0" />
        <span>Search…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs md:inline-block">⌘K</kbd>
      </button>

      <div className="hidden flex-1 items-center justify-center md:flex">
         <span className="text-base font-black tracking-widest uppercase text-muted-foreground/40">{storeName}</span>
      </div>

      <PermissionGate permission="log_movement">
        <Button size="icon" variant="outline" className="shrink-0" aria-label="Quick entry" onClick={() => setQuickEntryOpen(true)}>
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </PermissionGate>

      <PermissionGate permission="create_item">
        <Button size="icon" variant="outline" className="shrink-0" aria-label="New item" onClick={() => navigate("/app/catalog?newItem=true")}>
          <Plus className="h-4 w-4" />
        </Button>
      </PermissionGate>

      <NotificationBell onClick={() => setNotifOpen(true)} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="group flex items-center gap-3 rounded-xl pl-1 pr-4 py-1.5 hover:bg-muted/50 transition-all border border-transparent hover:border-border active:scale-95" aria-label="User menu">
            <Avatar className="h-10 w-10 border-2 border-background shadow-md ring-1 ring-border group-hover:ring-primary/30 transition-all">
              {photoURL ? (
                <AvatarImage src={photoURL} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start md:flex">
              <span className="text-sm font-bold tracking-tight leading-none group-hover:text-primary transition-colors">{displayName}</span>
              <Badge variant="outline" className="mt-1 h-4 px-1.5 text-[9px] font-bold uppercase bg-background/50 border-border/50 text-muted-foreground group-hover:border-primary/20 group-hover:text-primary/70 transition-all">
                {ROLE_LABELS[role]}
              </Badge>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground/50 md:inline-block transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center justify-between font-normal text-xs text-muted-foreground">
            {displayName}
            <Badge variant="outline" className={`ml-2 text-[10px] font-semibold uppercase ${ROLE_BADGE_STYLES[role]}`}>
              {ROLE_LABELS[role]}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/app/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <QuickEntryMode open={quickEntryOpen} onOpenChange={setQuickEntryOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} onOpenPrefs={() => { setNotifOpen(false); setTimeout(() => setPrefsOpen(true), 300); }} />
      <NotificationPreferences open={prefsOpen} onOpenChange={setPrefsOpen} />
      
    </header>
  );
}
