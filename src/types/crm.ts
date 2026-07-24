export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  storeId?: string;
  notes?: string;
  totalSpent?: number;
  totalOrders?: number;
  debtBalance?: number;
  createdAt?: string;
  updatedAt?: string;
}
