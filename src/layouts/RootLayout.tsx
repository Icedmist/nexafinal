import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { RoleProvider } from "@/contexts/RoleContext";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import { BusinessProvider, useBusiness } from "@/contexts/BusinessContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

function DynamicTitle() {
  const { profile } = useBusiness();
  
  useEffect(() => {
    const storeName = profile?.storeDetails?.name;

    if (storeName) {
      document.title = `${storeName} | Nexa Store OS`;
    } else {
      document.title = "NEXA Store OS — Unified Retail Intelligence";
    }
    
    const brandingLogo = profile?.branding?.logo;
    if (brandingLogo) {
      const updateLink = (rel: string, href: string, sizes?: string) => {
        const selector = sizes ? `link[rel='${rel}'][sizes='${sizes}']` : `link[rel='${rel}']`;
        let link = document.querySelector(selector) as HTMLLinkElement;
        
        if (!link && rel === 'icon') {
          link = document.querySelector(`link[rel~='icon']:not([sizes])`) as HTMLLinkElement;
        }

        if (!link) {
          link = document.createElement('link');
          link.rel = rel;
          if (sizes) link.setAttribute('sizes', sizes);
          document.head.appendChild(link);
        }
        
        link.href = href;
        
        if (href.endsWith('.svg')) {
          link.type = 'image/svg+xml';
        } else {
          link.removeAttribute('type');
        }
      };

      updateLink('icon', brandingLogo, '32x32');
      updateLink('icon', brandingLogo, '192x192');
      updateLink('apple-touch-icon', brandingLogo, '180x180');
      updateLink('shortcut icon', brandingLogo);
    }
  }, [profile]);

  return null;
}

export function RootLayout() {
  return (
    <FirebaseAuthProvider>
      <TenantProvider>
        <BusinessProvider>
          <DynamicTitle />
          <RoleProvider>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
            <Toaster position="bottom-right" richColors />
          </RoleProvider>
        </BusinessProvider>
      </TenantProvider>
    </FirebaseAuthProvider>
  );
}
