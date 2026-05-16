import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

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
const SettingsPage = lazy(() => import('./routes/app.settings'));
const StaffPage = lazy(() => import('./routes/app.staff'));
const SuppliersPage = lazy(() => import('./routes/app.suppliers'));
const OnboardingPage = lazy(() => import('./routes/onboarding'));
const ScanPage = lazy(() => import('./routes/scan.$id'));
const SiteMapPage = lazy(() => import('./routes/sitemap'));

// System Admin Pages
const SystemAdminLayout = lazy(() => import('./layouts/SystemAdminLayout').then(m => ({ default: m.SystemAdminLayout })));
const SystemDashboardPage = lazy(() => import('./routes/system-admin.dashboard'));
const SystemBusinessesPage = lazy(() => import('./routes/system-admin.businesses'));
const SystemUsersPage = lazy(() => import('./routes/system-admin.users'));
const SystemHealthPage = lazy(() => import('./routes/system-admin.health'));
const SystemSettingsPage = lazy(() => import('./routes/system-admin.settings'));
const SystemAuditPage = lazy(() => import('./routes/system-admin.audit'));


import { NexaCoreLoader } from './components/shared/NexaCoreLoader';
import { LogoutOverlay } from './components/shared/LogoutOverlay';

const Loading = () => (
  <div className="flex h-screen items-center justify-center bg-background p-6">
    <NexaCoreLoader />
  </div>
);

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
      <LogoutOverlay />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<RootLayout />}>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            
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
              <Route path="settings" element={<SettingsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* System Admin Routes (Platform Oversight) */}
            <Route path="/system-admin" element={<SystemAdminLayout />}>
              <Route path="dashboard" element={<SystemDashboardPage />} />
              <Route path="businesses" element={<SystemBusinessesPage />} />
              <Route path="users" element={<SystemUsersPage />} />
              <Route path="health" element={<SystemHealthPage />} />
              <Route path="settings" element={<SystemSettingsPage />} />
              <Route path="audit" element={<SystemAuditPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Other Routes */}
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/scan/:id" element={<ScanPage />} />
            <Route path="/sitemap" element={<SiteMapPage />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </QueryClientProvider>
  );
}

export default App;
