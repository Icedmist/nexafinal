import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";

export interface CourseModule {
  id: string;
  title: string;
  category: "pitch" | "onboarding" | "features" | "objections" | "tour" | "Flyers" | "Legal" | "Hardware" | "Pitch Decks" | "Cheatsheets";
  resourceType?: "video" | "flyer" | "contract" | "hardware" | "pitch" | "cheatsheet" | "deck" | "tour";
  published?: boolean;
  description: string;
  duration?: string;
  fileType?: "PDF" | "PNG" | "PPTX" | "DOCX" | "ZIP";
  fileSize?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  pitchScript?: string;
  tourGuidePdfTitle?: string;
  tourGuideContent?: string;
  shareableTourSlug?: string;
  updatedAt: string;
  viewCount?: number;
  playCount?: number;
  shareCount?: number;
  downloadsCount?: number;
  featured?: boolean;
}

export interface ResourceAnalytics {
  totalModules: number;
  publishedModules: number;
  totalViews: number;
  totalVideoPlays: number;
  totalTourShares: number;
  totalDownloads: number;
  activeDemoPasses: number;
  lastUpdated: string;
}

export const INITIAL_COURSE_MODULES: CourseModule[] = [
  {
    id: "mod-01",
    title: "2-Minute High-Converting POS & Inventory Pitch",
    category: "pitch",
    resourceType: "pitch",
    published: true,
    description: "Master the quick 120-second elevator pitch to convince pharmacy, supermarket, and retail owners to adopt NexaStoreOS.",
    duration: "4 mins",
    fileType: "PDF",
    fileSize: "1.2 MB",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pitchScript: "Hello [Owner Name], NexaStoreOS gives you 100% control over stock theft, expiry dates, and daily cashier sales right from your phone. You can scan barcodes, print receipts, and issue instant WhatsApp invoices in seconds.",
    tourGuidePdfTitle: "NexaStoreOS Executive Sales Pitch Deck.pdf",
    tourGuideContent: `
=== NEXASTOREOS MERCHANT PITCH & TOUR GUIDE ===
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
    downloadsCount: 120,
    featured: true,
  },
  {
    id: "mod-02",
    title: "Setting Up Multi-Branch Store & AI Barcode Scanner",
    category: "onboarding",
    resourceType: "video",
    published: true,
    description: "Step-by-step walkthrough on adding products, bulk Excel import, AI barcode scanning, and multi-location setup.",
    duration: "8 mins",
    fileType: "PDF",
    fileSize: "2.4 MB",
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
    downloadsCount: 76,
    featured: true,
  },
  {
    id: "mod-03",
    title: "Handling Top 5 Merchant Objections (Price, Internet & Training)",
    category: "objections",
    resourceType: "cheatsheet",
    published: true,
    description: "How to handle internet offline concerns, pricing objections, staff training reluctance, and hardware compatibility.",
    duration: "6 mins",
    fileType: "DOCX",
    fileSize: "850 KB",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pitchScript: "Objection: 'What if internet goes down?' Answer: 'NexaStoreOS operates offline! All sales are saved locally and auto-sync as soon as connection restores.'",
    tourGuidePdfTitle: "Objection Handling & Battle Card Cheat Sheet.pdf",
    tourGuideContent: `
=== OBJECTION HANDLING BATTLE CARD ===
Q: "Is it expensive?"
A: NexaStoreOS pays for itself by detecting 1 expired batch or stopping 1 till discrepancy per month.

Q: "Does it support my existing thermal printer?"
A: Yes! Works with ESC/POS bluetooth, USB thermal printers, and standard desktop printers.
`,
    shareableTourSlug: "objections-battle-card",
    updatedAt: "2026-07-23",
    viewCount: 175,
    playCount: 112,
    shareCount: 81,
    downloadsCount: 195,
    featured: true,
  },
  {
    id: "mod-04",
    title: "Super Admin & Multi-Store HQ Analytics Walkthrough",
    category: "tour",
    resourceType: "tour",
    published: true,
    description: "Comprehensive guide for chain store owners wanting real-time valuation, staff activity tracking, and profit margins.",
    duration: "10 mins",
    fileType: "PDF",
    fileSize: "3.1 MB",
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
    downloadsCount: 140,
    featured: true,
  },
  {
    id: "res-001",
    title: "NexaStoreOS Retail Flyer & Value Proposition (A4)",
    category: "Flyers",
    resourceType: "flyer",
    published: true,
    description: "Print-ready high resolution marketing flyer for physical shop visits. Highlights multi-store stock, offline POS, and instant receipt generation.",
    duration: "Print A4",
    fileType: "PDF",
    fileSize: "2.4 MB",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pitchScript: "Print and leave this high-impact A4 flyer with pharmacy & retail owners during field visits.",
    tourGuidePdfTitle: "NexaStoreOS Retail Value Flyer A4.pdf",
    tourGuideContent: `
NexaStoreOS Retail Value Sheet:
- Eliminate Stock Theft & Mismatches
- Full Offline Sales Mode (No Internet Needed)
- WhatsApp Electronic Receipts & Thermal Printing
- Multi-Staff Permission Control
`,
    updatedAt: "2026-07-25",
    viewCount: 342,
    playCount: 45,
    shareCount: 110,
    downloadsCount: 342,
    featured: true,
  },
  {
    id: "res-002",
    title: "Standard Merchant Onboarding Contract & Terms",
    category: "Legal",
    resourceType: "contract",
    published: true,
    description: "Official legal agreement form for merchant store onboarding. Defines service SLA, agent support duties, and subscription billing.",
    duration: "Legal Form",
    fileType: "PDF",
    fileSize: "850 KB",
    videoUrl: "",
    pitchScript: "Hand this official service SLA contract to store managers upon completing software installation.",
    tourGuidePdfTitle: "NexaStoreOS Merchant SLA Agreement.pdf",
    tourGuideContent: `
NEXA STORE OS - MERCHANT SERVICE AGREEMENT
This agreement confirms the registration of Merchant Store under NexaStoreOS software platform managed by Authorized Field Agent.
`,
    updatedAt: "2026-07-20",
    viewCount: 189,
    playCount: 12,
    shareCount: 40,
    downloadsCount: 189,
    featured: true,
  },
  {
    id: "res-003",
    title: "Recommended Hardware & Bluetooth Scanner Specs",
    category: "Hardware",
    resourceType: "hardware",
    published: true,
    description: "Technical hardware specification guide detailing compatible 58mm/80mm thermal printers, Android POS terminals, and Bluetooth barcode scanners.",
    duration: "Tech Spec",
    fileType: "PDF",
    fileSize: "1.8 MB",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pitchScript: "Shows merchants exact compatible ESC/POS printers and USB/Bluetooth barcode scanners.",
    tourGuidePdfTitle: "Hardware Setup Guide.pdf",
    tourGuideContent: `
COMPATIBLE POS HARDWARE SPECIFICATIONS:
1. Thermal Printers: ESC/POS 58mm USB/Bluetooth (MunByn, Sunmi V2)
2. Barcode Scanners: 1D/2D Handheld CCD Scanners
3. Tablets: Android 10+ with 3GB RAM min.
`,
    updatedAt: "2026-07-22",
    viewCount: 215,
    playCount: 88,
    shareCount: 62,
    downloadsCount: 215,
    featured: false,
  }
];

const STORAGE_KEY = "stackwise_course_modules_v2";

export function getCourseModules(): CourseModule[] {
  if (typeof window === "undefined") return INITIAL_COURSE_MODULES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_COURSE_MODULES));
      return INITIAL_COURSE_MODULES;
    }
    const parsed: CourseModule[] = JSON.parse(raw);
    return parsed.map((m) => ({ ...m, published: m.published ?? true }));
  } catch (err) {
    console.error("Failed to load course modules:", err);
    return INITIAL_COURSE_MODULES;
  }
}

export function saveCourseModules(modules: CourseModule[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    window.dispatchEvent(new Event("stackwise_course_modules_updated"));
  } catch (err) {
    console.error("Failed to save course modules:", err);
  }
}

export async function saveModuleToFirestoreAndLocal(module: CourseModule): Promise<void> {
  const current = getCourseModules();
  const existingIdx = current.findIndex((m) => m.id === module.id);
  let updated: CourseModule[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = module;
  } else {
    updated = [module, ...current];
  }

  saveCourseModules(updated);

  try {
    const docRef = doc(db, "agent_resources", module.id);
    await setDoc(docRef, module, { merge: true });
  } catch (err) {
    console.warn("Firestore resource sync warning (saved locally):", err);
  }
}

export async function deleteModuleFromFirestoreAndLocal(id: string): Promise<void> {
  const current = getCourseModules();
  const updated = current.filter((m) => m.id !== id);
  saveCourseModules(updated);

  try {
    const docRef = doc(db, "agent_resources", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore resource delete warning (deleted locally):", err);
  }
}

export function initFirestoreResourceSync(): () => void {
  if (typeof window === "undefined") return () => {};

  try {
    const unsub = onSnapshot(
      collection(db, "agent_resources"),
      (snap) => {
        if (!snap.empty) {
          const remoteModules: CourseModule[] = [];
          snap.forEach((docSnap) => {
            if (docSnap.exists()) {
              remoteModules.push({ id: docSnap.id, ...docSnap.data() } as CourseModule);
            }
          });
          if (remoteModules.length > 0) {
            saveCourseModules(remoteModules);
          }
        } else {
          INITIAL_COURSE_MODULES.forEach(async (mod) => {
            try {
              await setDoc(doc(db, "agent_resources", mod.id), mod);
            } catch (e) {
              // Ignore fallback seed error
            }
          });
        }
      },
      (err) => {
        console.warn("Agent resources snapshot fallback operating mode:", err);
      }
    );
    return unsub;
  } catch (e) {
    return () => {};
  }
}

export function trackResourceEvent(
  moduleId: string,
  eventType: "view" | "play_video" | "share_tour" | "download"
): void {
  const modules = getCourseModules();
  let updatedModule: CourseModule | null = null;

  const updated = modules.map((mod) => {
    if (mod.id === moduleId) {
      updatedModule = {
        ...mod,
        viewCount: (mod.viewCount || 0) + (eventType === "view" ? 1 : 0),
        playCount: (mod.playCount || 0) + (eventType === "play_video" ? 1 : 0),
        shareCount: (mod.shareCount || 0) + (eventType === "share_tour" ? 1 : 0),
        downloadsCount: (mod.downloadsCount || 0) + (eventType === "download" ? 1 : 0),
      };
      return updatedModule;
    }
    return mod;
  });

  saveCourseModules(updated);

  if (updatedModule) {
    try {
      const docRef = doc(db, "agent_resources", moduleId);
      setDoc(docRef, updatedModule, { merge: true }).catch(() => {});
    } catch (e) {
      // Non-blocking
    }
  }
}

export function getCourseResourceAnalytics(): ResourceAnalytics {
  const modules = getCourseModules();
  const publishedModules = modules.filter((m) => m.published ?? true).length;
  const totalViews = modules.reduce((sum, m) => sum + (m.viewCount || 0), 0);
  const totalVideoPlays = modules.reduce((sum, m) => sum + (m.playCount || 0), 0);
  const totalTourShares = modules.reduce((sum, m) => sum + (m.shareCount || 0), 0);
  const totalDownloads = modules.reduce((sum, m) => sum + (m.downloadsCount || 0), 0);

  return {
    totalModules: modules.length,
    publishedModules,
    totalViews,
    totalVideoPlays,
    totalTourShares,
    totalDownloads,
    activeDemoPasses: 18,
    lastUpdated: new Date().toISOString(),
  };
}
