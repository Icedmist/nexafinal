export interface CourseModule {
  id: string;
  title: string;
  category: "pitch" | "onboarding" | "features" | "objections" | "tour";
  description: string;
  duration: string;
  videoUrl: string; // YouTube, Loom, Vimeo or MP4 link
  thumbnailUrl?: string;
  pitchScript?: string;
  tourGuidePdfTitle?: string;
  tourGuideContent?: string; // Rich textual/HTML tour guide content rendered inside protected canvas
  shareableTourSlug?: string;
  updatedAt: string;
  viewCount?: number;
  playCount?: number;
  shareCount?: number;
}

export interface ResourceAnalytics {
  totalModules: number;
  totalViews: number;
  totalVideoPlays: number;
  totalTourShares: number;
  activeDemoPasses: number;
  lastUpdated: string;
}

export const INITIAL_COURSE_MODULES: CourseModule[] = [
  {
    id: "mod-01",
    title: "2-Minute High-Converting POS & Inventory Pitch",
    category: "pitch",
    description: "Master the quick 120-second elevator pitch to convince pharmacy, supermarket, and retail owners to adopt Stackwise.",
    duration: "4 mins",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pitchScript: "Hello [Owner Name], Stackwise gives you 100% control over stock theft, expiry dates, and daily cashier sales right from your phone. You can scan barcodes, print receipts, and issue instant WhatsApp invoices in seconds.",
    tourGuidePdfTitle: "Stackwise Executive Sales Pitch Deck.pdf",
    tourGuideContent: `
=== STACKWISE MERCHANT PITCH & TOUR GUIDE ===
1. INSTANT POS TERMINAL
- Barcode scanner integration (Camera & USB)
- Offline-first checkout with dual receipt printing (Thermal & PDF)
- Multi-currency & Naira (NGN) support

2. EXPIRY & STOCK THEFT ALERTS
- Automatic SMS & In-app alerts 30 days before drugs/items expire
- Cashier shift reconciliation to prevent till leakages

3. WHATSAPP & EMAIL RECEIPTING
- One-tap WhatsApp receipt dispatch directly to customer phone numbers
`,
    shareableTourSlug: "executive-pitch-deck",
    updatedAt: "2026-07-23",
    viewCount: 142,
    playCount: 89,
    shareCount: 54,
  },
  {
    id: "mod-02",
    title: "Setting Up Multi-Branch Store & AI Barcode Scanner",
    category: "onboarding",
    description: "Step-by-step walkthrough on adding products, bulk Excel import, AI barcode scanning, and multi-location setup.",
    duration: "8 mins",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pitchScript: "Watch how easy it is to import 500 inventory items in 1 minute using our AI auto-categorizer and bulk importer.",
    tourGuidePdfTitle: "Store Onboarding & Inventory Setup Manual.pdf",
    tourGuideContent: `
=== STORE ONBOARDING & SETUP GUIDE ===
Step 1: Go to Inventory -> Add Item or Bulk Excel Upload.
Step 2: Scan any product barcode using your phone camera.
Step 3: Assign low stock thresholds and reorder points.
Step 4: Grant cashier or manager permissions under User Management.
`,
    shareableTourSlug: "store-onboarding-guide",
    updatedAt: "2026-07-23",
    viewCount: 98,
    playCount: 65,
    shareCount: 38,
  },
  {
    id: "mod-03",
    title: "Handling Top 5 Merchant Objections (Price, Internet & Training)",
    category: "objections",
    description: "How to handle internet offline concerns, pricing objections, staff training reluctance, and hardware compatibility.",
    duration: "6 mins",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pitchScript: "Objection: 'What if internet goes down?' Answer: 'Stackwise operates offline! All sales are saved locally and auto-sync as soon as connection restores.'",
    tourGuidePdfTitle: "Objection Handling & Battle Card Cheat Sheet.pdf",
    tourGuideContent: `
=== OBJECTION HANDLING BATTLE CARD ===
Q: "Is it expensive?"
A: Stackwise pays for itself by detecting 1 expired batch or stopping 1 till discrepancy per month.

Q: "Does it support my existing thermal printer?"
A: Yes! Works with ESC/POS bluetooth, USB thermal printers, and standard desktop printers.
`,
    shareableTourSlug: "objections-battle-card",
    updatedAt: "2026-07-23",
    viewCount: 175,
    playCount: 112,
    shareCount: 81,
  },
  {
    id: "mod-04",
    title: "Super Admin & Multi-Store HQ Analytics Walkthrough",
    category: "tour",
    description: "Comprehensive guide for chain store owners wanting real-time valuation, staff activity tracking, and profit margins.",
    duration: "10 mins",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pitchScript: "Demonstrate how the Super Admin console allows business owners to manage 10+ branches from anywhere in the world.",
    tourGuidePdfTitle: "Multi-Store HQ Analytics Tour.pdf",
    tourGuideContent: `
=== HQ MULTI-STORE MANAGEMENT TOUR ===
1. Live Branch Valuations & Combined Sales
2. Remote Price & Inventory Updates across all branches
3. Real-time Audit Logs & Staff Activity Tracking
`,
    shareableTourSlug: "hq-analytics-tour",
    updatedAt: "2026-07-23",
    viewCount: 210,
    playCount: 143,
    shareCount: 96,
  },
];

const STORAGE_KEY = "stackwise_course_modules_v2";

/**
 * Retrieve active course modules (persistent with fallback)
 */
export function getCourseModules(): CourseModule[] {
  if (typeof window === "undefined") return INITIAL_COURSE_MODULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_COURSE_MODULES));
      return INITIAL_COURSE_MODULES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load course modules:", err);
    return INITIAL_COURSE_MODULES;
  }
}

/**
 * Persist updated course modules & emit sync event
 */
export function saveCourseModules(modules: CourseModule[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    window.dispatchEvent(new Event("stackwise_course_modules_updated"));
  } catch (err) {
    console.error("Failed to save course modules:", err);
  }
}

/**
 * Track an engagement event on a module (view, play_video, share_tour)
 */
export function trackResourceEvent(moduleId: string, eventType: "view" | "play_video" | "share_tour"): void {
  const modules = getCourseModules();
  const updated = modules.map((mod) => {
    if (mod.id === moduleId) {
      return {
        ...mod,
        viewCount: (mod.viewCount || 0) + (eventType === "view" ? 1 : 0),
        playCount: (mod.playCount || 0) + (eventType === "play_video" ? 1 : 0),
        shareCount: (mod.shareCount || 0) + (eventType === "share_tour" ? 1 : 0),
      };
    }
    return mod;
  });
  saveCourseModules(updated);
}

/**
 * Get aggregated tracking analytics for Super Admin
 */
export function getCourseResourceAnalytics(): ResourceAnalytics {
  const modules = getCourseModules();
  const totalViews = modules.reduce((sum, m) => sum + (m.viewCount || 0), 0);
  const totalVideoPlays = modules.reduce((sum, m) => sum + (m.playCount || 0), 0);
  const totalTourShares = modules.reduce((sum, m) => sum + (m.shareCount || 0), 0);

  return {
    totalModules: modules.length,
    totalViews,
    totalVideoPlays,
    totalTourShares,
    activeDemoPasses: 18, // Active device passes tracked in field
    lastUpdated: new Date().toISOString(),
  };
}
