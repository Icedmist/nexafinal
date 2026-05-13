import { StoreAccessGuard } from "@/components/shared/StoreAccessGuard";

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
