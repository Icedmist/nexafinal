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


