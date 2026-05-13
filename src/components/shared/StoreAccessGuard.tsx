import React from "react";
import { useRole } from "@/hooks/useRole";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/FirebaseAuthContext";

export const StoreAccessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isStoreMismatch } = useRole();
  const { logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Verifying store access...</p>
        </div>
      </div>
    );
  }

  if (isStoreMismatch) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
            <p className="text-muted-foreground">
              Your account is not authorized to access this store. This could happen if you're trying to log in via a different store's unique URL.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Return to Homepage
            </Button>
            <Button variant="destructive" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout & Switch Account
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If you believe this is an error, please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
