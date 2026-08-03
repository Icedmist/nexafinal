import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SystemAdminOnly } from "@/components/shared/SystemAdminOnly";

// Lazy load layouts and pages
const AppLayout = lazy(() => import('./layouts/AppLayout').then(m => ({ default: m.AppLayout })));
const AuthLayout = lazy(() => import('./layouts/AuthLayout').then(m => ({ default: m.AuthLayout })));
const RootLayout = lazy(() => import('./layouts/RootLayout').then(m => ({ default: m.RootLayout })));
const LandingPage = lazy(() => import('./routes/index'));
const LoginPage = lazy(() => import('./routes/auth.login'));
const SignupPage = lazy(() => import('./routes/auth.signup'));
const DashboardPage = lazy(() => import('./routes/app.dashboard'));
const CatalogPage = lazy(() => import('./routes/app.catalog'));
const AnalyticsPage = lazy(() => import('./routes/app.analytics'));
const AIInsightsPage = lazy(() => import('./routes/app.ai-insights'));
const CustomersPage = lazy(() => import('./routes/app.customers'));
const ExpensesPage = lazy(() => import('./routes/app.expenses'));
const HelpPage = lazy(() => import('./routes/app.help'));
const LocationsPage = lazy(() => import('./routes/app.locations'));
const MovementsPage = lazy(() => import('./routes/app.movements'));
const RestockingPage = lazy(() => import('./routes/app.restocking'));
const RequestsPage = lazy(() => import('./routes/app.requests'));
const ReturnsPage = lazy(() => import('./routes/app.returns'));
const SalesAnalyticsPage = lazy(() => import('./routes/app.sales-analytics'));
const SalesHistoryPage = lazy(() => import('./routes/app.sales-history'));
const SalesPage = lazy(() => import('./routes/app.sales'));
const FormsPage = lazy(() => import('./routes/app.forms'));
const SettingsPage = lazy(() => import('./routes/app.settings'));
const StaffPage = lazy(() => import('./routes/app.staff'));
const SuppliersPage = lazy(() => import('./routes/app.suppliers'));
const OnboardingPage = lazy(() => import('./routes/onboarding'));
const ScanPage = lazy(() => import('./routes/scan.$id'));
const SiteMapPage = lazy(() => import('./routes/sitemap'));
const MoniepointPage = lazy(() => import('./routes/app.moniepoint'));
const TermsPage = lazy(() => import('./routes/terms'));
const PrivacyPage = lazy(() => import('./routes/privacy'));
const PublicStorePage = lazy(() => import('./routes/store.$id'));

// New v1 feature pages
const EcommercePage = lazy(() => import('./pages/EcommercePage'));
const AffiliatesPage = lazy(() => import('./pages/AffiliatesPage'));
const TrackerPage = lazy(() => import('./pages/TrackerPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));

// System Admin Pages
const SystemAdminLayout = lazy(() => import('./layouts/SystemAdminLayout').then(m => ({ default: m.SystemAdminLayout })));
const SystemDashboardPage = lazy(() => import('./routes/system-admin.dashboard'));
const SystemBusinessesPage = lazy(() => import('./routes/system-admin.businesses'));
const SystemUsersPage = lazy(() => import('./routes/system-admin.users'));
const SystemHealthPage = lazy(() => import('./routes/system-admin.health'));
const SystemSettingsPage = lazy(() => import('./routes/system-admin.settings'));
const SystemAuditPage = lazy(() => import('./routes/system-admin.audit'));
const SystemDeletedItemsPage = lazy(() => import('./routes/system-admin.deleted-items'));
const SystemAgentsNetworkPage = lazy(() => import('./routes/system-admin.agents-network'));
const SystemSubscriptionsPage = lazy(() => import('./routes/system-admin.subscriptions'));
const SystemRetentionPage = lazy(() => import('./routes/system-admin.retention'));
const SystemSupportPage = lazy(() => import('./routes/system-admin.support'));
const SystemUpdatesPage = lazy(() => import('./routes/system-admin.updates'));
const SystemAgentsAIPage = lazy(() => import('./routes/system-admin.agents'));
const SystemChatsPage = lazy(() => import('./routes/system-admin.chats'));
const SystemDrugLibraryPage = lazy(() => import('./routes/system-admin.drug-library'));
const SystemCategoriesPage = lazy(() => import('./routes/system-admin.categories'));
const SystemAttributionPage = lazy(() => import('./routes/system-admin.attribution'));
const SystemOperationsPage = lazy(() => import('./routes/system-admin.operations'));
const SystemMapPage = lazy(() => import('./routes/system-admin.map'));


import { LogoutOverlay } from './components/shared/LogoutOverlay';
import { DemoProvider } from './contexts/DemoContext';


// Create single QueryClient instance for the entire app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>
      <LogoutOverlay />
      <Suspense fallback={null}>
        <Routes>
          <Route element={<RootLayout />}>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/store/:id" element={<PublicStorePage />} />
            
            {/* Auth Routes */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route index element={<Navigate to="login" replace />} />
            </Route>

            {/* App Routes (Protected) */}
            <Route path="/app" element={<AppLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="ai-insights" element={<AIInsightsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="movements" element={<MovementsPage />} />
              <Route path="restocking" element={<RestockingPage />} />
              <Route path="requests" element={<RequestsPage />} />
              <Route path="returns" element={<ReturnsPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="sales-history" element={<SalesHistoryPage />} />
              <Route path="sales-analytics" element={<SalesAnalyticsPage />} />
              <Route path="forms" element={<FormsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="moniepoint" element={<MoniepointPage />} />
              <Route path="ecommerce" element={<EcommercePage />} />
              <Route path="affiliates" element={<AffiliatesPage />} />
              <Route path="tracker" element={<TrackerPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Agents Route (System Admin Only) */}
            <Route path="/agents" element={<SystemAdminOnly><AgentsPage /></SystemAdminOnly>} />

            {/* System Admin Routes (Platform Oversight) */}
            <Route path="/system-admin" element={<SystemAdminLayout />}>
              <Route path="dashboard" element={<SystemDashboardPage />} />
              <Route path="businesses" element={<SystemBusinessesPage />} />
              <Route path="users" element={<SystemUsersPage />} />
              <Route path="health" element={<SystemHealthPage />} />
              <Route path="settings" element={<SystemSettingsPage />} />
              <Route path="audit" element={<SystemAuditPage />} />
              <Route path="deleted-items" element={<SystemDeletedItemsPage />} />
              <Route path="agents-network" element={<SystemAgentsNetworkPage />} />
              <Route path="subscriptions" element={<SystemSubscriptionsPage />} />
              <Route path="retention" element={<SystemRetentionPage />} />
              <Route path="support" element={<SystemSupportPage />} />
              <Route path="updates" element={<SystemUpdatesPage />} />
              <Route path="agents" element={<SystemAgentsAIPage />} />
              <Route path="chats" element={<SystemChatsPage />} />
              <Route path="drug-library" element={<SystemDrugLibraryPage />} />
              <Route path="categories" element={<SystemCategoriesPage />} />
              <Route path="attribution" element={<SystemAttributionPage />} />
              <Route path="operations" element={<SystemOperationsPage />} />
              <Route path="map" element={<SystemMapPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Other Routes */}
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/scan/:id" element={<ScanPage />} />
            <Route path="/sitemap" element={<SystemAdminOnly><SiteMapPage /></SystemAdminOnly>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
      </DemoProvider>
    </QueryClientProvider>
  );
}

export default App;
