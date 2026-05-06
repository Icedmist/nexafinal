import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useRole } from "@/hooks/useRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { CustomFieldManager } from "@/components/settings/CustomFieldManager";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { ReorderDefaults } from "@/components/settings/ReorderDefaults";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { StoreSettings } from "@/components/settings/StoreSettings";
import { CustomerDirectory } from "@/components/settings/CustomerDirectory";
import { StoreBranding } from "@/components/settings/StoreBranding";
import { SmartFeatures } from "@/components/settings/SmartFeatures";
import { UserProfile } from "@/components/settings/UserProfile";
import { TourLauncher } from "@/components/settings/TourLauncher";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — NEXA Store OS" }] }),
});

function SettingsPage() {
  const { can } = usePermissions();
  const { isAdmin, isManager, isStaff } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!can("access_settings")) {
      toast.error("Access denied");
      navigate({ to: "/app/dashboard" });
    }
  }, [can, navigate]);

  if (!can("access_settings")) return null;

  const tabs = [
    { value: "profile", label: "Profile", visible: true, component: <UserProfile /> },
    { value: "store", label: "Store", visible: isAdmin, component: <StoreSettings /> },
    { value: "branding", label: "Branding", visible: isAdmin, component: <StoreBranding /> },
    { value: "customers", label: "Customers", visible: isAdmin || isManager, component: <CustomerDirectory /> },
    { value: "categories", label: "Categories", visible: isAdmin || isManager, component: <CategoryManager /> },
    { value: "custom-fields", label: "Custom Fields", visible: isAdmin, component: <CustomFieldManager /> },
    { value: "locations", label: "Locations", visible: isAdmin || isManager, component: <LocationSettings /> },
    { value: "reorder-defaults", label: "Reorder", visible: isAdmin || isManager, component: <ReorderDefaults /> },
    { value: "smart", label: "Smart Features", visible: isAdmin, component: <SmartFeatures /> },
    { value: "users", label: "Staff", visible: isAdmin || isManager, component: <UserManagement /> },
    { value: "help", label: "Help", visible: true, component: <TourLauncher /> },
    { value: "system", label: "System", visible: isAdmin, component: <SystemSettings /> },
  ].filter((t) => t.visible);

  const defaultValue = isAdmin ? "store" : "profile";

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration and management</p>
      </div>

      <Tabs defaultValue={defaultValue} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <ErrorBoundary>{tab.component}</ErrorBoundary>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
