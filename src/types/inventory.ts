// ─── Supported Units ─────────────────────────────────────

export const SUPPORTED_UNITS = [
  { id: "pcs", label: "Pieces" },
  { id: "pack", label: "Pack" },
  { id: "box", label: "Box" },
  { id: "bag", label: "Bag" },
  { id: "bottle", label: "Bottle" },
  { id: "kg", label: "Kilogram" },
  { id: "g", label: "Gram" },
  { id: "ltr", label: "Litre" },
  { id: "ml", label: "Millilitre" },
  { id: "pair", label: "Pair" },
  { id: "roll", label: "Roll" },
  { id: "yard", label: "Yard" },
  { id: "m", label: "Metre" },
  { id: "carton", label: "Carton" },
  { id: "tonne", label: "Tonne" },
  { id: "drum", label: "Drum" },
  { id: "strip", label: "Strip" },
  { id: "vial", label: "Vial" },
  { id: "plate", label: "Plate" },
  { id: "bowl", label: "Bowl" },
  { id: "portion", label: "Portion" },
  { id: "cup", label: "Cup" },
  { id: "mudu", label: "Mudu" },
  { id: "paint", label: "Paint" },
  { id: "loaf", label: "Loaf" },
  { id: "bundle", label: "Bundle" },
] as const;

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
  salePriceMode?: "retail" | "wholesale";
  customPriceNgn?: number;
  // Restaurant-specific fields
  size?: string;
  sizePrice?: number;
  addons?: Array<{ name: string; price: number }>;
  spiceLevel?: string;
  kitchenNote?: string;
}

/**
 * Transaction type for a sales form / receipt document. The selected type is
 * printed on the PDF header and stored with the form.
 */
export type FormTransactionType = "receipt" | "proforma" | "delivery_note" | "credit_note";

/**
 * A saved sales form / receipt: a fillable line-item document (one customer,
 * many items) that can be reopened, printed, or exported as PDF. Unlike a sale,
 * a form does not decrement inventory and is not a completed transaction — it is
 * a paper-trail document (proforma invoice, delivery note, credit note, receipt).
 */
export interface SalesForm {
  id: string;
  storeId: string;
  branchId?: string | null;
  formNumber: string;
  formType: FormTransactionType;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: SaleLineItem[];
  subtotalNgn: number;
  discountAmountNgn?: number;
  taxRate?: number;
  taxAmountNgn?: number;
  totalNgn: number;
  notes?: string;
  status: "draft" | "finalized";
  recordedBy?: string;
  recordedByName?: string;
  createdAt: string;
  updatedAt: string;
}


export interface SaleTransaction {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: SaleLineItem[];
  totalNgn: number;
  subtotalNgn?: number;
  discountAmountNgn?: number;
  taxAmountNgn?: number;
  taxRate?: number;
  amountPaidNgn?: number;
  changeGivenNgn?: number;
  remainingBalanceNgn?: number;
  paymentMethod?: "cash" | "transfer" | "card";
  isCreditSale?: boolean;
  paymentStatus?: "paid" | "incomplete";
  saleType?: "retail" | "wholesale" | "mixed";
  branchId?: string | null;
  recordedBy?: string;
  recordedByName?: string;
  createdAt: string;
  hasRefund?: boolean;
  collectionCode?: string;
  status?: "completed" | "pending_pickup" | "picked_up";
  isPublicOrder?: boolean;
  // Restaurant-specific fields
  orderType?: OrderType;
  tableNumber?: string;
  kitchenNotes?: string;
  packagingFee?: number;
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
  Staff = "staff",
  SystemAdmin = "system_admin",
  Owner = "owner",
}

// ─── Interfaces ──────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  supportedUnits?: string[];
}

export interface UnitOfMeasure {
  name: string;           // e.g., 'Sack', 'Carton'
  conversionFactor: number; // e.g., 50 (meaning 1 Sack = 50 base units)
  sellingPrice?: number;   // Optional: Wholesale price override
}

export interface ProductVariant {
  id: string;
  attributes: Record<string, string>; // e.g., { "Colour": "Black", "Size": "38" }
  price: number;
  stock: number;
  sku?: string;
}

// ─── Restaurant Menu Item Types ──────────────────────────────────────

export interface MenuItemSize {
  id: string;
  name: string;        // e.g., "Regular", "Large"
  price: number;       // Price for this size
}

export interface MenuItemAddon {
  id: string;
  name: string;        // e.g., "Chicken", "Beef"
  price: number;       // Additional price for this addon
}

export interface ComboSlot {
  id: string;
  categoryId: string;  // Which category to pick from
  categoryName: string; // Display name: "Choose your protein"
  required: boolean;   // Must pick one
  maxPicks: number;    // How many can pick (1 for single, >1 for multi)
}

export interface MenuItemConfig {
  sizes: MenuItemSize[];           // Required: customer must pick one
  addons: MenuItemAddon[];         // Optional: customer can add one or skip
  spiceLevels: string[];           // Free options: ["Mild", "Medium", "Hot"]
  allowKitchenNotes: boolean;      // Toggle for free-text notes
  prepTimeMinutes: number;         // Kitchen prep time estimate
  isCombo: boolean;                // Whether this is a combo/bundle
  comboSlots?: ComboSlot[];        // For combos: which items are included
}

export type OrderType = "dine_in" | "takeaway" | "delivery";

export interface RestaurantOrderLine {
  itemId: string;
  itemName: string;
  size?: string;                   // Selected size name
  sizePrice?: number;              // Price of selected size
  addons: Array<{ name: string; price: number }>;
  spiceLevel?: string;
  kitchenNote?: string;
  quantity: number;
  unitPriceNgn: number;            // Total unit price (size + addons)
  totalPriceNgn: number;           // unitPrice * quantity
}

export interface RestaurantOrder {
  orderType: OrderType;
  tableNumber?: string;            // For dine-in
  estimatedReadyTime?: string;     // For takeaway/delivery
  packagingFee?: number;           // Auto-added for takeaway/delivery
  lines: RestaurantOrderLine[];
}

export interface UnitConversion {
  unitId: string;
  multiplier: number;
  priceNgn?: number;
}

export interface PricingTiers {
  retail?: number;
  wholesale?: number;
  distributor?: number;
  tierEnabled?: boolean;
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
  currentStock: number; // Stored in BASE UNIT (or sum of variant stocks if variants exist)
  reorderPoint: number;
  reorderQuantity: number;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  locationId: string | null;
  supplierId: string | null;
  branchId?: string | null;
  imageUrl: string | null;
  emoji?: string;
  customFields: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
  // Tiered pricing
  pricingTiers?: PricingTiers;
  // Unit conversions (bulk to small units)
  unitConversions?: UnitConversion[];
  // Legacy variant fields
  color?: string;
  sizes?: string;
  fineTunedVariants?: Record<string, { price: number; stock: number }>;
  // Variant support (textile, footwear, etc.)
  variantAttributes?: string[]; // e.g., ["Colour", "Size", "Material"]
  variants?: ProductVariant[];
  // Restaurant menu item config
  menuItemConfig?: MenuItemConfig;
  needsReview?: boolean;
  // Pharmacy clinical specs
  pharmacy?: {
    expiryDate?: string;
    batchNumber?: string;
    requiresPrescription?: boolean;
    dosageForm?: string;
  };
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
  fromBranchId?: string | null;
  toBranchId?: string | null;
  reference: string;
  notes: string;
  performedBy: string;
  performedByName?: string;
  branchId?: string | null;
  unitPrice?: number;
  value?: number;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  selectedUnit?: string;
  conversionFactor?: number;
  sellingPrice?: number;
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
  | "po_update"
  | "request_update"
  | "expiry_warning"
  | "system"
  | "login"
  | "staff_onboarding"
  | "sale"
  | "inventory_request"
  | "movement";

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
  status?: "in_stock" | "low_stock" | "out_of_stock" | "needs-review" | "archived";
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

/**
 * A customer's prepaid credit balance at a store (shared across all branches —
 * a "wallet" the customer tops up ahead of time, then draws down on purchases).
 * Keyed by (storeId, customerPhone); one active balance per customer per store.
 */
export interface CustomerBalance {
  id: string;
  customerPhone: string;
  customerName: string;
  balanceNgn: number;
  storeId: string;
  updatedAt: string;
}

/**
 * Immutable ledger entry backing every change to a CustomerBalance. This is the
 * auditable trail (like the debt ledger) proving why the balance moved.
 */
export interface CreditTopup {
  id: string;
  customerPhone: string;
  customerName: string;
  /** Signed: positive = money added, negative = deducted by a sale/withdrawal. */
  amountNgn: number;
  type: "topup" | "sale_deduction" | "overpay_credit" | "adjustment";
  storeId: string;
  branchId: string | null;
  saleId?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

/**
 * An imported / manually-added opening debt record. These back an "existed
 * debtor" that was migrated into the system (via CSV or a manual entry) rather
 * than being created from a live credit sale.
 */
export interface ImportedDebt {
  id: string;
  customerName: string;
  customerPhone: string;
  amountNgn: number;
  notes?: string;
  source: "csv" | "manual";
  storeId: string;
  branchId: string | null;
  ownerId?: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerCollectionItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantityCollected: number;
  unitPriceNgn: number;
  quantitySold?: number;
  quantityReturned?: number;
  remainingDebtQty?: number;
  remainingDebtValueNgn?: number;
}

export interface ManagerCollectionDebtPayment {
  id: string;
  amountNgn: number;
  paymentDate: string;
  notes?: string;
  recordedBy: string;
}

export interface ManagerCollection {
  id: string;
  collectionNumber: string;
  managerId: string;
  managerName: string;
  storeId: string;
  storeName?: string;
  items: ManagerCollectionItem[];
  totalValueNgn: number;
  cashRemittedNgn: number;
  returnedStockValueNgn: number;
  remainingDebtValueNgn: number;
  status: "collected" | "partially_balanced" | "fully_balanced" | "has_debt" | "debt_cleared";
  collectionDate: string;
  balancedAt?: string;
  balancedBy?: string;
  notes?: string;
  debtPayments?: ManagerCollectionDebtPayment[];
  createdAt: string;
  updatedAt: string;
}
