import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { FirebaseAuthProvider } from './contexts/FirebaseAuthContext';
import { BusinessProvider } from './contexts/BusinessContext';
import { TenantProvider } from './contexts/TenantContext';
import { RoleProvider } from './contexts/RoleContext';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');

async function cleanupStaleServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const staleRegistrations = registrations.filter((registration) =>
    registration.active?.scriptURL.includes('/sw.js')
  );

  if (!staleRegistrations.length) return;

  await Promise.all(staleRegistrations.map((registration) => registration.unregister()));

  // Force reload once so the page loads without stale cached HTML.
  window.location.reload();
}

cleanupStaleServiceWorkers().catch((err) => {
  console.warn('Failed to cleanup service worker:', err);
});

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <FirebaseAuthProvider>
        <BusinessProvider>
          <TenantProvider>
            <RoleProvider>
              <App />
            </RoleProvider>
          </TenantProvider>
        </BusinessProvider>
      </FirebaseAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
