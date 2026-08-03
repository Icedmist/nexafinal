import path from "path";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// ---------------------------------------------------------------------------
// Service worker generation
//
// A PWA-style service worker is emitted at build time. It precaches only the
// JavaScript/CSS chunks required by the enabled routes (dashboard, sales,
// catalog, forms, store-credits) plus their shared dependencies. Offline
// navigation is limited to those pages — every other route is served a
// "not available offline" response when the network is down.
// ---------------------------------------------------------------------------
const ENABLED_ROUTE_FILES = [
  /src\/routes\/app\.dashboard\.tsx$/,
  /src\/routes\/app\.sales\.tsx$/,
  /src\/routes\/app\.catalog\.tsx$/,
  /src\/routes\/app\.forms\.tsx$/,
  /src\/routes\/app\.store-credits\.tsx$/,
];

const SW_TEMPLATE = `
// Nexa v2 service worker — generated at build time.
const CACHE = "__NEXA_CACHE_VERSION__";
const PRECACHE = __NEXA_PRECACHE__;

const ENABLED_PAGES = new Set(["/app/sales", "/app/dashboard", "/app/catalog", "/app/forms", "/app/store-credits"]);
const NAVIGATION_URL = "/";
const STATIC_RE = /\\.(js|css|woff2?|svg|png|jpe?g|webp|gif|ico|webmanifest)$/;
const STATIC_PREFIXES = ["/assets/"];

async function precacheQuiet(cache) {
  await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => precacheQuiet(cache).then(() => self.skipWaiting()))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
  }
  return response;
}

function notAvailableOffline() {
  return new Response(
    "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Not available offline</title></head>" +
    "<body style='font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0b0b10;color:#f5f5f4'>" +
    "<div style='text-align:center;padding:24px'><h1 style='margin:0 0 8px'>Not available offline</h1>" +
    "<p style='margin:0;color:#a1a1aa'>Only Sales, Dashboard, Catalog, Forms and Store Credits are enabled for offline use.</p></div></body></html>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

async function handleNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(NAVIGATION_URL, copy)).catch(() => {});
    }
    return response;
  } catch {
    if (!ENABLED_PAGES.has(url.pathname)) return notAvailableOffline();
    const cached = await caches.match(NAVIGATION_URL);
    if (cached) return cached;
    return notAvailableOffline();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (
    STATIC_PREFIXES.some((p) => url.pathname.startsWith(p)) ||
    STATIC_RE.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
  }
});
`;

function nexaServiceWorker(): Plugin {
  const cacheVersion = `nexa-v2-${Date.now()}`;
  return {
    name: "nexa-service-worker",
    apply: "build",
    enforce: "post",
    generateBundle(_output, bundle) {
      const chunks = Object.entries(bundle).filter(
        ([, value]) => value.type === "chunk",
      ) as Array<[string, import("rollup").OutputChunk]>;

      const entryChunks = chunks.filter(([, c]) => c.isEntry);
      const routeChunks = chunks.filter(([, c]) =>
        ENABLED_ROUTE_FILES.some((re) => re.test(c.facadeModuleId ?? "")),
      );

      const queue = [...entryChunks, ...routeChunks].map(([name]) => name);
      const needed = new Set<string>();
      while (queue.length) {
        const name = queue.shift()!;
        if (needed.has(name)) continue;
        needed.add(name);
        const entry = bundle[name];
        if (entry?.type === "chunk") {
          for (const imp of entry.imports) queue.push(imp);
        }
      }

      for (const name of needed) {
        const entry = bundle[name];
        if (entry?.type === "chunk" && entry.viteMetadata) {
          const extras = [
            ...(entry.viteMetadata.importedCss ?? []),
            ...(entry.viteMetadata.importedAssets ?? []),
          ];
          for (const asset of extras) {
            if (!needed.has(asset)) needed.add(asset);
          }
        }
      }

      needed.add("index.html");

      const precache = Array.from(needed)
        .filter((file) => !file.endsWith(".map") && file !== "sw.js")
        .map((file) => (file === "index.html" ? "/" : `/${file}`))
        .sort();

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: SW_TEMPLATE.replace("__NEXA_CACHE_VERSION__", cacheVersion).replace(
          "__NEXA_PRECACHE__",
          JSON.stringify(precache, null, 2),
        ),
      });
    },
  };
}

export default defineConfig({
  esbuild: {
    drop: ["console"]
  },
  build: {
    outDir: "dist",
    // Use esbuild for minification to avoid requiring terser as an extra dependency
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          "firebase": ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage", "firebase/functions"],
          "recharts": ["recharts"],
          "pdf": ["jspdf", "html2canvas"],
          "ui": ["@radix-ui/react-accordion", "@radix-ui/react-alert-dialog", "@radix-ui/react-checkbox", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs"],
          "motion": ["framer-motion"],
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "three": ["three", "@react-three/fiber", "@react-three/drei"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
    watch: {
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/functions/**", "**/docs/**", "**/e2e/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    viteReact(),
    nexaServiceWorker(),
  ],
});
