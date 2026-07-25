import { useState, useEffect } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useRole } from "@/hooks/useRole";
import { X, ChevronDown, Lock, ShoppingCart, Pill, Utensils, Smartphone, Wheat, Palette, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roles: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff (Sales Only)" },
];

const SECTORS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: "general", label: "General Retail", icon: <ShoppingCart className="h-4 w-4" /> },
  { value: "pharmacy", label: "Pharmacy Hub", icon: <Pill className="h-4 w-4" /> },
  { value: "restaurant", label: "Kitchen Console", icon: <Utensils className="h-4 w-4" /> },
  { value: "electronics", label: "Phone Accessories", icon: <Smartphone className="h-4 w-4" /> },
  { value: "agriculture", label: "Agro & Farming", icon: <Wheat className="h-4 w-4" /> },
  { value: "textile", label: "Textiles & Ankara", icon: <Palette className="h-4 w-4" /> },
  { value: "wholesale", label: "Wholesale Depot", icon: <Package className="h-4 w-4" /> },
];

function inspectDeviceDemoPass() {
  try {
    const raw = localStorage.getItem("nexa_demo_pass");
    if (!raw) return { lockData: null, remainingFormatted: "", agentName: "" };
    const data = JSON.parse(raw);
    const remaining = Math.max(0, data.expiresAt - Date.now());
    if (remaining <= 0) return { lockData: null, remainingFormatted: "", agentName: "" };
    const totalSec = Math.floor(remaining / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return {
      lockData: data,
      remainingFormatted: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      agentName: data.agentName || "",
    };
  } catch {
    return { lockData: null, remainingFormatted: "", agentName: "" };
  }
}

export function DemoBanner() {
  const { isDemo, onboarding, updateOnboarding } = useDemo();
  const { role } = useRole();
  const [dismissed, setDismissed] = useState(false);
  const [demoPassInfo, setDemoPassInfo] = useState(() => inspectDeviceDemoPass());

  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => setDemoPassInfo(inspectDeviceDemoPass()), 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  if (!isDemo || dismissed) return null;

  const currentLabel = roles.find((r) => r.value === role)?.label ?? "Admin";
  const currentSectorLabel = SECTORS.find((s) => s.value === onboarding.businessType)?.label ?? "General Retail";
  const currentSectorIcon = SECTORS.find((s) => s.value === onboarding.businessType)?.icon ?? <ShoppingCart className="h-4 w-4" />;

  return (
    <div className="sticky top-0 z-50 flex h-10 w-full items-center justify-between bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm">
      {demoPassInfo.lockData ? (
        <div className="flex items-center gap-1.5 bg-amber-500/20 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-400/30 text-amber-200">
          <Lock className="h-3 w-3 text-amber-400 animate-pulse" />
          <span>Device Lock:</span>
          <span className="font-mono text-amber-300">{demoPassInfo.remainingFormatted}</span>
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Role:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1 rounded-md border border-primary-foreground/25 bg-primary-foreground/15 px-2 py-0.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/25">
                {currentLabel}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[120px]">
              {roles.map((r) => (
                <DropdownMenuItem key={r.value} className={role === r.value ? "font-semibold text-primary" : ""}>
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className="text-primary-foreground/30 font-light">|</span>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Sector:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1 rounded-md border border-primary-foreground/25 bg-primary-foreground/15 px-2 py-0.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/25">
                <span className="mr-0.5">{currentSectorIcon}</span>
                <span>{currentSectorLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[160px]">
              {SECTORS.map((s) => (
                <DropdownMenuItem key={s.value} onClick={() => updateOnboarding({ businessType: s.value })} className={onboarding.businessType === s.value ? "font-semibold text-primary" : ""}>
                  <span className="mr-2">{s.icon}</span>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {demoPassInfo.lockData ? (
          <span className="hidden lg:inline text-amber-200 text-xs font-semibold">· 12h Demo Pass ({demoPassInfo.agentName})</span>
        ) : (
          <span className="hidden lg:inline text-primary-foreground/60 font-light">· data resets each session</span>
        )}
      </div>

      <button type="button" onClick={() => setDismissed(true)} className="w-8 shrink-0 flex items-center justify-center rounded p-0.5 transition-colors hover:bg-primary-foreground/20" aria-label="Dismiss demo banner">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
