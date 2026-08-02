import { useState, useRef, useEffect, useMemo, FormEvent } from "react";
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Check, 
  RefreshCw, 
  Printer, 
  MessageCircle, 
  User, 
  Phone, 
  CheckCircle2, 
  Scan,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useItems } from "@/hooks/useInventoryData";
import { useSalesMutations } from "@/hooks/useSalesData";
import { useCreateItem, useUpdateItem } from "@/hooks/useInventoryMutations";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import type { Item, SaleTransaction } from "@/types/inventory";
import { buildCartKey, parseCartKey } from "./price-utils";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NAIRA = "₦";

// Web Audio API Synthesizer helper for barcode scan and success sounds
function playScanBeep(type: "beep" | "success" | "error" = "beep") {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === "beep") {
      // Classic high-pitched positive scanning register beep
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      // Happy double chord completion chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1109, ctx.currentTime + 0.08); // C#6
      
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc2.start(ctx.currentTime + 0.08);
      osc.stop(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.25);
    } else {
      // Deep mistake/unrecognized noise
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn("Audio Context plays interrupted:", e);
  }
}

// Pre-populated barcode database for non-store FMCG & brand recognition
const PRE_POPULATED_BARCODES = [
  {
    barcode: "6151100021183",
    name: "Peak Milk Instant Powder 400g",
    category: "Beverages & Dairy",
    emoji: "🥛",
    imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=60",
    suggestedCostPrice: 3800,
    suggestedSellingPrice: 4500,
    brand: "Peak Milk",
    unit: "pcs"
  },
  {
    barcode: "6151122334455",
    name: "Indomie Instant Noodles Belle Full 280g",
    category: "Packaged Foods",
    emoji: "🍜",
    imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=200&auto=format&fit=crop&q=60",
    suggestedCostPrice: 350,
    suggestedSellingPrice: 450,
    brand: "Indomie",
    unit: "pack"
  },
  {
    barcode: "5449000000996",
    name: "Coca-Cola Bottle 50cl Original Taste",
    category: "Beverages & Dairy",
    emoji: "🥤",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&auto=format&fit=crop&q=60",
    suggestedCostPrice: 200,
    suggestedSellingPrice: 250,
    brand: "Coca-Cola",
    unit: "bottle"
  },
  {
    barcode: "5011321773411",
    name: "Panadol Extra Pain Relief 10s",
    category: "Pharmacy",
    emoji: "💊",
    imageUrl: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=60",
    suggestedCostPrice: 850,
    suggestedSellingPrice: 1200,
    brand: "GSK",
    unit: "pack"
  },
  {
    barcode: "7613035334455",
    name: "Nestle Milo Chocolate Powder 500g",
    category: "Beverages & Dairy",
    emoji: "☕",
    suggestedCostPrice: 2800,
    suggestedSellingPrice: 3400,
    brand: "Nestle",
    unit: "tin"
  },
  {
    barcode: "6151100998877",
    name: "Golden Morn Cereal 900g",
    category: "Packaged Foods",
    emoji: "🥣",
    suggestedCostPrice: 2200,
    suggestedSellingPrice: 2700,
    brand: "Nestle",
    unit: "pack"
  },
  {
    barcode: "5449000014528",
    name: "Fanta Orange Can 33cl",
    category: "Beverages & Dairy",
    emoji: "🍊",
    suggestedCostPrice: 250,
    suggestedSellingPrice: 300,
    brand: "Coca-Cola",
    unit: "can"
  },
  {
    barcode: "5449000005885",
    name: "Sprite Lemon-Lime Bottle 50cl",
    category: "Beverages & Dairy",
    emoji: "🍋",
    suggestedCostPrice: 200,
    suggestedSellingPrice: 250,
    brand: "Coca-Cola",
    unit: "bottle"
  }
];

interface QuickCartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
  cartKey: string;
}

interface UnrecognizedScanData {
  code: string;
  name: string;
  category: string;
  sellingPrice: string;
  costPrice: string;
  stock: string;
  unit: string;
  isRecognized: boolean;
  recognitionSource?: string;
  imageUrl?: string;
  emoji?: string;
}

export function SalesQuickScanCheckout({
  cart,
  cartItemsRaw,
  onAddCartKey,
  onRemoveCartKey,
  onSetCartKeyQuantity,
  onClearCart,
}: {
  cart: Map<string, number>;
  cartItemsRaw: { item: Item; quantity: number; cartKey: string }[];
  onAddCartKey: (cartKey: string, qty?: number) => void;
  onRemoveCartKey: (cartKey: string) => void;
  onSetCartKeyQuantity: (cartKey: string, qty: number) => void;
  onClearCart: () => void;
}) {
  const { data: items } = useItems();
  const { addSale } = useSalesMutations();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const { user } = useAuth();
  const { profile } = useBusiness();

  const [scanInput, setScanInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [checkoutResult, setCheckoutResult] = useState<SaleTransaction | null>(null);
  const [laserActive, setLaserActive] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Scan mode mapping state: auto-detect both, store_qr only, or manufacturer_code only
  const [selectedScanMode, setSelectedScanMode] = useState<"auto" | "store_qr" | "manufacturer_code">("auto");

  // Restock & update catalog states for out of stock scans
  const [restockItem, setRestockItem] = useState<Item | null>(null);
  const [restockQty, setRestockQty] = useState<string>("10");
  const [restockCost, setRestockCost] = useState<string>("0");
  const [restockSelling, setRestockSelling] = useState<string>("0");
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  // Non-store unrecognized barcode / QR scan state
  const [unrecognizedScan, setUnrecognizedScan] = useState<UnrecognizedScanData | null>(null);
  const [isSavingNewItem, setIsSavingNewItem] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Focus scanning input on mount and after scans
  useEffect(() => {
    if (!isCameraActive) {
      inputRef.current?.focus();
    }
  }, [checkoutResult, isCameraActive]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(e => console.warn("Cleanup error:", e));
      }
    };
  }, []);

  // Automatically start camera scanning on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startScanning();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const startScanning = async () => {
    try {
      setIsCameraActive(true);
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode("camera-reader");
          html5QrcodeRef.current = html5QrCode;
          
          const config = { 
            fps: 15, 
            qrbox: (width: number, height: number) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          };
          
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              handleScanOrSubmit(decodedText);
            },
            () => {
              // Ignore standard scan errors/warnings (no barcode detected in frame)
            }
          );
          toast.success("Camera barcode scanner activated!");
        } catch (err) {
          console.error("Failed to start camera scan:", err);
          toast.error("Could not access camera. Please check browser permissions.");
          setIsCameraActive(false);
        }
      }, 150);
    } catch (err) {
      console.error(err);
      setIsCameraActive(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {
        console.warn("Failed to stop scanner cleanly:", e);
      }
      html5QrcodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Map scanned map to actual pricing array (from the shared cart)
  const cartItems: QuickCartItem[] = useMemo<QuickCartItem[]>(() => {
    return cartItemsRaw.map(({ item, quantity, cartKey }) => ({
      item,
      quantity,
      unitPrice: item.sellingPrice,
      cartKey,
    }));
  }, [cartItemsRaw]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, ci) => acc + ci.unitPrice * ci.quantity, 0);
  }, [cartItems]);

  const taxRate = profile?.storeDetails?.taxRate ?? 7.5;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;

  const handleScanOrSubmit = async (inputVal: string) => {
    const rawQuery = inputVal.trim();
    if (!rawQuery) return;

    let matchedItem: Item | undefined = undefined;
    let mappedAs: "store_qr" | "manufacturer_code" | "unknown" = "unknown";

    // 1. Try Store QR matching first if mode is auto or store_qr
    if (selectedScanMode === "auto" || selectedScanMode === "store_qr") {
      // JSON pattern detection
      if (rawQuery.startsWith("{") && rawQuery.endsWith("}")) {
        try {
          const parsed = JSON.parse(rawQuery);
          const targetId = parsed.id || parsed.productId || parsed.itemId;
          if (targetId) {
            matchedItem = items.find(i => i.id === targetId || (i.sku && i.sku.toUpperCase() === String(targetId).toUpperCase()));
            if (matchedItem) mappedAs = "store_qr";
          }
        } catch (e) {
          console.warn("Invalid JSON store QR, falling back to barcode", e);
        }
      }

      // Prefix pattern detection (e.g. STORE-1002, NEXA-1002)
      if (!matchedItem) {
        const prefixMatch = rawQuery.match(/^(?:STORE-|NEXA-)(.+)$/i);
        if (prefixMatch) {
          const targetId = prefixMatch[1].toUpperCase();
          matchedItem = items.find(i => i.id.toUpperCase() === targetId || (i.sku && i.sku.toUpperCase() === targetId));
          if (matchedItem) mappedAs = "store_qr";
        }
      }
    }

    // 2. Try Manufacturer Barcode / QR / SKU lookup if not matched yet and mode is auto or manufacturer_code
    if (!matchedItem && (selectedScanMode === "auto" || selectedScanMode === "manufacturer_code")) {
      const upperQuery = rawQuery.toUpperCase();
      matchedItem = items.find(i => 
        (i.sku && i.sku.toUpperCase() === upperQuery) || 
        (i.barcode && i.barcode.toUpperCase() === upperQuery) ||
        (i.name.toUpperCase().includes(upperQuery))
      );
      if (matchedItem) mappedAs = "manufacturer_code";
    }

if (matchedItem) {
      const cartKey = buildCartKey(matchedItem.id, matchedItem.unit || "pcs", "retail");
      const existing = cart.get(cartKey) ?? 0;
      const currentQty = existing;
      const isOutOfStock = matchedItem.currentStock !== undefined && currentQty >= matchedItem.currentStock;

      if (isOutOfStock) {
        // "then if recognize and not in stock it should be sell and ask if to add to stock"
        playScanBeep("beep");
        onAddCartKey(cartKey, 1);

        // Trigger prompt to restock & update catalog prices
        setRestockItem(matchedItem);
        setRestockQty("10");
        setRestockCost(String(matchedItem.costPrice || 0));
        setRestockSelling(String(matchedItem.sellingPrice || 0));

        toast.warning(`Scanned: "${matchedItem.name}" is OUT OF STOCK. Added to cart anyway. Update stock using the dialog.`, {
          duration: 5000,
        });
      } else {
        // Normal scan success
        playScanBeep("beep");
        onAddCartKey(cartKey, 1);
        toast.success(`Scanned: ${matchedItem.name} via ${mappedAs === "store_qr" ? "Store QR Mapping" : "Manufacturer Code"}`);
      }
      setScanInput("");
      if (!isCameraActive) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    // 3. UNRECOGNIZED / NON-STORE BARCODE & QR CODE RECOGNITION
    playScanBeep("beep");

    let preName = "";
    let preCategory = "General";
    let preSellingPrice = "1000";
    let preCostPrice = "800";
    let preUnit = "pcs";
    let preEmoji = "📦";
    let preImageUrl = "";
    let isRecognized = false;
    let recognitionSource = "";

    // A. Check if rawQuery is embedded JSON QR Code with product metadata
    if (rawQuery.startsWith("{") && rawQuery.endsWith("}")) {
      try {
        const parsed = JSON.parse(rawQuery);
        if (parsed.name || parsed.title || parsed.productName || parsed.price) {
          preName = parsed.name || parsed.title || parsed.productName || "Scanned QR Product";
          preSellingPrice = String(parsed.price || parsed.sellingPrice || parsed.amount || 1000);
          preCostPrice = String(parsed.costPrice || parsed.cost || Math.round(Number(preSellingPrice) * 0.8));
          preCategory = parsed.category || "General";
          preUnit = parsed.unit || "pcs";
          preEmoji = parsed.emoji || "🏷️";
          isRecognized = true;
          recognitionSource = "Embedded QR Data";
        }
      } catch (e) {
        console.warn("QR JSON parse attempt:", e);
      }
    }

    // B. Check Pre-populated FMCG Barcode Database
    if (!isRecognized) {
      const match = PRE_POPULATED_BARCODES.find(
        (p) => p.barcode === rawQuery || p.barcode.endsWith(rawQuery) || rawQuery.endsWith(p.barcode)
      );

      if (match) {
        preName = match.name;
        preCategory = match.category;
        preSellingPrice = match.suggestedSellingPrice.toString();
        preCostPrice = match.suggestedCostPrice.toString();
        preUnit = match.unit || "pcs";
        preEmoji = match.emoji || "🥛";
        preImageUrl = match.imageUrl || "";
        isRecognized = true;
        recognitionSource = "Global FMCG Barcode DB";
      }
    }

    // C. Check live server-side AI Barcode lookup if numeric
    if (!isRecognized && /^\d{6,14}$/.test(rawQuery)) {
      try {
        const res = await fetch("/api/barcode/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: rawQuery })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.name) {
            preName = data.name;
            preCategory = data.category || "General";
            preSellingPrice = String(data.suggestedSellingPrice || 1000);
            preCostPrice = String(data.suggestedCostPrice || Math.round(Number(preSellingPrice) * 0.8));
            preEmoji = data.emoji || "📦";
            isRecognized = true;
            recognitionSource = "AI Barcode Lookup";
          }
        }
      } catch (e) {
        console.warn("Server barcode lookup error:", e);
      }
    }

    // Fallback default name if unrecognized
    if (!preName) {
      preName = `Scanned Item (${rawQuery})`;
    }

    // Trigger Non-Store Barcode / QR dialog
    setUnrecognizedScan({
      code: rawQuery,
      name: preName,
      category: preCategory,
      sellingPrice: preSellingPrice,
      costPrice: preCostPrice,
      stock: "50",
      unit: preUnit,
      isRecognized,
      recognitionSource,
      emoji: preEmoji,
      imageUrl: preImageUrl
    });

    setScanInput("");
  };

  const handleSaveToCatalogAndSell = async () => {
    if (!unrecognizedScan) return;
    const name = unrecognizedScan.name.trim() || `Scanned Item (${unrecognizedScan.code})`;
    const price = parseFloat(unrecognizedScan.sellingPrice) || 0;
    const cost = parseFloat(unrecognizedScan.costPrice) || 0;
    const stock = parseInt(unrecognizedScan.stock) || 50;
    const category = unrecognizedScan.category || "General";
    const unit = unrecognizedScan.unit || "pcs";
    const code = unrecognizedScan.code;

    setIsSavingNewItem(true);
    try {
      const newItemId = `item-${Date.now()}`;
      const newItem: Item = {
        id: newItemId,
        name,
        sellingPrice: price,
        costPrice: cost,
        currentStock: stock,
        reorderPoint: 10,
        unit,
        sku: code,
        barcode: code,
        categoryId: null,
        description: "",
        status: "active" as any,
        imageUrl: unrecognizedScan.imageUrl || null,
        customFields: {},
        locationId: null,
        supplierId: null,
        reorderQuantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save item to store catalog
      await new Promise<void>((resolve, reject) => {
        createItem.mutate(newItem, {
          onSuccess: () => resolve(),
          onError: (err) => reject(err)
        });
      });

      // Add to active quick scan sale cart
      onAddCartKey(buildCartKey(newItemId, unit || "pcs", "retail"), 1);

      playScanBeep("success");
      toast.success(`Saved "${name}" to Catalog and added to active Sale!`);
      setUnrecognizedScan(null);
    } catch (err) {
      console.error("Error creating item from scan:", err);
      toast.error("Failed to add new item to catalog.");
    } finally {
      setIsSavingNewItem(false);
    }
  };

  const handleSimulateScan = (item: Item) => {
    setLaserActive(item.id);
    setTimeout(() => setLaserActive(null), 300);

    const cartKey = buildCartKey(item.id, item.unit || "pcs", "retail");
    const currentQty = cart.get(cartKey) ?? 0;
    const isOutOfStock = item.currentStock !== undefined && currentQty >= item.currentStock;

    playScanBeep("beep");
    onAddCartKey(cartKey, 1);

    if (isOutOfStock) {
      // Trigger prompt to restock & update catalog prices
      setRestockItem(item);
      setRestockQty("10");
      setRestockCost(String(item.costPrice || 0));
      setRestockSelling(String(item.sellingPrice || 0));
      toast.warning(`Simulated Scan: "${item.name}" is OUT OF STOCK. Added to cart anyway. Update stock using the dialog.`, {
        duration: 5000,
      });
    } else {
      toast.success(`Simulated Scan: ${item.name}`);
    }

    if (!isCameraActive) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const updateQuantity = (itemId: string, diff: number) => {
    const item = items.find(i => i.id === itemId);
    const cartKey = buildCartKey(itemId, item?.unit || "pcs", "retail");
    const curr = cart.get(cartKey) ?? 0;

    if (diff > 0) {
      if (item && item.currentStock !== undefined && curr >= item.currentStock) {
        playScanBeep("error");
        toast.error(`No stock for "${item.name}" (${item.currentStock} available).`);
        return;
      }
    }

    const nextVal = curr + diff;
    if (nextVal <= 0) {
      onRemoveCartKey(cartKey);
    } else {
      onSetCartKeyQuantity(cartKey, nextVal);
    }
  };

  const handleQuickCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Scan items first before checking out.");
      return;
    }

    const orderId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const sale: Omit<SaleTransaction, "id"> = {
      customerName: customerName.trim() || "Guest Customer",
      customerPhone: customerPhone.trim() || undefined,
      items: cartItems.map(ci => ({
        itemId: ci.item.id,
        itemName: ci.item.name,
        sku: ci.item.sku,
        quantity: ci.quantity,
        unitPriceNgn: ci.unitPrice,
        imageUrl: ci.item.imageUrl || undefined
      })),
      totalNgn: totalAmount,
      createdAt: new Date().toISOString()
    };

    try {
      await addSale(sale);
      playScanBeep("success");
      setCheckoutResult({ ...sale, id: orderId } as SaleTransaction);
      toast.success("Transaction verified & receipt compiled!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to commit quick checkout.");
    }
  };

  const startNewSession = () => {
    onClearCart();
    setCustomerName("");
    setCustomerPhone("");
    setCheckoutResult(null);
    setScanInput("");
    if (!isCameraActive) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Search state for simulated quick-scan triggers
  const [simulatorSearch, setSimulatorSearch] = useState("");
  
  const scannerSimulatorPills = useMemo<Item[]>(() => {
    if (!simulatorSearch.trim()) {
      return items.slice(0, 8); // show top 8 default items
    }
    const q = simulatorSearch.toLowerCase().trim();
    return items.filter(item => 
      item.name.toLowerCase().includes(q) || 
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.toLowerCase().includes(q))
    ).slice(0, 8); // limit to 8 results for beautiful layout
  }, [items, simulatorSearch]);

  if (checkoutResult) {
    return (
      <div className="flex-1 overflow-y-auto bg-muted/20 px-4 py-6 flex flex-col items-center justify-start min-h-full">
        <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl p-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight text-foreground">Sale Recorded Successfully!</h3>
            <p className="text-xs text-muted-foreground">The inventory was adjusted and a digital gatepass was issued.</p>
          </div>

          {/* Paper Ticket Wrapper */}
          <div className="bg-white dark:bg-black/30 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl relative shadow-sm text-left font-mono text-xs text-neutral-800 dark:text-neutral-200">
            {/* Edge border indicators */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-3.5 w-24 bg-primary rounded-b-lg flex items-center justify-center text-[7px] text-white font-sans font-extrabold tracking-widest">
              NEXA GATEPASS
            </div>

            <div className="text-center pt-3 border-b border-dashed border-neutral-300 dark:border-neutral-700 pb-3">
              <p className="text-[11px] font-sans font-bold tracking-wider text-muted-foreground uppercase">NEXA STORE</p>
              <h4 className="text-base font-bold text-foreground mt-0.5">{checkoutResult.id}</h4>
              <p className="text-[9px] text-muted-foreground mt-1">
                {new Date(checkoutResult.createdAt).toLocaleString()}
              </p>
            </div>

            {/* QR Verification Node */}
            <div className="my-5 flex flex-col items-center justify-center gap-1.5 py-1">
              <div className="p-2.5 bg-white border border-neutral-150 rounded-xl shadow-inner">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: checkoutResult.id,
                    total: checkoutResult.totalNgn,
                    items: checkoutResult.items.length,
                    date: checkoutResult.createdAt,
                    verified: "TRUE"
                  })}
                  size={120}
                  level="M"
                />
              </div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider text-center">Cashier clearance barcode ticket</p>
            </div>

            {/* Items rows */}
            <div className="space-y-1.5 pb-3 font-mono">
              <p className="text-[10px] text-muted-foreground font-sans border-b border-neutral-100 dark:border-neutral-900 pb-1 font-bold">ITEMS BOUGHT</p>
              {checkoutResult.items.map((line, index) => (
                <div key={index} className="flex justify-between">
                  <span className="truncate max-w-[190px]">{line.itemName} x{line.quantity}</span>
                  <span>{NAIRA}{(line.unitPriceNgn * line.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <Separator className="border-dashed border-neutral-300 dark:border-neutral-700 my-2" />

            {/* Total rows */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="uppercase font-sans font-bold">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-medium">{checkoutResult.customerName}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-neutral-100 dark:border-neutral-900 pt-2 mt-1">
                <span>GRAND TOTAL:</span>
                <span>{NAIRA}{checkoutResult.totalNgn.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick printer and share action block */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline" 
              className="h-10 rounded-xl gap-2 text-xs"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Print Ticket
            </Button>
            <Button
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-2 text-xs text-white"
              onClick={() => {
                const itemString = checkoutResult.items.map((i) => `• ${i.itemName} x${i.quantity}`).join("\n");
                const text = `*New Sale Confirmed!* 🧾\n*Receipt:* ${checkoutResult.id}\n*Customer:* ${checkoutResult.customerName}\n\n*Items Purchased:*\n${itemString}\n\n*Total Paid:* ${NAIRA}${checkoutResult.totalNgn.toLocaleString()}\n\nThank you for shopping with NEXA STORE!`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
              }}
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp Share
            </Button>
          </div>

          <Button 
            className="w-full h-12 rounded-2xl font-bold bg-primary hover:brightness-110 shadow-lg shadow-primary/20 text-xs" 
            onClick={startNewSession}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Scan Next Customer / Reset POS
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-background animate-in fade-in duration-200">
      
      {/* LEFT PANEL: Interactive Scanner and Barcode Input */}
      <div className="flex-1 p-4 lg:p-6 flex flex-col space-y-4 border-r border-border overflow-y-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Scan className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Active Barcode Register</h2>
            <p className="text-[11px] text-muted-foreground">Place product close to active laser sensor or type SKU code.</p>
          </div>
        </div>

        {/* MAPPING CONTROLS & DUAL SCAN MODE EXPLANATIONS */}
        <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] font-black tracking-widest text-primary uppercase">Scan Mode Mapping & Pathways</span>
              <h3 className="text-xs font-bold text-foreground">Specify scanner mapping algorithm</h3>
            </div>
            <div className="flex gap-1 bg-muted p-1 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => setSelectedScanMode("auto")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  selectedScanMode === "auto"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-foreground/10"
                }`}
              >
                Auto-Detect
              </button>
              <button
                type="button"
                onClick={() => setSelectedScanMode("store_qr")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  selectedScanMode === "store_qr"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-foreground/10"
                }`}
              >
                Store QR
              </button>
              <button
                type="button"
                onClick={() => setSelectedScanMode("manufacturer_code")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  selectedScanMode === "manufacturer_code"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-foreground/10"
                }`}
              >
                Mfg Barcode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-muted-foreground">
            <div className={`p-3 rounded-xl border transition-all ${
              selectedScanMode === "store_qr" || selectedScanMode === "auto"
                ? "bg-card border-primary/20 text-foreground"
                : "bg-muted/10 border-transparent opacity-60"
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1 text-primary text-[11px]">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Store QR Code Map
              </div>
              <p className="text-[10px] text-muted-foreground">
                Matches customized tags printed inside your store. Decodes embedded JSON string <code className="font-mono bg-muted px-1 text-[9px]">{"{id: '...'}"}</code> or custom product ID labels directly to resolve catalog products.
              </p>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${
              selectedScanMode === "manufacturer_code" || selectedScanMode === "auto"
                ? "bg-card border-primary/20 text-foreground"
                : "bg-muted/10 border-transparent opacity-60"
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1 text-primary text-[11px]">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Manufacturer QR / Barcode Map
              </div>
              <p className="text-[10px] text-muted-foreground">
                Decodes standard barcodes (UPC, EAN) on product packaging. Automatically maps barcode numeric values directly to corresponding SKU indices in your inventory records.
              </p>
            </div>
          </div>
        </div>

        {/* Laser / Scanner feedback visualizor */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-2 relative overflow-hidden flex flex-col items-center justify-center aspect-[16/7] min-h-[180px] shadow-inner">
          {isCameraActive ? (
            <div className="w-full h-full relative flex items-center justify-center">
              {/* Camera view-port container */}
              <div id="camera-reader" className="w-full h-full rounded-2xl overflow-hidden bg-black [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
              
              {/* Overlay laser target over the video feed */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[2px] bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse pointer-events-none"></div>
              
              <Button 
                type="button"
                variant="destructive"
                size="sm"
                onClick={stopScanning}
                className="absolute bottom-3 right-3 rounded-xl gap-1 text-[10px] font-bold"
              >
                <AlertCircle className="h-3.5 w-3.5" /> Stop Camera
              </Button>
            </div>
          ) : (
            <>
              {/* Target Alignment corner ticks */}
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary/40 rounded-tl"></div>
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary/40 rounded-tr"></div>
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-primary/40 rounded-bl"></div>
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-primary/40 rounded-br"></div>
              
              {/* Pulsing visual core red laser line */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse"></div>

              <div className="z-10 text-center space-y-2.5">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-primary/70 uppercase">Scanner Status</p>
                  <h4 className="text-sm font-mono font-bold text-white tracking-widest">● READY FOR SCANNING</h4>
                </div>
                
                <Button 
                  type="button" 
                  onClick={startScanning}
                  className="bg-primary/95 hover:bg-primary text-primary-foreground h-9 px-4 rounded-xl text-xs font-bold gap-1.5 shadow-md shadow-primary/10 transition-all"
                >
                  <Scan className="h-3.5 w-3.5" /> Turn On Camera Scanner
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Direct manual keyboard scanner input */}
        <form 
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            handleScanOrSubmit(scanInput);
          }}
          className="space-y-2"
        >
          <Label className="text-xs font-bold text-muted-foreground tracking-widest uppercase">UPC / SKU Input Box</Label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan bar (e.g. STK-1001, STK-1002)..."
              className="h-12 font-mono rounded-xl focus-visible:ring-primary shadow-sm text-sm"
              autoFocus
            />
            <Button type="submit" size="lg" className="h-12 px-6 rounded-xl font-bold bg-primary hover:brightness-110">
              Enter Scan
            </Button>
          </div>
        </form>

        {/* DEMO SIMULATION SHORTCUT ACTIONS: Rapid Laser test click */}
        <div className="space-y-2.5 pt-2 border-t border-border mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Interactive Simulation Triggers</Label>
              <p className="text-[10px] text-muted-foreground">Click any product to simulate a real-world hardware scan beep.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Input
                value={simulatorSearch}
                onChange={(e) => setSimulatorSearch(e.target.value)}
                placeholder="Search items to scan..."
                className="w-full sm:w-40 h-8 text-[11px] font-sans rounded-lg bg-muted/20"
              />

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleScanOrSubmit("6151100021183")}
                  className="h-8 text-[10px] font-bold rounded-lg border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                >
                  🥛 Non-Store Barcode
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleScanOrSubmit(JSON.stringify({ name: "Specialized Premium QR Item", price: 6500, category: "Electronics", unit: "pcs" }))}
                  className="h-8 text-[10px] font-bold rounded-lg border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                >
                  🏷️ Non-Store QR
                </Button>
              </div>
            </div>
          </div>

          {scannerSimulatorPills.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {scannerSimulatorPills.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSimulateScan(item)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border border-border bg-card hover:border-primary/50 text-center relative overflow-hidden transition-all active:scale-95 ${
                    laserActive === item.id ? "bg-red-500/10 border-red-500/50 shadow-inner" : ""
                  }`}
                >
                  {/* Visual red laser flash transition over item chip */}
                  {laserActive === item.id && (
                    <div className="absolute inset-0 bg-red-400/20 flex items-center justify-center">
                      <div className="w-full h-1 bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
                    </div>
                  )}
                  
                  <span className="text-2xl mb-1">📦</span>
                  <span className="text-[11px] font-bold text-foreground truncate w-full px-1">{item.name}</span>
                  <span className="font-mono text-[9px] text-muted-foreground mt-0.5">{item.sku || "No SKU"}</span>
                  {item.currentStock !== undefined && (
                    <span className="text-[8px] text-muted-foreground font-semibold mt-0.5">Stock: {item.currentStock}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 border border-dashed border-border rounded-2xl text-center">
              <span className="text-xs text-muted-foreground">No catalog items matched your simulation search.</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Currently Scanned Items & Total Checkout Details */}
      <div className="w-full lg:w-[420px] bg-muted/10 p-4 lg:p-6 flex flex-col space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Scanned Items</h3>
          </div>
          <Badge variant="secondary" className="font-mono bg-primary/10 text-primary rounded-full px-2.5">
            {cartItems.reduce((acc, ci) => acc + ci.quantity, 0)} items scanned
          </Badge>
        </div>

        {/* Items scroll area */}
        <div className="flex-1 min-h-[160px] border border-border bg-card rounded-2xl p-3 overflow-y-auto space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 py-8 space-y-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Scanned items basket is currently empty.</p>
              <p className="text-[10px] text-muted-foreground/60">Type a SKU above or click simulation triggers to add.</p>
            </div>
          ) : (
            cartItems.map(ci => (
              <div 
                key={ci.item.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/20 border border-border/30 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center text-lg shadow-sm">
                    {ci.item.imageUrl ? <img src={ci.item.imageUrl} alt="" className="h-full w-full object-cover rounded-lg" /> : "📦"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-foreground leading-snug">{ci.item.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground leading-none mt-0.5">{ci.item.sku} · {NAIRA}{ci.unitPrice.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border border-border rounded-lg bg-card shadow-sm">
                    <button 
                      type="button" 
                      onClick={() => updateQuantity(ci.item.id, -1)}
                      className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold font-mono text-foreground">{ci.quantity}</span>
                    <button 
                      type="button" 
                      onClick={() => updateQuantity(ci.item.id, 1)}
                      className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-transform"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onRemoveCartKey(ci.cartKey);
                      playScanBeep("error");
                    }}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CUSTOMER INFO COLLAPSE (Optional) */}
        <div className="space-y-2 border border-border/80 bg-card p-3 rounded-2xl">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Customer & Payment Meta</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">Name (optional)</span>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  placeholder="John Doe" 
                  className="w-full pl-7 px-2 py-1.5 text-xs bg-muted/40 border border-border rounded-lg outline-none focus:border-primary font-medium"
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">Phone (optional)</span>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <input 
                  type="tel" 
                  value={customerPhone} 
                  onChange={e => setCustomerPhone(e.target.value)} 
                  placeholder="080 000 0000" 
                  className="w-full pl-7 px-2 py-1.5 text-xs bg-muted/40 border border-border rounded-lg outline-none focus:border-primary font-mono font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PAYMENT CHIPS METHOD */}
        <div className="space-y-2 bg-card border border-border/60 p-3 rounded-2xl">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Verify Payment Method</span>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {([
              { id: "cash" as const, label: "Cash", icon: Banknote },
              { id: "transfer" as const, label: "Transfer", icon: Smartphone },
              { id: "card" as const, label: "Card", icon: CreditCard },
            ]).map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.id);
                    playScanBeep("beep");
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[11px] font-bold transition-all ${
                    isSelected 
                      ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/15" 
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SPEED RUN TAX CALCULATIONS */}
        <div className="bg-card border border-border rounded-2xl p-3.5 space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span className="font-mono text-foreground font-semibold">{NAIRA}{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Standard VAT ({taxRate}%):</span>
            <span className="font-mono text-foreground font-semibold">+{NAIRA}{taxAmount.toLocaleString()}</span>
          </div>
          <Separator className="my-1.5" />
          <div className="flex justify-between text-sm font-bold text-foreground">
            <span>Payable Total:</span>
            <span className="font-mono text-primary text-base">{NAIRA}{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* COMPLETE CTA */}
        <Button
          size="lg"
          onClick={handleQuickCheckout}
          disabled={cartItems.length === 0}
          className="w-full h-12 rounded-2xl font-black text-sm shadow-xl shadow-primary/25 tracking-wider bg-primary hover:brightness-110 flex items-center justify-center gap-2"
        >
          <Check className="h-4 w-4" /> Verify & Complete Checkout
        </Button>
      </div>

      {/* Restock & Update Catalog Dialog */}
      <Dialog open={restockItem !== null} onOpenChange={(open) => { if (!open) setRestockItem(null); }}>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <AlertCircle className="h-5 w-5 text-amber-500 animate-bounce" />
              Restock & Update Catalog Stock
            </DialogTitle>
            <DialogDescription>
              &quot;{restockItem?.name}&quot; is out of stock (current catalog stock is {restockItem?.currentStock || 0}). 
              You can record the sale anyway and immediately restock the item in your inventory below.
            </DialogDescription>
          </DialogHeader>

          {restockItem && (
            <div className="space-y-4 py-2 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Restock Quantity</Label>
                  <Input 
                    type="number" 
                    value={restockQty} 
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="h-10 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Unit Cost (₦)</Label>
                  <Input 
                    type="number" 
                    value={restockCost} 
                    onChange={(e) => setRestockCost(e.target.value)}
                    className="h-10 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setRestockItem(null)}
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button 
                  onClick={async () => {
                    if (!restockItem) return;
                    setIsUpdatingStock(true);
                    try {
                      await new Promise<void>((resolve, reject) => {
                        updateItem.mutate({
                          id: restockItem.id,
                          updates: {
                            currentStock: (restockItem.currentStock || 0) + Number(restockQty || 0),
                            costPrice: Number(restockCost) || restockItem.costPrice,
                            sellingPrice: Number(restockSelling) || restockItem.sellingPrice,
                          }
                        }, {
                          onSuccess: () => resolve(),
          onError: (err: Error) => reject(err)
                        });
                      });
                      toast.success(`Restocked "${restockItem.name}" successfully!`);
                      setRestockItem(null);
                    } catch (err) {
                      toast.error("Failed to restock item.");
                    } finally {
                      setIsUpdatingStock(false);
                    }
                  }}
                  disabled={isUpdatingStock}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isUpdatingStock ? "Restocking..." : "Restock & Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unrecognized Scan Dialog - Save to Catalog */}
      <Dialog open={unrecognizedScan !== null} onOpenChange={(open) => { if (!open) setUnrecognizedScan(null); }}>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              New Product Detected
            </DialogTitle>
            <DialogDescription>
              This barcode/QR code is not in your catalog. Save it as a new product and add to the current sale.
            </DialogDescription>
          </DialogHeader>

          {unrecognizedScan && (
            <div className="space-y-4 py-2 text-left">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground">Scanned Code: <span className="font-mono font-bold text-foreground">{unrecognizedScan.code}</span></p>
                <p className="text-[10px] text-muted-foreground mt-1">Source: {unrecognizedScan.recognitionSource || "Manual Entry"}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Product Name *</Label>
                  <Input 
                    value={unrecognizedScan.name}
                    onChange={(e) => setUnrecognizedScan(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Selling Price (₦) *</Label>
                    <Input 
                      type="number"
                      value={unrecognizedScan.sellingPrice}
                      onChange={(e) => setUnrecognizedScan(prev => prev ? { ...prev, sellingPrice: e.target.value } : null)}
                      className="h-10 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Cost Price (₦)</Label>
                    <Input 
                      type="number"
                      value={unrecognizedScan.costPrice}
                      onChange={(e) => setUnrecognizedScan(prev => prev ? { ...prev, costPrice: e.target.value } : null)}
                      className="h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Initial Stock</Label>
                    <Input 
                      type="number"
                      value={unrecognizedScan.stock}
                      onChange={(e) => setUnrecognizedScan(prev => prev ? { ...prev, stock: e.target.value } : null)}
                      className="h-10 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Category</Label>
                    <Input 
                      value={unrecognizedScan.category}
                      onChange={(e) => setUnrecognizedScan(prev => prev ? { ...prev, category: e.target.value } : null)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setUnrecognizedScan(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveToCatalogAndSell}
                  disabled={isSavingNewItem || !unrecognizedScan.name.trim()}
                  className="flex-1 bg-primary"
                >
                  {isSavingNewItem ? "Saving..." : "Save & Add to Cart"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
