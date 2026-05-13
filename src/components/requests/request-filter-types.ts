import { RequestStatus } from "@/types/inventory";

export interface RequestFilters {
  statuses: RequestStatus[];
  requestedBy: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_REQUEST_FILTERS: RequestFilters = {
  statuses: [],
  requestedBy: "",
  dateFrom: "",
  dateTo: "",
};
