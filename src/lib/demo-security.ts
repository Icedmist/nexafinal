const DEMO_PASS_STORAGE_KEY = "nexa_demo_pass";

export interface DemoPassLockData {
  tokenId: string;
  agentName: string;
  expiresAt: number;
  deviceFingerprint: string;
}

export interface DemoPassInfo {
  lockData: DemoPassLockData | null;
  remainingMs: number;
  remainingFormatted: string;
  agentName: string;
  isActive: boolean;
}

function getDeviceFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("fingerprint", 2, 2);
  }
  const nav = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join("|");
  let hash = 0;
  for (let i = 0; i < nav.length; i++) {
    const char = nav.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function generateDemoPassUrl(
  agentName: string,
  hours: number = 12
): { url: string; tokenId: string; expiresAtFormatted: string } {
  const tokenId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  const deviceFingerprint = getDeviceFingerprint();

  const lockData: DemoPassLockData = {
    tokenId,
    agentName,
    expiresAt,
    deviceFingerprint,
  };

  localStorage.setItem(DEMO_PASS_STORAGE_KEY, JSON.stringify(lockData));

  const baseUrl = window.location.origin;
  const url = `${baseUrl}/?demo_token=${tokenId}&agent=${encodeURIComponent(agentName)}&expires=${expiresAt}&fp=${deviceFingerprint}`;

  const expiresAtFormatted = new Date(expiresAt).toLocaleString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });

  return { url, tokenId, expiresAtFormatted };
}

export function inspectDeviceDemoPass(): DemoPassInfo {
  const empty: DemoPassInfo = {
    lockData: null,
    remainingMs: 0,
    remainingFormatted: "00:00:00",
    agentName: "",
    isActive: false,
  };

  try {
    const raw = localStorage.getItem(DEMO_PASS_STORAGE_KEY);
    if (!raw) return empty;

    const lockData: DemoPassLockData = JSON.parse(raw);
    const currentFp = getDeviceFingerprint();

    if (lockData.deviceFingerprint !== currentFp) {
      localStorage.removeItem(DEMO_PASS_STORAGE_KEY);
      return empty;
    }

    const remainingMs = Math.max(0, lockData.expiresAt - Date.now());
    if (remainingMs <= 0) {
      localStorage.removeItem(DEMO_PASS_STORAGE_KEY);
      return empty;
    }

    const totalSec = Math.floor(remainingMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const remainingFormatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    return {
      lockData,
      remainingMs,
      remainingFormatted,
      agentName: lockData.agentName,
      isActive: true,
    };
  } catch {
    return empty;
  }
}
