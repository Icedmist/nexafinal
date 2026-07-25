import { StoreAccessGuard } from "@/components/shared/StoreAccessGuard";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";

function SubdomainRedirect() {
  const { store } = useTenant();
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect on the root path when on a subdomain and not logged in
    if (store && !user && !loading && location.pathname === "/") {
      navigate("/auth/login", { replace: true });
    }
  }, [store, user, loading, location.pathname, navigate]);

  return null;
}

export function RootLayout() {
  return (
    <FirebaseAuthProvider>
      <TenantProvider>
        <BusinessProvider>
          <RoleProvider>
            <StoreAccessGuard>
              <SubdomainRedirect />
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </StoreAccessGuard>
            <Toaster position="bottom-right" richColors />
          </RoleProvider>
        </BusinessProvider>
      </TenantProvider>
    </FirebaseAuthProvider>
  );
}
