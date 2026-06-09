import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ShortcutsHelpDialog } from "@/components/command/ShortcutsHelpDialog";
import { PageTransition } from "@/components/shared/PageTransition";
import { useRole } from "@/hooks/useRole";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { canAccessRoute } from "@/lib/route-guard";
import { toast } from "sonner";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useTenant } from "@/contexts/TenantContext";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { NexaCoreLoader } from "@/components/shared/NexaCoreLoader";
import { StoreAccessGuard } from "@/components/shared/StoreAccessGuard";
import { useDeviceNotifications } from "@/hooks/useDeviceNotifications";
import { NotificationPermissionPrompt } from "@/components/notifications/NotificationPermissionPrompt";


export function AppLayout() {
  const auth = useAuth();
  const { user, loading, claims, claimsReady } = auth;
  const { profile, needsOnboarding, loadingProfile } = useBusiness();
  const { store } = useTenant();
  const { role, isSystemAdmin, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const { permission } = useDeviceNotifications();

  // Global keyboard shortcuts
  useKeyboardShortcuts({ onHelpOpen: () => setHelpOpen(true) });

  // Browser/Device Notifications
  useDeviceNotifications();

  // Cross-Tenant Security Check: Ensure user belongs to the current subdomain store
  useEffect(() => {
    if (user && claimsReady && !loadingProfile && store && profile) {
      const isOwner = user.uid === profile.ownerId;
      
      // Safety check for claims to prevent ReferenceError
      const currentStoreId = claims?.storeId;
      
      console.log("[AppLayout] Security Check:", {
        isOwner,
        isSystemAdmin,
        currentStoreId,
        storeId: store.id
      });

      // If we are on a subdomain but user is NOT owner and has no staff claim for this store
      if (!isOwner && !isSystemAdmin && (!currentStoreId || currentStoreId !== store.id)) {
        console.error("[AppLayout] Access Denied: User does not belong to this store.");
        toast.error("You don't have access to this store.");
        
        // Redirect to main domain to start onboarding or login to their own store
        const host = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;

        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          window.location.href = `${protocol}//localhost${port ? `:${port}` : ""}/onboarding`;
        } else {
          const parts = host.split(".");
          const domain = parts.slice(-2).join(".");
          window.location.href = `${protocol}//${domain}/onboarding`;
        }
      }
    }
  }, [user, claimsReady, loadingProfile, store, profile, isSystemAdmin, claims]);


  // Domain Access Enforcement: Staff MUST use subdomains, Owners can use main domain.
  useEffect(() => {
    if (user && claimsReady && !loadingProfile && !needsOnboarding && !store && !isSystemAdmin) {
      // We are on the main domain (no store from TenantContext)
      // Check if user is a staff member (not owner or system_admin)
      const isStaffMember = role === "staff" || role === "manager" || role === "admin";
      
      if (isStaffMember && profile?.storeDetails?.slug) {
        const slug = profile.storeDetails.slug;
        const host = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol;
        
        // Construct target URL
        let targetUrl = "";
        if (host.includes("localhost") || host.includes("127.0.0.1")) {
          targetUrl = `${protocol}//${slug}.localhost${port ? `:${port}` : ""}${location.pathname}${location.search}`;
        } else {
          const parts = host.split(".");
          const domain = parts.slice(-2).join("."); 
          targetUrl = `${protocol}//${slug}.${domain}${location.pathname}${location.search}`;
        }
        
        toast.info("Redirecting to your store's dedicated domain...");
        window.location.href = targetUrl;
      }
    }
  }, [user, claimsReady, loadingProfile, needsOnboarding, store, role, isSystemAdmin, profile, location]);

  // Role-based route guard
  useEffect(() => {
    const isSystemRoute = location.pathname.startsWith("/system-admin");
    
    // For normal users, we wait until onboarding is done to check routes (or they'll be redirected anyway)
    // For system admins OR system routes, we check immediately.
    const shouldCheckPermissions = isSystemAdmin || isSystemRoute || !needsOnboarding;

    if (user && claimsReady && !loadingProfile && !roleLoading && shouldCheckPermissions && role !== "loading") {
      const hasAccess = canAccessRoute(location.pathname, role);
      console.log("[AppLayout] Route Guard:", {
        path: location.pathname,
        role,
        hasAccess,
        isSystemAdmin
      });

      if (!hasAccess) {
        toast.error("You don't have permission to access that page.");
        navigate(isSystemAdmin ? "/system-admin/dashboard" : "/app/dashboard");
      }
    }
  }, [location.pathname, role, roleLoading, navigate, user, claimsReady, loadingProfile, needsOnboarding, isSystemAdmin]);


  // Auth guard — redirect to landing if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Onboarding guard — redirect to setup if store is incomplete
  useEffect(() => {
    const isSystemRoute = location.pathname.startsWith("/system-admin");
    if (user && claimsReady && !loadingProfile && needsOnboarding && !isSystemAdmin && !isSystemRoute) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, needsOnboarding, claimsReady, loadingProfile, navigate, isSystemAdmin, location.pathname]);
  
  // Auto-trigger notification prompt for new sessions if permission is default
  useEffect(() => {
    if (user && !loading && claimsReady && permission === "default") {
      const hasShownPrompt = sessionStorage.getItem("nexa_notif_prompt_shown");
      if (!hasShownPrompt) {
        // Delay slightly for better UX
        const timer = setTimeout(() => {
          setShowNotifPrompt(true);
          sessionStorage.setItem("nexa_notif_prompt_shown", "true");
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, loading, claimsReady, permission]);

  // Dynamic page title sync based on subdomain and branch context
  useEffect(() => {
    if (store?.name) {
      const currentBranch = store.branches?.find(b => b.id === claims?.branchId);
      if (currentBranch?.name) {
        document.title = `${store.name} (${currentBranch.name})`;
      } else {
        document.title = store.name;
      }
    } else {
      document.title = "Nexa Store OS";
    }
  }, [store, claims]);

  if (loading || !user || !claimsReady) {
    return <NexaCoreLoader />;
  }

  return (
    <StoreAccessGuard>
      <div className="flex h-screen flex-col overflow-hidden bg-background nexa-gradient-mesh">
        <div className="flex flex-1 overflow-hidden relative">
          {/* Subtle background glow */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] pointer-events-none rounded-full" />
          
          <aside className="hidden w-[280px] shrink-0 md:block">
            <Sidebar />
          </aside>
          <div className="flex flex-1 flex-col overflow-hidden md:my-3 md:mr-3 md:rounded-[2rem] md:border md:border-border/50 md:bg-card/80 md:backdrop-blur-xl md:shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            {/* Admin Audit Banner */}
            {isSystemAdmin && store && (
              <div className="flex h-8 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                <ShieldCheck className="h-3 w-3" />
                Platform Admin Mode — Full Operational Oversight Enabled
              </div>
            )}
            <Header />
            <main className={cn(
              "flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8",
              isSystemAdmin && store ? "md:rounded-none" : "md:rounded-b-[2rem]"
            )}>
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname} routeKey={location.pathname}>
                  <Outlet />
                </PageTransition>
              </AnimatePresence>
            </main>
          </div>
        </div>
        <BottomNav />
        <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
        <NotificationPermissionPrompt open={showNotifPrompt} onOpenChange={setShowNotifPrompt} />
      </div>
    </StoreAccessGuard>
  );
}
