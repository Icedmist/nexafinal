import type { Item, Category, Supplier, Location, StockMovement, PurchaseOrder, InventoryRequest } from "@/types/inventory";

export interface ItemFilters {
  categoryId?: string;
  supplierId?: string;
  status?: "in_stock" | "low_stock" | "out_of_stock";
  search?: string;
  locationId?: string;
}

export interface StockSummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export class DemoStore {
  getItems(filters?: ItemFilters): Item[] { return []; }
  getItemById(id: string): Item | undefined { return undefined; }
  getCategories(): Category[] { return []; }
  getSuppliers(): Supplier[] { return []; }
  getLocations(): Location[] { return []; }
  getMovements(): StockMovement[] { return []; }
  getRecentMovements(limit: number): StockMovement[] { return []; }
  getStockSummary(): StockSummary { return { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }; }
  getPurchaseOrders(): PurchaseOrder[] { return []; }
  getRequests(): InventoryRequest[] { return []; }
  getSales(): any[] { return []; }
  getUsers(): any[] { return []; }
  getExpenses(): any[] { return []; }
  getRefunds(): any[] { return []; }
  getNotifications(): any[] { return []; }
  getUnreadCount(): number { return 0; }
  markAsRead(id: string) {}
  markAllAsRead() {}
  dismissNotification(id: string) {}

  // Mutations (No-ops)
  createItem(item: any): any {}
  updateItem(id: string, updates: any): any {}
  deleteItem(id: string) {}
  createMovement(mov: any) {}
  createPurchaseOrder(po: any): any {}
  updatePurchaseOrder(id: string, updates: any): any {}
  deletePurchaseOrder(id: string) {}
  createSupplier(sup: any): any {}
  updateSupplier(id: string, updates: any): any {}
  deleteSupplier(id: string) {}
  createRequest(req: any): any {}
  updateRequest(id: string, updates: any): any {}
  createLocation(loc: any): any {}
  updateLocation(id: string, updates: any): any {}
  deleteLocation(id: string) {}
  createCategory(cat: any): any {}
  updateCategory(id: string, updates: any): any {}
  deleteCategory(id: string) {}

  getCreditCustomers(): any[] { return []; }
  getReorderDefaults(): any { return {}; }
  setReorderDefaults(values: any): void {}
  getCustomFieldDefs(): any[] { return []; }
  addCustomFieldDef(def: any): void {}
  deleteCustomFieldDef(id: string): void {}
  reorderCustomFieldDefs(ids: string[]): void {}
  validatePromo(code: string): any { return null; }
  addSale(sale: any): void {}
  usePromo(code: string): void {}
  addCreditTransaction(phone: string, name: string, data: any): void {}
  addRefund(refund: any): void {}
  addExpense(expense: any): void {}
  deleteExpense(id: string): void {}
  addUser(user: any): void {}
  updateUser(id: string, data: any): void {}
  getNotificationPrefs(): any { return { email: false, push: false, sms: false }; }
  setNotificationPrefs(prefs: any): void {}

  reset() {}
}
