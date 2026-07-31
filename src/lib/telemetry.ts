import { db } from "@/lib/firebase";
import { collection, doc, setDoc, onSnapshot, getDocs } from "firebase/firestore";

export interface DeviceTelemetry {
  id: string;
  userId?: string;
  userEmail?: string;
  storeId?: string;
  storeName?: string;
  deviceType: "mobile" | "tablet" | "desktop";
  platform: string;
  userAgent: string;
  screenResolution: string;
  language: string;
  ipAddress: string;
  latitude: number;
  longitude: number;
  locationName: string;
  lastActive: string;
  status: "online" | "idle" | "offline";
  appVersion: string;
}

export interface StoreGeoNode {
  id: string;
  name: string;
  sector: string;
  manager: string;
  managerEmail: string;
  latitude: number;
  longitude: number;
  state: string;
  country: string;
  valuationNgn: number;
  healthScore: number;
  activeDevicesCount: number;
  lastDeviceActive?: string;
  status: "active" | "maintenance" | "suspended";
}

// Fallback regional coordinates for Nigerian States & Global Hubs
export const REGIONAL_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Lagos: { lat: 6.5244, lng: 3.3792 },
  "FCT - Abuja": { lat: 9.0765, lng: 7.3986 },
  Rivers: { lat: 4.8156, lng: 7.0498 },
  Kano: { lat: 12.0022, lng: 8.592 },
  Oyo: { lat: 7.3775, lng: 3.947 },
  Enugu: { lat: 6.4584, lng: 7.5464 },
  Delta: { lat: 5.8904, lng: 5.6800 },
  Kaduna: { lat: 10.5105, lng: 7.4165 },
  Ogun: { lat: 7.1557, lng: 3.3458 },
  Edo: { lat: 6.3350, lng: 5.6037 },
  AkwaIbom: { lat: 5.0377, lng: 7.9128 },
  Anambra: { lat: 6.2209, lng: 6.9370 },
};

export const INITIAL_GEO_STORES: StoreGeoNode[] = [
  {
    id: "store-1",
    name: "Main Warehouse",
    sector: "agriculture",
    manager: "Sarah Manager",
    managerEmail: "sarah@stackwise.io",
    latitude: 6.5965,
    longitude: 3.3421,
    state: "Lagos",
    country: "Nigeria",
    valuationNgn: 1245600,
    healthScore: 94,
    activeDevicesCount: 3,
    lastDeviceActive: new Date().toISOString(),
    status: "active",
  },
  {
    id: "store-2",
    name: "Ikeja Branch",
    sector: "pharmacy",
    manager: "Mike Head",
    managerEmail: "mike@stackwise.io",
    latitude: 6.6018,
    longitude: 3.3515,
    state: "Lagos",
    country: "Nigeria",
    valuationNgn: 850000,
    healthScore: 82,
    activeDevicesCount: 2,
    lastDeviceActive: new Date(Date.now() - 300000).toISOString(),
    status: "active",
  },
  {
    id: "store-3",
    name: "Lekki Outlet",
    sector: "restaurant",
    manager: "Emma Manager",
    managerEmail: "emma@stackwise.io",
    latitude: 6.4589,
    longitude: 3.6015,
    state: "Lagos",
    country: "Nigeria",
    valuationNgn: 3540000,
    healthScore: 100,
    activeDevicesCount: 4,
    lastDeviceActive: new Date().toISOString(),
    status: "active",
  },
  {
    id: "store-4",
    name: "Abuja Distribution Hub",
    sector: "general",
    manager: "John Admin",
    managerEmail: "john@stackwise.io",
    latitude: 9.0765,
    longitude: 7.3986,
    state: "FCT - Abuja",
    country: "Nigeria",
    valuationNgn: 485200,
    healthScore: 70,
    activeDevicesCount: 1,
    lastDeviceActive: new Date(Date.now() - 1800000).toISOString(),
    status: "active",
  },
  {
    id: "store-5",
    name: "Port Harcourt Terminal",
    sector: "general",
    manager: "Victor Operations",
    managerEmail: "victor@stackwise.io",
    latitude: 4.8156,
    longitude: 7.0498,
    state: "Rivers",
    country: "Nigeria",
    valuationNgn: 1980000,
    healthScore: 88,
    activeDevicesCount: 2,
    lastDeviceActive: new Date(Date.now() - 600000).toISOString(),
    status: "active",
  },
  {
    id: "store-6",
    name: "Kano Agro-Hub",
    sector: "agriculture",
    manager: "Bello Hassan",
    managerEmail: "bello@stackwise.io",
    latitude: 12.0022,
    longitude: 8.592,
    state: "Kano",
    country: "Nigeria",
    valuationNgn: 2100000,
    healthScore: 91,
    activeDevicesCount: 2,
    lastDeviceActive: new Date().toISOString(),
    status: "active",
  }
];

export const INITIAL_DEVICE_TELEMETRY: DeviceTelemetry[] = [
  {
    id: "dev-01",
    userId: "user-01",
    userEmail: "sarah@stackwise.io",
    storeId: "store-1",
    storeName: "Main Warehouse",
    deviceType: "desktop",
    platform: "macOS 15.2 (M3 Pro)",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/125.0.0.0",
    screenResolution: "2560x1440 @ 120Hz",
    language: "en-US",
    ipAddress: "102.89.23.14 (MTN Nigeria)",
    latitude: 6.5965,
    longitude: 3.3421,
    locationName: "Ikeja, Lagos, Nigeria",
    lastActive: new Date().toISOString(),
    status: "online",
    appVersion: "3.2.1-lisa",
  },
  {
    id: "dev-02",
    userId: "user-02",
    userEmail: "mike@stackwise.io",
    storeId: "store-2",
    storeName: "Ikeja Branch",
    deviceType: "mobile",
    platform: "iOS 17.5 (iPhone 15 Pro)",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1",
    screenResolution: "1179x2556 @ 120Hz",
    language: "en-NG",
    ipAddress: "197.210.52.88 (Airtel Nigeria)",
    latitude: 6.6018,
    longitude: 3.3515,
    locationName: "Allen Avenue, Ikeja, Nigeria",
    lastActive: new Date(Date.now() - 120000).toISOString(),
    status: "online",
    appVersion: "3.2.1-lisa",
  },
  {
    id: "dev-03",
    userId: "user-04",
    userEmail: "emma@stackwise.io",
    storeId: "store-3",
    storeName: "Lekki Outlet",
    deviceType: "tablet",
    platform: "iPadOS 17.2 (iPad Air 5)",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    screenResolution: "1640x2360 @ 60Hz",
    language: "en-GB",
    ipAddress: "102.91.4.102 (Glo Nigeria)",
    latitude: 6.4589,
    longitude: 3.6015,
    locationName: "Lekki Phase 1, Lagos, Nigeria",
    lastActive: new Date().toISOString(),
    status: "online",
    appVersion: "3.2.1-lisa",
  },
  {
    id: "dev-04",
    userId: "user-07",
    userEmail: "john@stackwise.io",
    storeId: "store-4",
    storeName: "Abuja Distribution Hub",
    deviceType: "desktop",
    platform: "Windows 11 Enterprise",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/125.0.0.0",
    screenResolution: "1920x1080 @ 60Hz",
    language: "en-US",
    ipAddress: "41.203.77.12 (Galaxy Backbone Abuja)",
    latitude: 9.0765,
    longitude: 7.3986,
    locationName: "Maitama, Abuja, Nigeria",
    lastActive: new Date(Date.now() - 1800000).toISOString(),
    status: "idle",
    appVersion: "3.2.1-lisa",
  },
  {
    id: "dev-05",
    userId: "user-08",
    userEmail: "bello@stackwise.io",
    storeId: "store-6",
    storeName: "Kano Agro-Hub",
    deviceType: "mobile",
    platform: "Android 14 (Samsung Galaxy S24)",
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S921B) Chrome/124.0.0.0 Mobile",
    screenResolution: "1080x2340 @ 120Hz",
    language: "en-US",
    ipAddress: "102.89.88.42 (MTN Kano)",
    latitude: 12.0022,
    longitude: 8.592,
    locationName: "Nassarawa, Kano, Nigeria",
    lastActive: new Date().toISOString(),
    status: "online",
    appVersion: "3.2.1-lisa",
  }
];

/**
 * Capture current user device specifications & geolocation transparently
 */
export async function captureClientDeviceTelemetry(
  userEmail?: string,
  storeId?: string,
  storeName?: string
): Promise<DeviceTelemetry | null> {
  if (typeof window === "undefined") return null;

  const ua = navigator.userAgent;
  let deviceType: DeviceTelemetry["deviceType"] = "desktop";
  if (/mobile/i.test(ua)) deviceType = "mobile";
  if (/ipad|tablet/i.test(ua)) deviceType = "tablet";

  let platform = navigator.platform || "Web Browser";
  if (ua.includes("Macintosh")) platform = "macOS";
  else if (ua.includes("Windows")) platform = "Windows PC";
  else if (ua.includes("Android")) platform = "Android OS";
  else if (ua.includes("iPhone") || ua.includes("iPad")) platform = "iOS";

  const screenResolution = `${window.screen.width}x${window.screen.height} @ ${window.devicePixelRatio}x`;
  const language = navigator.language || "en-US";

  // Request high accuracy GPS coordinates and real location reverse geocoding
  let latitude = 6.5244; // Fallback default
  let longitude = 3.3792;
  let locationName = "Lagos, Nigeria";
  let ipAddress = "Detecting IP...";

  // 1. Fetch real public IP and location baseline from network/geocoding API
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) });
    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data.ip) ipAddress = data.ip;
    }
  } catch (ipErr) {
    console.info("Public IP detection fallback:", ipErr);
    ipAddress = "102.89.23.14 (Session Network)";
  }

  // 2. Initial IP-based geolocation baseline
  try {
    const geoIpRes = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client", { signal: AbortSignal.timeout(3000) });
    if (geoIpRes.ok) {
      const geoIpData = await geoIpRes.json();
      if (geoIpData.latitude && geoIpData.longitude) {
        latitude = parseFloat(geoIpData.latitude.toFixed(4));
        longitude = parseFloat(geoIpData.longitude.toFixed(4));
      }
      const city = geoIpData.city || geoIpData.locality || geoIpData.principalSubdivision || "";
      const country = geoIpData.countryName || "";
      if (city || country) {
        locationName = [city, country].filter(Boolean).join(", ");
      }
    }
  } catch (err) {
    console.info("IP reverse geocode baseline:", err);
  }

  // 3. High accuracy browser GPS override if permitted
  try {
    if ("geolocation" in navigator) {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 7000,
          enableHighAccuracy: true,
        });
      });
      latitude = parseFloat(pos.coords.latitude.toFixed(4));
      longitude = parseFloat(pos.coords.longitude.toFixed(4));

      // Reverse geocode precise GPS lat/lng to real city/state
      try {
        const revRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (revRes.ok) {
          const revData = await revRes.json();
          const city = revData.locality || revData.city || revData.principalSubdivision || "";
          const country = revData.countryName || "";
          if (city || country) {
            locationName = `${[city, country].filter(Boolean).join(", ")} (${latitude}, ${longitude})`;
          } else {
            locationName = `GPS (${latitude}, ${longitude})`;
          }
        } else {
          locationName = `GPS (${latitude}, ${longitude})`;
        }
      } catch (e) {
        locationName = `GPS (${latitude}, ${longitude})`;
      }
    }
  } catch (geoErr) {
    console.info("Browser GPS position defaulted to network/IP geolocation:", geoErr);
  }

  const deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const telemetry: DeviceTelemetry = {
    id: deviceId,
    userEmail: userEmail || "nexatechnologies.dev@gmail.com",
    storeId: storeId || "store-1",
    storeName: storeName || "Main Warehouse",
    deviceType,
    platform,
    userAgent: ua,
    screenResolution,
    language,
    ipAddress,
    latitude,
    longitude,
    locationName,
    lastActive: new Date().toISOString(),
    status: "online",
    appVersion: "3.2.1-lisa",
  };

  try {
    // Save telemetry snapshot to Firestore
    await setDoc(doc(db, "device_telemetry", deviceId), telemetry);
  } catch (err) {
    console.warn("Could not save telemetry to Firestore, using local context:", err);
  }

  return telemetry;
}
