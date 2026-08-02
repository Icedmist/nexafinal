import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  getDoc, 
  doc, 
  writeBatch, 
  increment 
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { 
  Plus, 
  Minus, 
  ShoppingBag, 
  Search, 
  Copy, 
  Check, 
  Printer, 
  Share2, 
  Store as StoreIcon,
  Phone,
  MapPin,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Item, Category, SaleTransaction } from "@/types/inventory";

// Helpers matching POS sales page
const NAIRA = "₦";

function formatNaira(price: number): string {
  return `${NAIRA}${price.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getUnitConversionFactor(item: Item, unitName: string): number {
  if (unitName === item.unit) return 1;
  const secondaryUnit = item.units?.find((u) => u.name === unitName);
  return secondaryUnit?.conversionFactor ?? 1;
}

function getCartItemUnitPrice(item: Item, unitName: string): number {
  if (unitName === item.unit) {
    return item.sellingPrice;
  }
  const secondaryUnit = item.units?.find((u) => u.name === unitName);
  if (secondaryUnit) {
    return secondaryUnit.sellingPrice ?? (item.sellingPrice * secondaryUnit.conversionFactor);
  }
  return item.sellingPrice;
}

function getCartBaseUnitsForItem(itemId: string, cart: Map<string, number>, itemsList: Item[]): number {
  let total = 0;
  cart.forEach((qty, key) => {
    const [id, unitName] = key.split(":");
    if (id === itemId) {
      const item = itemsList.find((i) => i.id === id);
      if (item) {
        total += qty * getUnitConversionFactor(item, unitName);
      }
    }
  });
  return total;
}

function getAvailableStockInBaseUnits(itemId: string, cart: Map<string, number>, itemsList: Item[]): number {
  const item = itemsList.find((i) => i.id === itemId);
  if (!item) return 0;
  const inCart = getCartBaseUnitsForItem(itemId, cart, itemsList);
  return Math.max(0, item.currentStock - inCart);
}

function generateCollectionCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// The products/categories collections are NOT publicly readable at the rules
// layer (products carry sensitive fields like cost price and supplier). The
// public storefront loads its catalog through this callable, which returns only
// non-sensitive fields.
const getPublicCatalog = httpsCallable(functions, "getpubliccatalog");

export default function PublicStorePage() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [activeUnits, setActiveUnits] = useState<Record<string, string>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout inputs
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [senderAccount, setSenderAccount] = useState("");

  // Completed transaction for receipt screen
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // Clipboard copy state helpers
  const [copiedBankName, setCopiedBankName] = useState(false);
  const [copiedAccountNum, setCopiedAccountNum] = useState(false);
  const [copiedAccountName, setCopiedAccountName] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // 1. Fetch Store Details and resolve slug/docId
  useEffect(() => {
    if (!id) return;

    const loadStoreAndCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        let storeData: any = null;

        // Try slug query first
        const storeSlugQuery = query(
          collection(db, "stores"),
          where("slug", "==", id),
          limit(1)
        );
        const slugSnapshot = await getDocs(storeSlugQuery);

        if (!slugSnapshot.empty) {
          storeData = { id: slugSnapshot.docs[0].id, ...slugSnapshot.docs[0].data() };
        } else {
          // Fallback to direct document ID lookup
          const storeDocRef = doc(db, "stores", id);
          const storeDocSnap = await getDoc(storeDocRef);
          if (storeDocSnap.exists()) {
            storeData = { id: storeDocSnap.id, ...storeDocSnap.data() };
          }
        }

        if (!storeData) {
          setError("Store not found");
          setLoading(false);
          return;
        }

        // Check if storefront is public
        if (storeData.storeDetails?.isPublic !== true) {
          setError("Storefront is private");
          setLoading(false);
          return;
        }

        setStore(storeData);

        // Fetch public catalog (products + categories) via the callable function
        const catalogRes = await getPublicCatalog({ storeId: storeData.id });
        const catalog = (catalogRes.data as any) || {};

        if (catalog.isPublic !== true) {
          setError("Storefront is private");
          setLoading(false);
          return;
        }

        const catsList: Category[] = (catalog.categories || []).map(
          (c: any) => ({ id: c.id, ...c }) as Category
        );
        const prodsList: Item[] = (catalog.products || []).map(
          (p: any) => p as Item
        );
        setCategories(catsList);
        setProducts(prodsList);

        // Initialize active units defaults
        const unitsMap: Record<string, string> = {};
        prodsList.forEach((p) => {
          unitsMap[p.id] = p.unit;
        });
        setActiveUnits(unitsMap);

      } catch (err: any) {
        console.error("Error resolving storefront details:", err);
        setError("Failed to load storefront catalog details.");
      } finally {
        setLoading(false);
      }
    };

    loadStoreAndCatalog();
  }, [id]);

  // Cart operations
  const handleAdd = (cartKey: string) => {
    const [itemId, unitName] = cartKey.split(":");
    const item = products.find((p) => p.id === itemId);
    if (!item) return;

    const conversionFactor = getUnitConversionFactor(item, unitName);
    const remainingStock = getAvailableStockInBaseUnits(item.id, cart, products);

    if (remainingStock >= conversionFactor) {
      setCart((prev) => {
        const next = new Map(prev);
        next.set(cartKey, (next.get(cartKey) ?? 0) + 1);
        return next;
      });
    } else {
      toast.error(`Cannot add more ${unitName}. Insufficient stock.`);
    }
  };

  const handleRemove = (cartKey: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const currentQty = next.get(cartKey) ?? 0;
      if (currentQty <= 1) {
        next.delete(cartKey);
      } else {
        next.set(cartKey, currentQty - 1);
      }
      return next;
    });
  };

  const handleSetQuantity = (cartKey: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => {
        const next = new Map(prev);
        next.delete(cartKey);
        return next;
      });
      return;
    }

    const [itemId, unitName] = cartKey.split(":");
    const item = products.find((p) => p.id === itemId);
    if (!item) return;

    const conversionFactor = getUnitConversionFactor(item, unitName);
    // Exclude the current cart qty of this key to determine absolute ceiling
    const tempCart = new Map(cart);
    tempCart.delete(cartKey);
    const availableStock = getAvailableStockInBaseUnits(item.id, tempCart, products);
    const maxAllowedQty = Math.floor(availableStock / conversionFactor);

    if (qty <= maxAllowedQty) {
      setCart((prev) => {
        const next = new Map(prev);
        next.set(cartKey, qty);
        return next;
      });
    } else {
      setCart((prev) => {
        const next = new Map(prev);
        next.set(cartKey, maxAllowedQty);
        return next;
      });
      toast.error(`Only ${maxAllowedQty} ${unitName} available in stock.`);
    }
  };

  // Filter products by category & search query
  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeCat) {
      result = result.filter((p) => p.categoryId === activeCat);
    }

    if (search.trim()) {
      const queryStr = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(queryStr) ||
          p.sku.toLowerCase().includes(queryStr) ||
          p.description?.toLowerCase().includes(queryStr)
      );
    }

    return result;
  }, [products, activeCat, search]);

  // Totals calculations
  const cartTotalItemsCount = useMemo(() => {
    let count = 0;
    cart.forEach((qty) => {
      count += qty;
    });
    return count;
  }, [cart]);

  const cartTotalAmount = useMemo(() => {
    let total = 0;
    cart.forEach((qty, key) => {
      const [itemId, unitName] = key.split(":");
      const item = products.find((p) => p.id === itemId);
      if (item) {
        total += getCartItemUnitPrice(item, unitName) * qty;
      }
    });
    return total;
  }, [cart, products]);

  // Clipboard copy helpers
  const handleCopyText = (text: string, setCopied: (v: boolean) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Guest checkout batch save & decrement inventory
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.size === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !senderAccount.trim()) {
      toast.error("Please fill in your name, phone number, and sender account details.");
      return;
    }

    setCheckoutLoading(true);
    try {
      const batch = writeBatch(db);
      const saleId = doc(collection(db, "sales")).id;
      const saleRef = doc(db, "sales", saleId);
      const collectionCode = generateCollectionCode();

      // Structure cart items list
      const checkoutItems: any[] = [];
      cart.forEach((qty, key) => {
        const [itemId, unitName] = key.split(":");
        const item = products.find((p) => p.id === itemId);
        if (item) {
          const unitPrice = getCartItemUnitPrice(item, unitName);
          const factor = getUnitConversionFactor(item, unitName);
          checkoutItems.push({
            itemId,
            itemName: item.name,
            sku: item.sku,
            quantity: qty,
            unitPriceNgn: unitPrice,
            imageUrl: item.imageUrl || "",
            selectedUnit: unitName,
            conversionFactor: factor
          });
        }
      });

      // 1. Create Sale Document
      const saleData = {
        id: saleId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || null,
        senderAccount: senderAccount.trim() || null,
        items: checkoutItems,
        totalNgn: cartTotalAmount,
        paymentMethod: "transfer",
        storeId: store.id,
        branchId: store.branches?.[0]?.id || null,
        ownerId: store.ownerId,
        recordedBy: "guest",
        recordedByName: "Guest Customer",
        collectionCode,
        status: "pending_pickup",
        isPublicOrder: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      batch.set(saleRef, saleData);

      // 2. Decrement stock for each item & write movements
      checkoutItems.forEach((item) => {
        const productRef = doc(db, "products", item.itemId);
        const totalBaseUnits = item.quantity * item.conversionFactor;

        // Perform stock decrement
        batch.update(productRef, {
          currentStock: increment(-totalBaseUnits),
          updatedAt: new Date().toISOString()
        });

        // Record stock movement
        const movementId = doc(collection(db, "movements")).id;
        const movementRef = doc(db, "movements", movementId);

        batch.set(movementRef, {
          id: movementId,
          itemId: item.itemId,
          type: "shipped",
          quantity: totalBaseUnits,
          unitUsed: item.selectedUnit,
          reference: `Sale: ${saleId}`,
          notes: `Guest Checkout: ${customerName.trim()} (${customerPhone.trim()}). Pickup Code: ${collectionCode}`,
          storeId: store.id,
          branchId: store.branches?.[0]?.id || null,
          ownerId: store.ownerId,
          performedBy: "guest",
          performedByName: "Guest Customer",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();

      // Update state & close cart
      setCompletedSale(saleData);
      setCart(new Map());
      setIsCartOpen(false);
      toast.success("Order placed successfully! Please save your receipt.");
    } catch (err: any) {
      console.error("Guest checkout error:", err);
      toast.error(err?.message || "Checkout failed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const shareReceipt = () => {
    if (!completedSale) return;
    const text = `Nexa Order Receipt for ${store.name}\nPickup Code: ${completedSale.collectionCode}\nName: ${completedSale.customerName}\nTotal: ${formatNaira(completedSale.totalNgn)}`;
    if (navigator.share) {
      navigator.share({
        title: `${store.name} Order Pickup`,
        text: text,
      }).catch(console.error);
    } else {
      handleCopyText(text, () => {});
    }
  };

  // Rendering States
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-10 w-10 text-primary" />
          <p className="text-sm text-muted-foreground">Loading storefront details...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl rounded-3xl">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Storefront Unavailable</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {error === "Storefront is private" 
              ? "This business hasn't made their storefront public yet." 
              : error === "Failed to load storefront catalog details."
              ? "We encountered an issue loading this storefront's catalog. Please try again."
              : "We couldn't locate this storefront. Verify the link and try again."}
          </p>
          <Button asChild className="rounded-full px-6">
            <a href="/">Go to Nexa</a>
          </Button>
        </Card>
      </div>
    );
  }

  // Render Premium Digital Receipt Screen
  if (completedSale) {
    return (
      <div className="min-h-screen bg-background nexa-gradient-mesh py-12 px-4">
        <div className="max-w-md mx-auto no-print">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Payment Recorded!</h2>
            <p className="text-sm text-muted-foreground">Present receipt code to collect products.</p>
          </div>

          <Card className="nexa-card p-6 mb-6">
            <div className="text-center border-b border-border pb-6 mb-6">
              <h3 className="text-lg font-bold text-foreground">{store.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{store.storeDetails?.phone}</p>
              <p className="text-xs text-muted-foreground">{store.storeDetails?.address}</p>
            </div>

            {/* Collection Code Badge */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 text-center mb-6">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">Collection Pickup Code</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black font-mono tracking-widest text-primary">{completedSale.collectionCode}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleCopyText(completedSale.collectionCode, setCopiedCode)}
                  className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full"
                >
                  {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Customer info */}
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">{completedSale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{completedSale.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Used:</span>
                <span className="font-medium">{completedSale.senderAccount || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {new Date(completedSale.createdAt).toLocaleDateString()} {new Date(completedSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Items Purchased */}
            <div className="border-t border-b border-border py-4 mb-6">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Items</h4>
              <div className="space-y-3">
                {completedSale.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.selectedUnit} × {formatNaira(item.unitPriceNgn)}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatNaira(item.quantity * item.unitPriceNgn)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total paid */}
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-foreground">Total Paid:</span>
              <span className="text-xl font-black text-primary">
                {formatNaira(completedSale.totalNgn)}
              </span>
            </div>

            {store.storeDetails?.receiptFooter && (
              <p className="text-center text-xs text-muted-foreground italic border-t border-border pt-4">
                "{store.storeDetails.receiptFooter}"
              </p>
            )}
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-full gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print Receipt
            </Button>
            <Button className="flex-1 rounded-full gap-2 text-primary-foreground bg-primary hover:bg-primary/90 nexa-button-shine" onClick={shareReceipt}>
              <Share2 className="h-4 w-4" /> Share Order
            </Button>
          </div>

          <div className="text-center mt-8">
            <Button variant="link" className="text-xs text-muted-foreground" onClick={() => setCompletedSale(null)}>
              Place another order
            </Button>
          </div>
        </div>

        {/* Hidden Thermal Print View */}
        <div className="hidden print:block receipt-print-view font-mono text-black p-4">
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold uppercase">{store.name}</h1>
            <p className="text-xs">{store.storeDetails?.address}</p>
            <p className="text-xs">Tel: {store.storeDetails?.phone}</p>
            <div className="my-2 border-t border-dashed border-black"></div>
            <p className="text-sm font-bold">PICKUP RECEIPT</p>
            <div className="my-2 border-t border-dashed border-black"></div>
          </div>

          <div className="text-center my-3 bg-black/5 p-2 rounded">
            <span className="text-[10px] block">COLLECTION CODE</span>
            <span className="text-2xl font-black tracking-widest">{completedSale.collectionCode}</span>
          </div>

          <div className="text-xs space-y-1 mb-3">
            <p><strong>Customer:</strong> {completedSale.customerName}</p>
            <p><strong>Phone:</strong> {completedSale.customerPhone}</p>
            {completedSale.senderAccount && <p><strong>Account:</strong> {completedSale.senderAccount}</p>}
            <p><strong>Date:</strong> {new Date(completedSale.createdAt).toLocaleString()}</p>
          </div>

          <div className="border-t border-dashed border-black my-2"></div>
          <div className="text-xs space-y-2">
            {completedSale.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <div>
                  <p>{item.itemName}</p>
                  <p className="text-[10px] text-gray-700">
                    {item.quantity} {item.selectedUnit} × {formatNaira(item.unitPriceNgn)}
                  </p>
                </div>
                <span>{formatNaira(item.quantity * item.unitPriceNgn)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-black my-2"></div>

          <div className="flex justify-between text-sm font-bold mb-4">
            <span>TOTAL:</span>
            <span>{formatNaira(completedSale.totalNgn)}</span>
          </div>

          <div className="text-center text-[10px] mt-6">
            <p>Powered by Nexa OS</p>
            {store.storeDetails?.receiptFooter && <p className="italic mt-1">"{store.storeDetails.receiptFooter}"</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background nexa-gradient-mesh pb-20">
      {/* Store Header bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.branding?.logo ? (
              <img 
                src={store.branding.logo} 
                alt={store.name} 
                className="h-10 w-10 rounded-full object-cover border border-border" 
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <StoreIcon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-foreground text-base sm:text-lg leading-tight">{store.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{store.storeDetails?.phone || "No phone contact"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cart trigger button moved to floating bottom */}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="px-4 py-8 max-w-6xl mx-auto">
        <Card className="nexa-card p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 rounded-full px-3 py-0.5 font-semibold text-xs">
              Public Storefront
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Welcome to our Catalog
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span>{store.storeDetails?.address || "Address not provided"}</span>
            </p>
          </div>

          {/* Search catalog */}
          <div className="relative w-full md:max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-full bg-background/50 border-border"
            />
          </div>
        </Card>
      </section>

      {/* Category Filter Navigation */}
      {categories.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <Button
              variant={activeCat === null ? "default" : "outline"}
              onClick={() => setActiveCat(null)}
              className="rounded-full text-xs font-semibold shrink-0"
              size="sm"
            >
              All Items
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCat === cat.id ? "default" : "outline"}
                onClick={() => setActiveCat(cat.id)}
                className="rounded-full text-xs font-semibold shrink-0"
                size="sm"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Product Catalog Grid */}
      <main className="max-w-6xl mx-auto px-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="text-sm text-muted-foreground">No products found matching filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const activeUnit = activeUnits[product.id] || product.unit;
              const activeUnitPrice = getCartItemUnitPrice(product, activeUnit);
              const remainingStock = getAvailableStockInBaseUnits(product.id, cart, products);
              const activeUnitQty = cart.get(`${product.id}:${activeUnit}`) ?? 0;
              const factor = getUnitConversionFactor(product, activeUnit);
              const canAdd = remainingStock >= factor;

              // Combined total qty in cart for this item across all units
              const itemTotalInCart = Array.from(cart.entries())
                .filter(([key]) => key.startsWith(`${product.id}:`))
                .reduce((sum, [_, q]) => sum + q, 0);

              return (
                <div 
                  key={product.id}
                  className={`flex flex-col rounded-[2.5rem] overflow-hidden border bg-card transition-all duration-300 ${
                    itemTotalInCart > 0 
                      ? "border-primary/50 shadow-lg shadow-primary/5 ring-1 ring-primary/20" 
                      : "border-border hover:border-primary/20 hover:shadow-md"
                  } ${product.currentStock <= 0 ? "opacity-75 grayscale-[0.3]" : ""}`}
                >
                  {/* Product Image */}
                  <div className="relative aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-secondary/5 flex items-center justify-center">
                        <Package className="h-10 w-10 text-primary/30" />
                      </div>
                    )}
                    
                    {/* Stock status badge */}
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant="secondary"
                        className={`text-[10px] font-bold shadow-sm ${
                          product.currentStock <= 0 
                            ? "bg-destructive/90 text-white" 
                            : product.currentStock <= product.reorderPoint 
                            ? "bg-amber-500 text-white" 
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        {product.currentStock <= 0 
                          ? "Out of Stock" 
                          : product.currentStock <= product.reorderPoint 
                          ? "Low Stock" 
                          : "In Stock"}
                      </Badge>
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-foreground line-clamp-1 text-sm">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Price and Unit row */}
                      <div className="flex justify-between items-baseline">
                        <span className="text-base font-black text-primary">
                          {formatNaira(activeUnitPrice)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          per {activeUnit}
                        </span>
                      </div>

                      {/* Secondary Units picker if available */}
                      {product.units && product.units.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                          <button
                            onClick={() => setActiveUnits(prev => ({ ...prev, [product.id]: product.unit }))}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                              activeUnit === product.unit 
                                ? "bg-primary/10 text-primary border-primary" 
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {product.unit}
                          </button>
                          {product.units.map((u, ui) => (
                            <button
                              key={ui}
                              onClick={() => setActiveUnits(prev => ({ ...prev, [product.id]: u.name }))}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                                activeUnit === u.name 
                                  ? "bg-primary/10 text-primary border-primary" 
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {u.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quantity controls or Add trigger */}
                    <div className="pt-2 border-t border-border">
                      {activeUnitQty > 0 ? (
                        <div className="flex items-center justify-between bg-muted rounded-full p-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full text-foreground hover:bg-background"
                            onClick={() => handleRemove(`${product.id}:${activeUnit}`)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={activeUnitQty}
                            onChange={(e) => handleSetQuantity(`${product.id}:${activeUnit}`, parseInt(e.target.value) || 0)}
                            className="h-7 w-12 border-none bg-transparent text-center font-bold text-xs p-0 focus-visible:ring-0"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!canAdd}
                            className="h-7 w-7 rounded-full text-foreground hover:bg-background"
                            onClick={() => handleAdd(`${product.id}:${activeUnit}`)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full rounded-full text-xs font-semibold text-primary bg-primary/5 border border-primary/25 hover:bg-primary hover:text-white transition-colors duration-300"
                          size="sm"
                          disabled={product.currentStock <= 0 || !canAdd}
                          onClick={() => handleAdd(`${product.id}:${activeUnit}`)}
                        >
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col justify-between">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-foreground font-bold">
              <ShoppingBag className="h-5 w-5 text-primary" /> Shopping Cart
            </SheetTitle>
          </SheetHeader>

          {cart.size === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-40 mb-3" />
              <p className="text-sm text-muted-foreground">Your shopping cart is empty.</p>
              <Button onClick={() => setIsCartOpen(false)} variant="link" className="text-primary mt-2">
                Continue shopping
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {Array.from(cart.entries()).map(([key, qty]) => {
                  const [itemId, unitName] = key.split(":");
                  const item = products.find((p) => p.id === itemId);
                  if (!item) return null;

                  const price = getCartItemUnitPrice(item, unitName);

                  return (
                    <div key={key} className="flex justify-between items-center gap-4 py-2 border-b border-border last:border-none">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatNaira(price)} per {unitName}
                        </p>
                      </div>

                      {/* Quantity control */}
                      <div className="flex items-center bg-muted rounded-full p-0.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full text-foreground hover:bg-background"
                          onClick={() => handleRemove(key)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-xs font-bold">{qty}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full text-foreground hover:bg-background"
                          onClick={() => handleAdd(key)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <span className="font-bold text-sm text-foreground shrink-0 min-w-[60px] text-right">
                        {formatNaira(price * qty)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Checkout details & Bank information */}
              <div className="border-t border-border bg-muted/40 p-6 space-y-6">
                <div>
                  <div className="flex justify-between font-bold text-base text-foreground mb-4">
                    <span>Order Subtotal:</span>
                    <span>{formatNaira(cartTotalAmount)}</span>
                  </div>

                  {/* Bank Account Transfer Display */}
                  <div className="bg-primary/5 rounded-2xl p-4 border border-primary/15 space-y-3">
                    <h5 className="text-xs font-bold text-primary uppercase tracking-wider">Payment Instructions</h5>
                    <p className="text-xs text-muted-foreground">
                      Transfer the order amount to the bank account below, then fill in your details to checkout.
                    </p>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <div className="flex items-center gap-1 font-semibold text-foreground">
                          <span>{store.storeDetails?.bankName || "N/A"}</span>
                          <button 
                            onClick={() => handleCopyText(store.storeDetails?.bankName || "", setCopiedBankName)}
                            className="text-primary hover:text-primary-foreground p-0.5 rounded"
                          >
                            {copiedBankName ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Account Number:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                          <span>{store.storeDetails?.accountNumber || "N/A"}</span>
                          <button 
                            onClick={() => handleCopyText(store.storeDetails?.accountNumber || "", setCopiedAccountNum)}
                            className="text-primary hover:text-primary-foreground p-0.5 rounded"
                          >
                            {copiedAccountNum ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Account Name:</span>
                        <div className="flex items-center gap-1 font-semibold text-foreground">
                          <span>{store.storeDetails?.accountName || "N/A"}</span>
                          <button 
                            onClick={() => handleCopyText(store.storeDetails?.accountName || "", setCopiedAccountName)}
                            className="text-primary hover:text-primary-foreground p-0.5 rounded"
                          >
                            {copiedAccountName ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guest customer details form */}
                <form onSubmit={handleCheckout} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Your Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. John Doe"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="rounded-full bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Phone Number *</label>
                    <Input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="rounded-full bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Email Address (Optional)</label>
                    <Input
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="rounded-full bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Sender Account / Reference *</label>
                    <Input
                      type="text"
                      placeholder="e.g. 0123456789 or Ref#123"
                      required
                      value={senderAccount}
                      onChange={(e) => setSenderAccount(e.target.value)}
                      className="rounded-full bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">Provide the account number or reference you used for the transfer.</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={checkoutLoading || !customerName.trim() || !customerPhone.trim() || !senderAccount.trim()}
                    className="w-full rounded-full gap-2 text-primary-foreground bg-primary hover:bg-primary/95 mt-4 nexa-button-shine"
                  >
                    {checkoutLoading ? (
                      "Processing Order..."
                    ) : (
                      <>
                        Complete Transfer & Place Order <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Floating Cart Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button 
          onClick={() => setIsCartOpen(true)}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl flex items-center gap-3 px-8 h-14 text-base font-bold border-4 border-background/50 hover:scale-105 transition-transform"
        >
          <ShoppingBag className="h-5 w-5" />
          <span>View Cart</span>
          {cartTotalItemsCount > 0 && (
            <Badge className="bg-white text-primary hover:bg-white border-none text-xs font-black h-6 min-w-[24px] px-2 justify-center rounded-full ml-1 shadow-sm">
              {cartTotalItemsCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
