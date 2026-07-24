import { useState, useCallback, useMemo } from "react";
import { DRUG_LIBRARY, type DrugLibraryItem } from "@/data/drugLibrary";

export function useDrugLibrary(enabled: boolean) {
  const [query, setQuery] = useState("");

  const searchDrugs = useCallback(
    (searchQuery: string): DrugLibraryItem[] => {
      if (!enabled || !searchQuery || searchQuery.length < 2) return [];
      const q = searchQuery.toLowerCase();
      return DRUG_LIBRARY.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.genericName.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      ).slice(0, 10);
    },
    [enabled]
  );

  return { searchDrugs, setQuery };
}
