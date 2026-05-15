import type { OrderStatus } from "@/types/inventory";

export interface RestockFilters {
  statuses: OrderStatus[];
  supplierId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export const EMPTY_RESTOCK_FILTERS: RestockFilters = {
  statuses: [],
  supplierId: null,
  dateFrom: null,
  dateTo: null,
};

export function isFiltersActive(f: RestockFilters): boolean {
  return f.statuses.length > 0 || f.supplierId !== null || f.dateFrom !== null || f.dateTo !== null;
}

export function activeFilterCount(f: RestockFilters): number {
  let c = 0;
  if (f.statuses.length > 0) c++;
  if (f.supplierId) c++;
  if (f.dateFrom || f.dateTo) c++;
  return c;
}
