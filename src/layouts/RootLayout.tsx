import { StoreAccessGuard } from "@/components/shared/StoreAccessGuard";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";

// ... (DynamicTitle remains same)

export function RootLayout() {
  return (
    <FirebaseAuthProvider>
      <TenantProvider>
        <BusinessProvider>
          <RoleProvider>
            <StoreAccessGuard>
              <DynamicTitle />
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
