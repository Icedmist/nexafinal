import type { Item, Category, Supplier, Location, StockMovement, LocationType } from "@/types/inventory";
import { ItemStatus, MovementType } from "@/types/inventory";

export interface StockSummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface SeedData {
  items: Item[];
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  movements: StockMovement[];
}

const now = new Date().toISOString();
const ts = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

const GENERAL_SEED: SeedData = {
  categories: [
    { id: "cat-1", name: "Electronics", description: "Electronic devices and gadgets", parentId: null, createdAt: now, updatedAt: now },
    { id: "cat-2", name: "Fashion", description: "Clothing and accessories", parentId: null, createdAt: now, updatedAt: now },
    { id: "cat-3", name: "Groceries", description: "Food and household items", parentId: null, createdAt: now, updatedAt: now },
    { id: "cat-4", name: "Beauty", description: "Beauty and personal care", parentId: null, createdAt: now, updatedAt: now },
  ],
  suppliers: [
    { id: "sup-01", name: "TechHub Distributors", contactName: "Emeka", email: "emeka@techhub.ng", phone: "08012345678", address: "Lagos Island", leadTimeDays: 3, rating: 4.5, isActive: true, notes: "Electronics wholesale", createdAt: now, updatedAt: now },
    { id: "sup-02", name: "Fashion Palace", contactName: "Amina", email: "amina@fashionpalace.ng", phone: "08098765432", address: "Balogun Market", leadTimeDays: 5, rating: 4.0, isActive: true, notes: "Clothing supplier", createdAt: now, updatedAt: now },
    { id: "sup-03", name: "Fresh Foods Ltd", contactName: "Chidi", email: "chidi@freshfoods.ng", phone: "07011223344", address: "Mile 12 Market", leadTimeDays: 2, rating: 4.2, isActive: true, notes: "Food produce", createdAt: now, updatedAt: now },
  ],
  locations: [
    { id: "loc-01", name: "Main Store", type: "warehouse" as LocationType, parentId: null, description: "Primary store location", address: "123 Market Road", isActive: true, createdAt: now, updatedAt: now },
    { id: "loc-02", name: "Warehouse", type: "warehouse" as LocationType, parentId: null, description: "Storage warehouse", address: "456 Industrial Lane", isActive: true, createdAt: now, updatedAt: now },
  ],
  items: [
    { id: "item-01", sku: "SKU-001", barcode: null, name: "iPhone 15 Pro", description: "Apple iPhone 15 Pro 128GB", categoryId: "cat-1", status: ItemStatus.Active, unit: "pcs", currentStock: 12, reorderPoint: 3, reorderQuantity: 10, costPrice: 850000, sellingPrice: 1200000, supplierId: "sup-01", locationId: "loc-01", imageUrl: null, customFields: {}, createdAt: ts(30), updatedAt: now },
    { id: "item-02", sku: "SKU-002", barcode: null, name: "Samsung Galaxy S24", description: "Samsung Galaxy S24 Ultra 256GB", categoryId: "cat-1", status: ItemStatus.Active, unit: "pcs", currentStock: 8, reorderPoint: 3, reorderQuantity: 10, costPrice: 950000, sellingPrice: 1450000, supplierId: "sup-01", locationId: "loc-01", imageUrl: null, customFields: {}, createdAt: ts(25), updatedAt: now },
    { id: "item-03", sku: "SKU-003", barcode: null, name: "USB-C Fast Charger", description: "20W USB-C PD Charger", categoryId: "cat-1", status: ItemStatus.Active, unit: "pcs", currentStock: 45, reorderPoint: 10, reorderQuantity: 50, costPrice: 4500, sellingPrice: 8500, supplierId: "sup-01", locationId: "loc-01", imageUrl: null, customFields: {}, createdAt: ts(20), updatedAt: now },
    { id: "item-04", sku: "SKU-004", barcode: null, name: "Silk Shirt", description: "Premium silk shirt for men", categoryId: "cat-2", status: ItemStatus.Active, unit: "pcs", currentStock: 25, reorderPoint: 5, reorderQuantity: 20, costPrice: 5000, sellingPrice: 12000, supplierId: "sup-02", locationId: "loc-01", imageUrl: null, customFields: {}, createdAt: ts(15), updatedAt: now },
    { id: "item-05", sku: "SKU-005", barcode: null, name: "Ankara Fabric (5 yards)", description: "Premium Ankara wax print", categoryId: "cat-2", status: ItemStatus.Active, unit: "yard", currentStock: 100, reorderPoint: 20, reorderQuantity: 50, costPrice: 1500, sellingPrice: 3500, supplierId: "sup-02", locationId: "loc-01", imageUrl: null, customFields: {}, createdAt: ts(10), updatedAt: now },
    { id: "item-06", sku: "SKU-006", barcode: null, name: "Indomie Noodles (Carton)", description: "Indomie Instant Noodles 120g x 40", categoryId: "cat-3", status: ItemStatus.Active, unit: "carton", currentStock: 15, reorderPoint: 5, reorderQuantity: 20, costPrice: 6000, sellingPrice: 8500, supplierId: "sup-03", locationId: "loc-02", imageUrl: null, customFields: {}, createdAt: ts(8), updatedAt: now },
    { id: "item-07", sku: "SKU-007", barcode: null, name: "Peak Milk 500g", description: "Peak Powdered Milk 500g", categoryId: "cat-3", status: ItemStatus.Active, unit: "tin", currentStock: 30, reorderPoint: 10, reorderQuantity: 30, costPrice: 650, sellingPrice: 1100, supplierId: "sup-03", locationId: "loc-01", imageUrl: null, customFields: {}, createdAt: ts(5), updatedAt: now },
    { id: "item-08", sku: "SKU-008", barcode: null, name: "Hair Conditioner", description: "Motions Professional Hair Conditioner", categoryId: "cat-4", status: ItemStatus.Active, unit: "bottle", currentStock: 2, reorderPoint: 5, reorderQuantity: 20, costPrice: 1800, sellingPrice: 3500, supplierId: "sup-02", locationId: "loc-01", imageUrl: null, customFields: {}, createdAt: ts(3), updatedAt: now },
  ],
  movements: [
    { id: "mvt-01", itemId: "item-01", type: MovementType.Received, quantity: 15, fromLocationId: null, toLocationId: "loc-01", reference: "PO-001", notes: "Initial stock from TechHub", performedBy: "Admin", createdAt: ts(30) },
    { id: "mvt-02", itemId: "item-01", type: MovementType.Shipped, quantity: 3, fromLocationId: "loc-01", toLocationId: null, reference: "SALE-001", notes: "Sold 3 units", performedBy: "Admin", createdAt: ts(25) },
    { id: "mvt-03", itemId: "item-04", type: MovementType.Received, quantity: 30, fromLocationId: null, toLocationId: "loc-01", reference: "PO-002", notes: "Fashion stock delivery", performedBy: "Admin", createdAt: ts(15) },
    { id: "mvt-04", itemId: "item-04", type: MovementType.Shipped, quantity: 5, fromLocationId: "loc-01", toLocationId: null, reference: "SALE-002", notes: "Bulk sale to customer", performedBy: "Admin", createdAt: ts(10) },
    { id: "mvt-05", itemId: "item-08", type: MovementType.Adjusted, quantity: -3, fromLocationId: null, toLocationId: null, reference: "ADJ-001", notes: "Damaged items removed", performedBy: "Admin", createdAt: ts(2) },
  ],
};

const PHARMACY_SEED: SeedData = {
  categories: [
    { id: "cat-p1", name: "Tablets & Capsules", description: "Oral medications", parentId: null, createdAt: now, updatedAt: now },
    { id: "cat-p2", name: "Syrups & Liquids", description: "Liquid medications", parentId: null, createdAt: now, updatedAt: now },
    { id: "cat-p3", name: "First Aid", description: "First aid supplies", parentId: null, createdAt: now, updatedAt: now },
    { id: "cat-p4", name: "Medical Equipment", description: "Diagnostic and medical tools", parentId: null, createdAt: now, updatedAt: now },
  ],
  suppliers: [
    { id: "sup-ph1", name: "MediSupply Nigeria", contactName: "Dr. Okonkwo", email: "info@medisupply.ng", phone: "08011112222", address: "Pharma Market, Lagos", leadTimeDays: 4, rating: 4.8, isActive: true, notes: "Pharmaceutical distributor", createdAt: now, updatedAt: now },
  ],
  locations: [
    { id: "loc-ph1", name: "Dispensing Unit", type: "warehouse" as LocationType, parentId: null, description: "Primary dispensing", address: "Ground Floor", isActive: true, createdAt: now, updatedAt: now },
    { id: "loc-ph2", name: "Storage Room", type: "warehouse" as LocationType, parentId: null, description: "Back storage", address: "Basement", isActive: true, createdAt: now, updatedAt: now },
  ],
  items: [
    { id: "item-ph1", sku: "RX-001", barcode: null, name: "Paracetamol 500mg", description: "Paracetamol tablets x100", categoryId: "cat-p1", status: ItemStatus.Active, unit: "pack", currentStock: 50, reorderPoint: 10, reorderQuantity: 100, costPrice: 350, sellingPrice: 800, supplierId: "sup-ph1", locationId: "loc-ph1", imageUrl: null, customFields: {}, createdAt: ts(20), updatedAt: now },
    { id: "item-ph2", sku: "RX-002", barcode: null, name: "Amoxicillin 500mg", description: "Amoxicillin capsules x30", categoryId: "cat-p1", status: ItemStatus.Active, unit: "pack", currentStock: 25, reorderPoint: 5, reorderQuantity: 50, costPrice: 800, sellingPrice: 1500, supplierId: "sup-ph1", locationId: "loc-ph1", imageUrl: null, customFields: {}, createdAt: ts(15), updatedAt: now },
    { id: "item-ph3", sku: "RX-003", barcode: null, name: "Cough Syrup", description: "Phensedyl Cough Syrup 100ml", categoryId: "cat-p2", status: ItemStatus.Active, unit: "bottle", currentStock: 3, reorderPoint: 5, reorderQuantity: 30, costPrice: 1200, sellingPrice: 2000, supplierId: "sup-ph1", locationId: "loc-ph1", imageUrl: null, customFields: {}, createdAt: ts(10), updatedAt: now },
    { id: "item-ph4", sku: "RX-004", barcode: null, name: "Digital Thermometer", description: "Infrared digital thermometer", categoryId: "cat-p4", status: ItemStatus.Active, unit: "pcs", currentStock: 15, reorderPoint: 3, reorderQuantity: 10, costPrice: 3500, sellingPrice: 6500, supplierId: "sup-ph1", locationId: "loc-ph2", imageUrl: null, customFields: {}, createdAt: ts(5), updatedAt: now },
  ],
  movements: [
    { id: "mvt-ph1", itemId: "item-ph1", type: MovementType.Received, quantity: 50, fromLocationId: null, toLocationId: "loc-ph1", reference: "PO-PH1", notes: "MediSupply delivery", performedBy: "Admin", createdAt: ts(20) },
    { id: "mvt-ph2", itemId: "item-ph3", type: MovementType.Shipped, quantity: 7, fromLocationId: "loc-ph1", toLocationId: null, reference: "SALE-PH1", notes: "Dispensed to customers", performedBy: "Admin", createdAt: ts(5) },
  ],
};

function generateSeedData(sector: string): SeedData {
  switch (sector) {
    case "pharmacy":
      return { ...PHARMACY_SEED };
    default:
      return { ...GENERAL_SEED };
  }
}

export class DemoStore {
  private data: SeedData;
  private version = 0;
  private sector: string;

  constructor(sector: string = "general") {
    this.sector = sector;
    this.data = generateSeedData(sector);
  }

  reset() {
    this.data = generateSeedData(this.sector);
    this.version++;
  }

  getItems(filters?: { categoryId?: string; search?: string }): Item[] {
    let result = this.data.items;
    if (filters?.categoryId) result = result.filter((i) => i.categoryId === filters.categoryId);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    return result;
  }

  getItemById(id: string): Item | undefined {
    return this.data.items.find((i) => i.id === id);
  }

  createItem(item: Item): Item {
    this.data.items.push(item);
    this.version++;
    return item;
  }

  updateItem(id: string, updates: Partial<Item>): Item | undefined {
    const idx = this.data.items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.data.items[idx] = { ...this.data.items[idx], ...updates, updatedAt: new Date().toISOString() };
    this.version++;
    return this.data.items[idx];
  }

  deleteItem(id: string): boolean {
    const len = this.data.items.length;
    this.data.items = this.data.items.filter((i) => i.id !== id);
    if (this.data.items.length < len) { this.version++; return true; }
    return false;
  }

  getStockSummary(): StockSummary {
    const items = this.data.items;
    return {
      total: items.length,
      inStock: items.filter((i) => i.currentStock > i.reorderPoint).length,
      lowStock: items.filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint).length,
      outOfStock: items.filter((i) => i.currentStock === 0).length,
    };
  }

  getCategories(): Category[] {
    return this.data.categories;
  }

  createCategory(category: Category): Category {
    this.data.categories.push(category);
    this.version++;
    return category;
  }

  updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.version++;
    return this.data.categories[idx];
  }

  deleteCategory(id: string): boolean {
    const len = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    if (this.data.categories.length < len) { this.version++; return true; }
    return false;
  }

  getSuppliers(): Supplier[] {
    return this.data.suppliers;
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.data.suppliers.find((s) => s.id === id);
  }

  createSupplier(supplier: Supplier): Supplier {
    this.data.suppliers.push(supplier);
    this.version++;
    return supplier;
  }

  updateSupplier(id: string, updates: Partial<Supplier>): Supplier | undefined {
    const idx = this.data.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.data.suppliers[idx] = { ...this.data.suppliers[idx], ...updates };
    this.version++;
    return this.data.suppliers[idx];
  }

  deleteSupplier(id: string): boolean {
    const len = this.data.suppliers.length;
    this.data.suppliers = this.data.suppliers.filter((s) => s.id !== id);
    if (this.data.suppliers.length < len) { this.version++; return true; }
    return false;
  }

  getLocations(): Location[] {
    return this.data.locations;
  }

  createLocation(location: Location): Location {
    this.data.locations.push(location);
    this.version++;
    return location;
  }

  updateLocation(id: string, updates: Partial<Location>): Location | undefined {
    const idx = this.data.locations.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    this.data.locations[idx] = { ...this.data.locations[idx], ...updates };
    this.version++;
    return this.data.locations[idx];
  }

  deleteLocation(id: string): boolean {
    const len = this.data.locations.length;
    this.data.locations = this.data.locations.filter((l) => l.id !== id);
    if (this.data.locations.length < len) { this.version++; return true; }
    return false;
  }

  getMovements(): StockMovement[] {
    return this.data.movements;
  }

  createMovement(movement: StockMovement): StockMovement {
    this.data.movements.push(movement);
    const item = this.data.items.find((i) => i.id === movement.itemId);
    if (item) {
      if (movement.type === MovementType.Received) item.currentStock += Math.abs(movement.quantity);
      else if (movement.type === MovementType.Shipped) item.currentStock = Math.max(0, item.currentStock - Math.abs(movement.quantity));
      else if (movement.type === MovementType.Adjusted) item.currentStock = Math.max(0, item.currentStock + movement.quantity);
    }
    this.version++;
    return movement;
  }
}
