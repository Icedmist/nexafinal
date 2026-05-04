import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { DemoStore } from "@/lib/demo-store";

export interface OnboardingSelection {
  businessType: string | null;
  categories: string[];
  storeName: string;
  storePhone: string;
  storeAddress: string;
  receiptFooter: string;
  taxRate: number;
  brandColor?: string;
  logoUrl?: string;
}

const DEFAULT_ONBOARDING: OnboardingSelection = { businessType: null, categories: [], storeName: "My Store", storePhone: "", storeAddress: "", receiptFooter: "", taxRate: 0, brandColor: "#0d9488", logoUrl: "" };

export interface DemoContextValue {
  isDemo: boolean;
  demoStore: DemoStore | null;
  enterDemoMode: (onboarding?: OnboardingSelection) => void;
  exitDemoMode: () => void;
  resetDemoData: () => void;
  bumpVersion: () => void;
  version: number;
  onboarding: OnboardingSelection;
  updateOnboarding: (updates: Partial<OnboardingSelection>) => void;
}

export const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  // Always provide a hollow demo store so UI doesn't crash while we migrate
  const [store] = useState<DemoStore>(new DemoStore());
  const [version, setVersion] = useState(0);
  const [onboarding, setOnboarding] = useState<OnboardingSelection>(DEFAULT_ONBOARDING);

  const enterDemoMode = useCallback((ob?: OnboardingSelection) => {}, []);
  const exitDemoMode = useCallback(() => {}, []);
  const resetDemoData = useCallback(() => {}, []);
  const bumpVersion = useCallback(() => setVersion((v) => v + 1), []);
  const updateOnboarding = useCallback((updates: Partial<OnboardingSelection>) => {
    setOnboarding((prev) => ({ ...prev, ...updates }));
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      isDemo: false, // Turned off as requested: "remove all demo data!"
      demoStore: store,
      enterDemoMode,
      exitDemoMode,
      resetDemoData,
      bumpVersion,
      version,
      onboarding,
      updateOnboarding,
    }),
    [store, enterDemoMode, exitDemoMode, resetDemoData, bumpVersion, version, onboarding, updateOnboarding],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
