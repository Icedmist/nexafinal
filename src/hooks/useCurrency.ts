import { useBusiness } from "@/contexts/BusinessContext";
import { useMemo } from "react";

export function useCurrency() {
  const { profile } = useBusiness();
  
  const currency = useMemo(() => {
    return profile?.settings?.currency || "NGN";
  }, [profile]);
  
  const format = (amount: number): string => {
    const symbols: Record<string, string> = {
      NGN: "₦",
      USD: "$",
      GBP: "£",
      EUR: "€",
      GHS: "GH₵",
      KES: "KSh",
      ZAR: "R",
    };
    const symbol = symbols[currency] || "₦";
    return `${symbol}${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  return { currency, format };
}
