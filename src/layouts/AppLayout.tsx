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

export function AppLayout() {
  const auth = useAuth();
  const { user, loading, claims, claimsReady } = auth;
  const { profile, needsOnboarding, loadingProfile } = useBusiness();
  const { store } = useTenant();
  const { role, isSystemAdmin } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts({ onHelpOpen: () => setHelpOpen(true) });

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

    if (user && claimsReady && !loadingProfile && shouldCheckPermissions) {
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
  }, [location.pathname, role, navigate, user, claimsReady, loadingProfile, needsOnboarding, isSystemAdmin]);


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

  if (loading || !user || !claimsReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <NexaCoreLoader />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[260px] shrink-0 md:block">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden md:my-2 md:mr-2 md:rounded-2xl md:border md:border-border md:bg-card md:shadow-sm">
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
            isSystemAdmin && store ? "md:rounded-none" : "md:rounded-b-2xl"
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
    </div>
  );
}
