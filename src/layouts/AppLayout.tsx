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

export function AppLayout() {
  const { user, loading } = useAuth();
  const { profile, needsOnboarding, loadingProfile } = useBusiness();
  const { store } = useTenant();
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts({ onHelpOpen: () => setHelpOpen(true) });

  // Domain Access Enforcement: Staff MUST use subdomains, Owners can use main domain.
  useEffect(() => {
    if (user && !loadingProfile && !needsOnboarding && !store) {
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
          // Assume production domain nexa-storeos.vercel.app or similar
          // Extract the main domain parts
          const parts = host.split(".");
          const domain = parts.slice(-2).join("."); // e.g. "nexa.com"
          targetUrl = `${protocol}//${slug}.${domain}${location.pathname}${location.search}`;
        }
        
        toast.info("Redirecting to your store's dedicated domain...");
        window.location.href = targetUrl;
      }
    }
  }, [user, loadingProfile, needsOnboarding, store, role, profile, location]);

  // Role-based route guard
  useEffect(() => {
    if (user && !loadingProfile && !needsOnboarding && !canAccessRoute(location.pathname, role)) {
      toast.error("You don't have permission to access that page.");
      navigate("/app/dashboard");
    }
  }, [location.pathname, role, navigate, user, loadingProfile, needsOnboarding]);

  // Auth guard — redirect to landing if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Onboarding guard — redirect to setup if store is incomplete
  useEffect(() => {
    if (user && !loadingProfile && needsOnboarding) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, needsOnboarding, loadingProfile, navigate]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
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
          <Header />
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8 md:rounded-b-2xl">
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
