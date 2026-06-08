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
