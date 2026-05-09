// ─── Sales ───────────────────────────────────────────────

export interface SaleLineItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPriceNgn: number;
  imageUrl?: string;
  selectedUnit?: string;
  conversionFactor?: number;
}


export interface SaleTransaction {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: SaleLineItem[];
  totalNgn: number;
  paymentMethod?: "cash" | "transfer" | "card";
  isCreditSale?: boolean;
  branchId?: string | null;
  recordedBy?: string;
  recordedByName?: string;
  createdAt: string;
}

// ─── Enums ───────────────────────────────────────────────

export enum MovementType {
  Received = "received",
  Shipped = "shipped",
  Adjusted = "adjusted",
  Transferred = "transferred",
}

export enum OrderStatus {
  Draft = "draft",
  Submitted = "submitted",
  Partial = "partial",
  Received = "received",
  Cancelled = "cancelled",
}

export enum RequestStatus {
  Pending = "pending",
  Approved = "approved",
  PartiallyFulfilled = "partially_fulfilled",
  Fulfilled = "fulfilled",
  Declined = "declined",
  Cancelled = "cancelled",
}

export enum ItemStatus {
  Active = "active",
  Discontinued = "discontinued",
  Archived = "archived",
}

export enum UserRoleType {
  Admin = "admin",
  Manager = "manager",
  Requestor = "requestor",
}

// ─── Interfaces ──────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnitOfMeasure {
  name: string;           // e.g., 'Sack', 'Carton'
  conversionFactor: number; // e.g., 50 (meaning 1 Sack = 50 base units)
  sellingPrice?: number;   // Optional: Wholesale price override
}

export interface CustomFieldDefinition {

  id: string;
  name: string;
  fieldType: "text" | "number" | "boolean" | "date" | "select";
  options: string[];
  required: boolean;
  createdAt: string;
}

export interface Item {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string;
  categoryId: string | null;
  status: ItemStatus;
  unit: string; // This is the BASE UNIT
  units?: UnitOfMeasure[]; // Secondary units
  currentStock: number; // Stored in BASE UNIT
  reorderPoint: number;
  reorderQuantity: number;
  costPrice: number;
  sellingPrice: number;
  locationId: string | null;
  supplierId: string | null;
  branchId?: string | null;
  imageUrl: string | null;
  customFields: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}


export type LocationType = "warehouse" | "zone" | "aisle" | "shelf" | "bin";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  parentId: string | null;
  description: string;
  address: string;
  isActive: boolean;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
  rating: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: MovementType;
  quantity: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  reference: string;
  notes: string;
  performedBy: string;
  performedByName?: string;
  branchId?: string | null;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: OrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  expectedDelivery: string | null;
  notes: string;
  createdBy: string;
  branchId?: string | null;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestItem {
  id: string;
  requestId: string;
  itemId: string;
  quantity: number;
  notes: string;
}

export interface InventoryRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: RequestStatus;
  priority: "normal" | "urgent";
  items: RequestItem[];
  requestedBy: string;
  approvedBy: string | null;
  branchId?: string | null;
  storeId: string;
  reason: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | "low_stock"
  | "zero_stock"
  | "po_reminder"
  | "po_overdue"
  | "request_update"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  role: UserRoleType;
}

export interface ItemFilters {
  categoryId?: string;
  supplierId?: string;
  locationId?: string;
  status?: "in_stock" | "low_stock" | "out_of_stock";
  search?: string;
}

export interface StockSummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface DebtPayment {
  id: string;
  customerPhone: string;
  customerName: string;
  amountNgn: number;
  recordedBy: string;
  recordedByName: string;
  storeId: string;
  branchId: string | null;
  createdAt: string;
  notes?: string;
}
