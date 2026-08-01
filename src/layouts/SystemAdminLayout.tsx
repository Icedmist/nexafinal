import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SystemAdminSidebar } from "@/components/system-admin/SystemAdminSidebar";
import { PageTransition } from "@/components/shared/PageTransition";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { canAccessRoute } from "@/lib/route-guard";
import { cn } from "@/lib/utils";

import { Header } from "@/components/layout/Header";

export function SystemAdminLayout() {
  const { user, loading } = useAuth();
  const { role, isSystemAdmin } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("nexa_sidebar_collapsed") === "1";
  });

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

  // Force Dark Mode theme context on administrative dashboard pages & portals
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  // Auth guard — redirect to landing if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth/login");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="dark flex h-screen overflow-hidden bg-slate-900 text-slate-100">
      <aside className={cn(
        "hidden shrink-0 md:block transition-[width] duration-300 ease-in-out overflow-hidden",
        sidebarCollapsed ? "w-[76px]" : "w-[280px]"
      )}>
        <SystemAdminSidebar collapsed={sidebarCollapsed} />
      </aside>
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
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
