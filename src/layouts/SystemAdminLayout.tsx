import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { SystemAdminSidebar } from "@/components/system-admin/SystemAdminSidebar";
import { PageTransition } from "@/components/shared/PageTransition";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { canAccessRoute } from "@/lib/route-guard";

export function SystemAdminLayout() {
  const { user, loading } = useAuth();
  const { role, isSystemAdmin } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Role-based route guard
  useEffect(() => {
    if (!loading && user) {
      if (!isSystemAdmin) {
        toast.error("Access Denied: System Admin privileges required.");
        navigate("/app/dashboard");
        return;
      }

      if (!canAccessRoute(location.pathname, role)) {
        toast.error("You don't have permission to access that platform module.");
        navigate("/system-admin/dashboard");
      }
    }
  }, [location.pathname, role, navigate, user, loading, isSystemAdmin]);

  // Auth guard — redirect to landing if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/login");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-100">
      <aside className="hidden w-[280px] shrink-0 md:block">
        <SystemAdminSidebar />
      </aside>
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header (Simplified) */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6 md:hidden">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white">N</div>
             <span className="font-bold text-white">NEXA ADMIN</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-900">
          <div className="mx-auto max-w-7xl p-6 md:p-10">
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname} routeKey={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
