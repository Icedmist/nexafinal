import { StoreAccessGuard } from "@/components/shared/StoreAccessGuard";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

// ... (DynamicTitle removed - component not found)

export function RootLayout() {
  return (
    <FirebaseAuthProvider>
      <TenantProvider>
        <BusinessProvider>
          <RoleProvider>
            <StoreAccessGuard>
              {/* DynamicTitle component removed - not implemented */}
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
