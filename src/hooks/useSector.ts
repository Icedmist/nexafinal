import { useDemo } from "./useDemo";
import { useBusiness } from "@/contexts/BusinessContext";
import { getSectorConfig, SectorConfig } from "@/constants/sectors";
import { useMemo } from "react";

export function useSector() {
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { profile: liveProfile } = useBusiness();
  
  const activeSettings = isDemo ? demoOnboarding : liveProfile;
  
  const config = useMemo(() => {
    return getSectorConfig(activeSettings?.businessType ?? undefined);
  }, [activeSettings?.businessType]);

  return {
    ...config,
    type: activeSettings?.businessType || "general",
    t: (key: keyof SectorConfig["labels"]) => config.labels[key]
  };
}
