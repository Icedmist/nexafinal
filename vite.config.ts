import path from "path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
  ],
});
