import { Navigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useDemo } from "@/hooks/useDemo";

/**
 * Restricts a route to system admins only. Used for pages that were removed
 * from the merchant navigation (agent portal, sitemap, etc.) but remain
 * accessible to platform administrators.
 */
export function SystemAdminOnly({ children }: { children: React.ReactNode }) {
  const { isSystemAdmin, loading: roleLoading } = useRole();
  const { user, loading: authLoading, claimsReady } = useAuth();
  const { isDemo } = useDemo();

  if (authLoading || roleLoading || (user && !claimsReady)) return null;
  if (!user && !isDemo) return <Navigate to="/auth/login" replace />;
  if (!isSystemAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
