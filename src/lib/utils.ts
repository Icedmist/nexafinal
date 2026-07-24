import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractItemIdentifier(code: string): string {
  const trimmed = code.trim();
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const pathname = url.pathname;
      const match = pathname.match(/\/scan\/([^/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Fallback if URL parsing fails
  }

  const scanMatch = trimmed.match(/\/scan\/([^/]+)/);
  if (scanMatch && scanMatch[1]) {
    return scanMatch[1];
  }

  return trimmed;
}

export function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
}

export function slugify(text?: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function getCleanStoreSlug(slug?: string, storeName?: string): string {
  if (slug && slug.trim() && slug !== "general" && slug !== "sample-store") {
    const s = slugify(slug);
    if (s && s !== "general") return s;
  }
  if (storeName && storeName.trim()) {
    const slugifiedName = slugify(storeName);
    if (slugifiedName && slugifiedName !== "general") return slugifiedName;
  }
  return "nexa-store";
}

export function getPublicUrl(url?: string): string {
  const origin = url || window.location.origin;
  if (origin.includes("ais-dev-")) {
    return origin.replace("ais-dev-", "ais-pre-");
  }
  return origin;
}

export function getStorefrontUrl(
  storeSlug: string,
  path: string = "",
  queryParams?: Record<string, string | null | undefined>
): string {
  const origin = window.location.origin;
  const cleanSlug = getCleanStoreSlug(storeSlug);
  const useSubdomains = import.meta.env.VITE_USE_SUBDOMAINS === "true";

  let base = "";
  if (useSubdomains) {
    const productionDomain = import.meta.env.VITE_STORE_DOMAIN || "nexastoreos.com";
    const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    base = `https://${cleanSlug}.${productionDomain}${cleanPath}`;
  } else {
    const publicOrigin = getPublicUrl(origin);
    const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    
    if (cleanPath.startsWith("/product/") || cleanPath.startsWith("product/")) {
      const productId = cleanPath.replace(/^\/?product\//, "");
      base = `${publicOrigin}/store/product/${productId}`;
    } else if (cleanPath.startsWith("/store/")) {
      base = `${publicOrigin}${cleanPath}`;
    } else {
      base = `${publicOrigin}/store/${cleanSlug}${cleanPath}`;
    }
  }

  if (queryParams) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val != null) params.set(key, val);
    });
    const qs = params.toString();
    if (qs) base += `?${qs}`;
  }
  return base;
}


