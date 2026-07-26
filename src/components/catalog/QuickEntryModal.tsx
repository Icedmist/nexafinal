import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Camera, 
  QrCode, 
  X, 
  Sparkles, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  TrendingDown,
  Percent
} from "lucide-react";
import { toast } from "sonner";
import { useCategories, useSuppliers } from "@/hooks/useInventoryData";
import { useCreateItem } from "@/hooks/useInventoryMutations";
import { ItemStatus, type Item } from "@/types/inventory";

// Dummy public barcode dataset for Nigerian FMCG / global brands
const PRE_POPULATED_BARCODES = [
  {
    barcode: "6151100021183",
    name: "Peak Milk Instant Powder 400g",
    category: "Beverages & Dairy",
    emoji: "🥛",
    imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    suggestedCostPrice: 3800,
    suggestedSellingPrice: 4500,
    brand: "Peak Milk",
    confidence: 98
  },
  {
    barcode: "6151122334455",
    name: "Indomie Instant Noodles Belle Full 280g",
    category: "Packaged Foods",
    emoji: "🍜",
    imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=200&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    suggestedCostPrice: 350,
    suggestedSellingPrice: 450,
    brand: "Indomie",
    confidence: 96
  },
  {
    barcode: "5449000000996",
    name: "Coca-Cola Bottle 50cl Original Taste",
    category: "Beverages & Dairy",
    emoji: "🥤",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    suggestedCostPrice: 200,
    suggestedSellingPrice: 250,
    brand: "Coca-Cola",
    confidence: 99
  },
  {
    barcode: "5011321773411",
    name: "Panadol Extra Pain Relief 10s",
    category: "Pharmacy",
    emoji: "💊",
    imageUrl: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    suggestedCostPrice: 850,
    suggestedSellingPrice: 1200,
    brand: "GSK",
    confidence: 95
  }
];

interface QuickEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEntryModal({ open, onOpenChange }: QuickEntryModalProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const startCameraScan = async () => {
    try {
      setIsScanningActive(true);
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode("catalog-camera-reader");
          html5QrcodeRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.75;
                return { width: size, height: size };
              },
            },
            async (decodedText) => {
              if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
                await html5QrcodeRef.current.stop();
              }
              setIsScanningActive(false);
              setBarcodeInput(decodedText);
              await handleManualLookup(decodedText);
            },
            () => {
              // Ignore frame errors
            }
          );
        } catch (err) {
          console.error("Failed to start catalog camera scan:", err);
          setIsScanningActive(false);
        }
      }, 400);
    } catch (e) {
      console.error(e);
    }
  };

  const stopCameraScan = async () => {
    try {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
      }
    } catch (e) {
      console.warn("Stop scanner error:", e);
    } finally {
      setIsScanningActive(false);
    }
  };

  useEffect(() => {
    if (open) {
      startCameraScan();
    } else {
      stopCameraScan();
    }
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(e => console.warn("Cleanup error:", e));
      }
    };
  }, [open]);
  
  // Results view states
  const [lookupResult, setLookupResult] = useState<typeof PRE_POPULATED_BARCODES[0] | null>(null);
  const [unrecognisedBarcode, setUnrecognisedBarcode] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Form fields
  const [productName, setProductName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [currentStock, setCurrentStock] = useState("50"); // default to 50 initial stock count
  const [reorderPoint, setReorderPoint] = useState("10");

  const createItem = useCreateItem();
  const { data: currentCategories } = useCategories();
  const firstCategory = currentCategories?.[0]?.id || null;

  // Simulate barcode scanner laser line animation
  const [laserPosition, setLaserPosition] = useState(0);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanningActive) {
      interval = setInterval(() => {
        setLaserPosition((pos) => (pos >= 100 ? 0 : pos + 2));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isScanningActive]);

  const resetForm = () => {
    setBarcodeInput("");
    setLookupResult(null);
    setUnrecognisedBarcode(null);
    setProductName("");
    setCategoryName("");
    setCustomCategoryName("");
    setCostPrice("");
    setSellingPrice("");
    setCurrentStock("50");
    setReorderPoint("10");
  };

  const handleManualLookup = async (code: string) => {
    if (!code) return;
    
    // Simulate laser animation and audio flash
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 200);

    // 1. Check local pre-populated database for immediate matching
    const match = PRE_POPULATED_BARCODES.find(
      (p) => p.barcode === code.trim() || p.barcode.endsWith(code.trim())
    );

    if (match) {
      setLookupResult(match);
      setUnrecognisedBarcode(null);
      setProductName(match.name);
      
      const foundCat = currentCategories?.find(c => c.name.toLowerCase() === match.category.toLowerCase());
      if (foundCat) {
        setCategoryName(foundCat.name);
        setCustomCategoryName("");
      } else {
        setCategoryName("custom");
        setCustomCategoryName(match.category);
      }

      setCostPrice(match.suggestedCostPrice.toString());
      setSellingPrice(match.suggestedSellingPrice.toString());
      toast.success(`Found standard local match: "${match.name}"!`);
      return;
    }

    // 2. Consult the live full-stack backend powered by Gemini AI Search
    setIsLookingUp(true);
    try {
      const response = await fetch("/api/barcode/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ barcode: code.trim() }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Recognition failed");
      }

      const data = await response.json();
      
      if (data && data.name) {
        setLookupResult({
          barcode: data.barcode || code.trim(),
          name: data.name,
          category: data.category || "General",
          emoji: data.emoji || "📦",
          suggestedCostPrice: data.suggestedCostPrice || 0,
          suggestedSellingPrice: data.suggestedSellingPrice || 0,
          brand: data.brand || "",
          confidence: data.confidence || 85,
          imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=60"
        });
        setUnrecognisedBarcode(null);
        setProductName(data.name);

        const foundCat = currentCategories?.find(c => c.name.toLowerCase() === (data.category || "General").toLowerCase());
        if (foundCat) {
          setCategoryName(foundCat.name);
          setCustomCategoryName("");
        } else {
          setCategoryName("custom");
          setCustomCategoryName(data.category || "General");
        }

        setCostPrice(data.suggestedCostPrice ? data.suggestedCostPrice.toString() : "");
        setSellingPrice(data.suggestedSellingPrice ? data.suggestedSellingPrice.toString() : "");
        toast.success(`Successfully recognized raw barcode via AI: "${data.name}"!`);
      } else {
        throw new Error("No properties recognized");
      }
    } catch (err) {
      console.error("Barcode lookup server-side error:", err);
      toast.info("Could not recognize brand via live scan db. Please input manual cataloging parameters.");
      setLookupResult(null);
      setUnrecognisedBarcode(code.trim());
      setProductName("");
      setCategoryName("");
      setCostPrice("");
      setSellingPrice("");
    } finally {
      setIsLookingUp(false);
    }
  };

  const triggerRecognisedBrandDemo = () => {
    setIsScanningActive(true);
    // Pick random barcode
    const item = PRE_POPULATED_BARCODES[Math.floor(Math.random() * PRE_POPULATED_BARCODES.length)];
    setBarcodeInput(item.barcode);
    
    setTimeout(async () => {
      setIsScanningActive(false);
      await handleManualLookup(item.barcode);
      toast.success("Successfully scanned! Found brand in global db.");
    }, 1500);
  };

  const triggerUnrecognisedBrandDemo = () => {
    setIsScanningActive(true);
    const mockBarcode = "6191" + Math.floor(100000000 + Math.random() * 900000000).toString();
    setBarcodeInput(mockBarcode);
    
    setTimeout(async () => {
      setIsScanningActive(false);
      await handleManualLookup(mockBarcode);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalBarcode = lookupResult?.barcode || unrecognisedBarcode;
    if (!finalBarcode) {
      toast.error("Please scan or specify a barcode first.");
      return;
    }

    if (!productName.trim()) {
      toast.error("Product name is required.");
      return;
    }

    if (!sellingPrice || isNaN(Number(sellingPrice))) {
      toast.error("Valid selling price is required.");
      return;
    }

    // Auto find category id or assign first
    const finalCategoryName = categoryName === "custom" ? customCategoryName : categoryName;

    let categoryId = firstCategory;
    if (finalCategoryName) {
      const matchCat = currentCategories?.find(c => c.name.toLowerCase() === finalCategoryName.toLowerCase());
      if (matchCat) {
        categoryId = matchCat.id;
      }
    }

    const newItem: Item = {
      id: `item-${Date.now()}`,
      sku: finalBarcode,
      barcode: finalBarcode,
      name: productName.trim(),
      description: `Auto-cataloged via Quick Barcode Scan. Category: ${finalCategoryName || "General"}.`,
      categoryId,
      status: ItemStatus.Active,
      unit: "pcs",
      currentStock: Number(currentStock) || 0,
      reorderPoint: Number(reorderPoint) || 10,
      reorderQuantity: 20,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice),
      locationId: null,
      supplierId: null,
      imageUrl: lookupResult?.imageUrl || null,
      customFields: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    createItem.mutate(newItem, {
      onSuccess: () => {
        toast.success(`Successfully saved "${productName}" to the catalog!`);
        resetForm();
      },
      onError: (err) => {
        toast.error("Failed to catalog item: " + err.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg bg-neutral-900 border-neutral-800 text-white overflow-hidden p-0 rounded-2xl shadow-2xl">
        
        {/* Banner header inside custom card */}
        <div className="bg-gradient-to-r from-emerald-950 to-neutral-900 p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-bold text-lg leading-tight text-white">Quick Entry</DialogTitle>
              <p className="text-xs text-neutral-400">Scan & catalog inventory items instantly</p>
            </div>
          </div>
          <button 
            onClick={() => onOpenChange(false)} 
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Scanning Container */}
          {!lookupResult && !unrecognisedBarcode ? (
            <div className="space-y-4">
              <div 
                className={`relative h-56 rounded-2xl border-2 overflow-hidden flex flex-col items-center justify-center transition-all ${
                  isScanningActive 
                    ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/5" 
                    : scanFlash 
                      ? "border-white bg-white/25" 
                      : "border-dashed border-neutral-700 bg-neutral-950"
                }`}
              >
                {/* Laser animation */}
                {isScanningActive && (
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10"
                    style={{ top: `${laserPosition}%` }}
                  />
                )}

                {/* Corner bracket overlay styles */}
                <div className="absolute top-4 left-4 h-5 w-5 border-t-2 border-l-2 border-neutral-600 rounded-tl-md z-10" />
                <div className="absolute top-4 right-4 h-5 w-5 border-t-2 border-r-2 border-neutral-600 rounded-tr-md z-10" />
                <div className="absolute bottom-4 left-4 h-5 w-5 border-b-2 border-l-2 border-neutral-600 rounded-bl-md z-10" />
                <div className="absolute bottom-4 right-4 h-5 w-5 border-b-2 border-r-2 border-neutral-600 rounded-br-md z-10" />

                {/* Live Camera Feed */}
                {isScanningActive ? (
                  <div id="catalog-camera-reader" className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-black [&>video]:object-cover [&>video]:w-full [&>video]:h-full z-0" />
                ) : (
                  <>
                    {/* Scan Status icon */}
                    <div className="p-4 rounded-full mb-3 bg-neutral-900 text-neutral-500">
                      <Camera className="h-8 w-8" />
                    </div>

                    <p className="text-sm font-bold text-neutral-200">
                      Camera ready — point card at barcode
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xs text-center px-4">
                      Using manufacturer codes allows matching with pre-loaded name, photo, and category data.
                    </p>
                  </>
                )}
              </div>

              {/* Manual Barcode input text */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">— or type the barcode —</span>
                <div className="flex gap-2">
                  <Input 
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    disabled={isLookingUp}
                    placeholder={isLookingUp ? "Consulting AI scan database..." : "Enter or type EAN/UPC barcode..."} 
                    className="bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600 focus:border-emerald-500 h-10 rounded-xl font-mono text-center tracking-wide"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleManualLookup(barcodeInput);
                    }}
                  />
                  <Button 
                    onClick={() => handleManualLookup(barcodeInput)}
                    disabled={isLookingUp}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold h-10 px-5 flex items-center gap-1.5"
                  >
                    {isLookingUp ? (
                      <>
                        <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        AI...
                      </>
                    ) : (
                      "Lookup"
                    )}
                  </Button>
                </div>
              </div>

              {/* Demo Simulators */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <Button 
                  onClick={triggerRecognisedBrandDemo}
                  disabled={isScanningActive}
                  variant="outline"
                  className="rounded-xl border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-neutral-300 gap-1.5 h-11 hover:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Demo: recognised brand
                </Button>
                <Button 
                  onClick={triggerUnrecognisedBrandDemo}
                  disabled={isScanningActive}
                  variant="outline"
                  className="rounded-xl border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-neutral-300 gap-1.5 h-11 hover:text-white"
                >
                  <Database className="h-3.5 w-3.5 text-neutral-500" />
                  Demo: unrecognised
                </Button>
              </div>
            </div>
          ) : (
            /* Results & Save Form Panel */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {lookupResult ? (
                /* Matches lookup database card (Image 2 representation) */
                <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-4 flex gap-4 items-center">
                  <div className="h-16 w-16 bg-neutral-950 rounded-xl border border-neutral-850 flex items-center justify-center text-4xl overflow-hidden shadow-inner">
                    {lookupResult.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-black tracking-widest gap-1">
                        <Sparkles className="h-2.5 w-2.5 animate-bounce" /> Smart Detected
                      </Badge>
                      <span className="text-[10px] text-neutral-500 font-bold font-mono">Confidence: {lookupResult.confidence}%</span>
                    </div>
                    <h4 className="font-bold text-sm text-neutral-100 leading-snug truncate">{lookupResult.name}</h4>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">Barcode ID: {lookupResult.barcode}</p>
                  </div>
                </div>
              ) : (
                /* Unknown/Unrecognised Product Form Setup (Image 3 representation) */
                <div className="bg-amber-955/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex gap-1.5 items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-500/10 p-1 rounded text-amber-500">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-amber-500 leading-none">Barcode Not recognised</span>
                    </div>
                    <Badge variant="outline" className="border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase bg-amber-500/5">
                      New product
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed mb-1.5">
                    No problem — the barcode is automatically pre-filled as the SKU. Just fill in what you know:
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono font-bold leading-none">Pre-filled Barcode SKU: {unrecognisedBarcode}</p>
                </div>
              )}

              {/* Inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Product name *</label>
                  <Input 
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter brand & description (e.g. Peak Milk 400g)"
                    className="bg-neutral-950 border-neutral-800 text-white placeholder-neutral-700 h-10 rounded-xl focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Category *</label>
                    <select
                      id="quick-entry-category-select"
                      required
                      value={categoryName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCategoryName(val);
                      }}
                      className="w-full bg-neutral-950 border border-neutral-800 text-white h-10 rounded-xl px-3 outline-none focus:border-emerald-500 text-xs cursor-pointer"
                    >
                      <option value="">Select Category...</option>
                      {currentCategories?.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="custom">+ Type custom...</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Initial stock *</label>
                    <Input 
                      type="number"
                      required
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                      placeholder="e.g. 50"
                      className="bg-neutral-950 border-neutral-800 text-white placeholder-neutral-700 h-10 rounded-xl focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {categoryName === "custom" && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Custom Category Name *</label>
                    <Input 
                      required
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="Enter custom category name..."
                      className="bg-neutral-950 border-neutral-800 text-white placeholder-neutral-700 h-10 rounded-xl focus:border-emerald-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Cost price (₦)</label>
                    <Input 
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="Our buying price..."
                      className="bg-neutral-950 border-neutral-800 text-white placeholder-neutral-700 h-10 rounded-xl focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Selling price (₦) *</label>
                    <Input 
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="Retail price..."
                      className="bg-neutral-950 border-neutral-800 text-white placeholder-neutral-750 font-bold h-10 rounded-xl focus:border-emerald-500 font-mono text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex gap-2.5 pt-4">
                <Button 
                  type="button" 
                  onClick={resetForm}
                  variant="outline"
                  className="rounded-xl border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-neutral-400 h-11 w-1/3 hover:text-white"
                >
                  Scan Again
                </Button>
                <Button 
                  type="submit"
                  disabled={createItem.isLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/10 font-bold rounded-xl h-11 flex-1 gap-2 border-0"
                >
                  <CheckCircle className="h-4.5 w-4.5" />
                  ADD TO CATALOG
                </Button>
              </div>

            </form>
          )}

          {/* Quick Stats bar inside popup card */}
          <div className="bg-neutral-950/40 p-4 border border-neutral-800 rounded-xl flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 leading-none">
              <Database className="h-3.5 w-3.5 text-neutral-500" />
              <span>Lookup Database Status:</span>
              <span className="text-emerald-400 font-bold">Online</span>
            </span>
            <span className="flex items-center gap-1.5 leading-none">
              <Layers className="h-3.5 w-3.5 text-neutral-500" />
              <span>Pre-loaded Catalog:</span>
              <span className="text-white font-bold">{PRE_POPULATED_BARCODES.length} Global Brands</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
