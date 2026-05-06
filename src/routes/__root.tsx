import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { RoleProvider } from "@/contexts/RoleContext";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import { BusinessProvider, useBusiness } from "@/contexts/BusinessContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NEXA TECHNOLOGIES — Store OS" },
      { name: "description", content: "The unified OS for modern retail. Track inventory, manage global suppliers, and forecast demand." },
      { name: "author", content: "NEXA TECHNOLOGIES" },
      { property: "og:title", content: "NEXA TECHNOLOGIES" },
      { property: "og:description", content: "The unified OS for modern retail. Track inventory, manage global suppliers, and forecast demand." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NEXA TECHNOLOGIES" },
      { name: "twitter:description", content: "The unified OS for modern retail. Track inventory, manage global suppliers, and forecast demand." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function DynamicTitle() {
  const { profile } = useBusiness();
  
  useEffect(() => {
    const storeName = profile?.storeDetails?.name;
    const isSubdomain = typeof window !== 'undefined' && window.location.hostname.split('.').length >= 3;

    if (storeName) {
      document.title = `${storeName} | Nexa Store OS`;
    } else {
      document.title = "NEXA Store OS — Unified Retail Intelligence";
    }
    
    // Update favicon if store branding has a logo
    const brandingLogo = profile?.branding?.logo;
    if (brandingLogo) {
      const updateLink = (rel: string, href: string, sizes?: string) => {
        // Find existing link by rel and sizes (if provided), or create one
        const selector = sizes ? `link[rel='${rel}'][sizes='${sizes}']` : `link[rel='${rel}']`;
        let link = document.querySelector(selector) as HTMLLinkElement;
        
        // Fallback for rel="icon" vs rel="shortcut icon" or tags without sizes
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
        
        // Remove type if it's not SVG
        if (href.endsWith('.svg')) {
          link.type = 'image/svg+xml';
        } else {
          link.removeAttribute('type');
        }
      };

      // Set multiple sizes to ensure the browser picks the best/largest one
      updateLink('icon', brandingLogo, '32x32');
      updateLink('icon', brandingLogo, '192x192'); // High-res / Android
      updateLink('apple-touch-icon', brandingLogo, '180x180');
      updateLink('shortcut icon', brandingLogo);
    }
  }, [profile]);

  return null;
}

function RootComponent() {
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
