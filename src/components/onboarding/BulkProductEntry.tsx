import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Tag, ChevronDown, ChevronRight, Pill, PlusCircle, Sparkles, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type DrugLibraryItem } from "@/data/drugLibrary";
import { useDrugLibrary } from "@/hooks/useDrugLibrary";
import {
  predictCategoryAndUnit,
  getCategorySupportedUnits,
  getBuiltInProductSuggestions,
  CATEGORY_PRESETS,
} from "@/utils/categorySuggestions";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Category } from "@/types/inventory";
import { getLucideIcon } from "@/utils/lucideIconMap";

export interface PendingProduct {
  id: string;
  name: string;
  price: string;
  stock: string;
  unit: string;
  categoryId?: string;
  color?: string;
  sizes?: string;
  enableColours?: boolean;
  enableSizes?: boolean;
  fineTunedVariants?: Record<string, { price: number; stock: number }>;
  isPrescriptionOnly?: boolean;
  verificationStatus?: "verified" | "pending_review" | "rejected";
  source?: "nafdac_seed_v2" | "merchant_submitted" | "who_essential";
}

interface OnboardingVariantDialogProps {
  open: boolean;
  onClose: () => void;
  product: PendingProduct;
  onSave: (updatedProduct: PendingProduct) => void;
}

export function OnboardingVariantDialog({ open, onClose, product, onSave }: OnboardingVariantDialogProps) {
  const [enableColours, setEnableColours] = useState(false);
  const [enableSizes, setEnableSizes] = useState(false);
  const [availColours, setAvailColours] = useState<string[]>([]);
  const [availSizes, setAvailSizes] = useState<string[]>([]);
  const [newColourInput, setNewColourInput] = useState("");
  const [newSizeInput, setNewSizeInput] = useState("");
  const [fineTunedVariants, setFineTunedVariants] = useState<Record<string, { price: number; stock: number }>>({});
  const [showFineTune, setShowFineTune] = useState(true);

  useEffect(() => {
    if (open) {
      setEnableColours(!!product.enableColours);
      setEnableSizes(!!product.enableSizes);
      setAvailColours(product.color ? product.color.split(", ").filter(Boolean) : ["Red", "Blue", "Black"]);
      setAvailSizes(product.sizes ? product.sizes.split(", ").filter(Boolean) : ["S", "M", "L"]);
      setFineTunedVariants(product.fineTunedVariants || {});
    }
  }, [open, product]);

  const activeVariants = useMemo(() => {
    const colors = enableColours ? availColours : [];
    const sizes = enableSizes ? availSizes : [];
    const dimensions: string[][] = [];
    if (enableColours && colors.length > 0) dimensions.push(colors);
    if (enableSizes && sizes.length > 0) dimensions.push(sizes);
    if (dimensions.length === 0) return [];
    const cartesian = (arrays: string[][]): string[][] =>
      arrays.reduce<string[][]>((a, b) => a.flatMap((d) => b.map((e) => [...d, e])), [[]]);
    return cartesian(dimensions).map((arr) => arr.join(" - "));
  }, [enableColours, availColours, enableSizes, availSizes]);

  useEffect(() => {
    if (activeVariants.length === 0) return;
    const basePrice = Number(product.price) || 0;
    const baseStock = Number(product.stock) || 0;
    setFineTunedVariants((prev) => {
      const next: Record<string, { price: number; stock: number }> = {};
      activeVariants.forEach((vKey) => {
        next[vKey] = prev[vKey] || { price: basePrice, stock: baseStock };
      });
      return next;
    });
  }, [activeVariants, product.price, product.stock]);

  const handleAddColour = () => {
    const trimmed = newColourInput.trim();
    if (!trimmed) return;
    if (availColours.includes(trimmed)) { toast.error("Colour already added"); return; }
    setAvailColours((prev) => [...prev, trimmed]);
    setNewColourInput("");
  };

  const handleAddSize = () => {
    const trimmed = newSizeInput.trim();
    if (!trimmed) return;
    if (availSizes.includes(trimmed)) { toast.error("Size already added"); return; }
    setAvailSizes((prev) => [...prev, trimmed]);
    setNewSizeInput("");
  };

  const handleSave = () => {
    let finalFineTuned: Record<string, { price: number; stock: number }> | undefined = undefined;
    if (enableColours || enableSizes) {
      if (activeVariants.length === 0) { toast.error("Please add at least one color or size, or disable variants"); return; }
      finalFineTuned = fineTunedVariants;
    }
    onSave({ ...product, enableColours, enableSizes, color: enableColours ? availColours.join(", ") : undefined, sizes: enableSizes ? availSizes.join(", ") : undefined, fineTunedVariants: finalFineTuned });
    toast.success("Variants saved for " + product.name);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Configure Variants: <span className="text-primary">{product.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">Add colors, sizes, or custom dimensions for this product.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-3 border border-border/60 rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Enable Colours</span>
              <input type="checkbox" checked={enableColours} onChange={(e) => setEnableColours(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            </div>
            {enableColours && (
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex gap-2">
                  <Input value={newColourInput} onChange={(e) => setNewColourInput(e.target.value)} placeholder="e.g. Navy Blue" className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddColour())} />
                  <Button size="sm" onClick={handleAddColour} className="h-8 px-3 text-xs">Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availColours.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-accent text-accent-foreground">
                      {c}
                      <button type="button" onClick={() => setAvailColours((prev) => prev.filter((item) => item !== c))} className="text-muted-foreground hover:text-foreground">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3 border border-border/60 rounded-xl p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Enable Sizes</span>
              <input type="checkbox" checked={enableSizes} onChange={(e) => setEnableSizes(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            </div>
            {enableSizes && (
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex gap-2">
                  <Input value={newSizeInput} onChange={(e) => setNewSizeInput(e.target.value)} placeholder="e.g. XL" className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSize())} />
                  <Button size="sm" onClick={handleAddSize} className="h-8 px-3 text-xs">Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availSizes.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-accent text-accent-foreground">
                      {s}
                      <button type="button" onClick={() => setAvailSizes((prev) => prev.filter((item) => item !== s))} className="text-muted-foreground hover:text-foreground">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {activeVariants.length > 0 && (
            <div className="space-y-3 border border-border/60 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Generated Variants ({activeVariants.length})</span>
                <Button variant="ghost" size="sm" onClick={() => setShowFineTune(!showFineTune)} className="h-7 text-[11px] gap-1">
                  {showFineTune ? "Collapse" : "Expand"}
                  {showFineTune ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              </div>
              {showFineTune && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                  {activeVariants.map((vKey) => (
                    <div key={vKey} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-lg">
                      <span className="font-medium text-foreground truncate w-1/3">{vKey}</span>
                      <div className="flex items-center gap-2 w-2/3">
                        <div className="relative flex-1">
                          <Input type="number" value={fineTunedVariants[vKey]?.price ?? ""} onChange={(e) => setFineTunedVariants((prev) => ({ ...prev, [vKey]: { ...prev[vKey], price: Number(e.target.value) || 0 } }))} placeholder="Price" className="h-7 text-xs pl-5" />
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">₦</span>
                        </div>
                        <Input type="number" value={fineTunedVariants[vKey]?.stock ?? ""} onChange={(e) => setFineTunedVariants((prev) => ({ ...prev, [vKey]: { ...prev[vKey], stock: Number(e.target.value) || 0 } }))} placeholder="Stock" className="h-7 text-xs flex-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSave} className="h-9 text-xs">Save Variants</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BulkProductEntryProps {
  categories: { id: string; label: string; emoji: string; supportedUnits?: string[] }[];
  products: PendingProduct[];
  setProducts: React.Dispatch<React.SetStateAction<PendingProduct[]>>;
  businessType?: string;
}

export function BulkProductEntry({ products, setProducts, categories, businessType }: BulkProductEntryProps) {
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<PendingProduct | null>(null);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const isPharmacy = businessType === "pharmacy";
  const { searchDrugs } = useDrugLibrary(isPharmacy);

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customDrugName, setCustomDrugName] = useState("");
  const [customGenericName, setCustomGenericName] = useState("");
  const [customStrength, setCustomStrength] = useState("");
  const [customDosageForm, setCustomDosageForm] = useState("Tablet");
  const [customCategory, setCustomCategory] = useState("Analgesic");
  const [customDescription, setCustomDescription] = useState("");
  const [customManufacturer, setCustomManufacturer] = useState("");
  const [customIsRx, setCustomIsRx] = useState(false);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const addRow = () => {
    const firstCat = categories[0];
    const defaultUnit = firstCat?.supportedUnits && firstCat.supportedUnits.length > 0 ? firstCat.supportedUnits[0] : "pcs";
    setProducts((prev) => [...prev, { id: Math.random().toString(36).substring(2, 9), name: "", price: "", stock: "", unit: defaultUnit, categoryId: firstCat?.id || "" }]);
  };

  const removeRow = (id: string) => setProducts((prev) => prev.filter((p) => p.id !== id));

  const updateRow = (id: string, field: keyof PendingProduct, value: unknown) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const updateRowCategory = (id: string, newCatId: string) => {
    const catObj = categories.find((c) => c.id === newCatId);
    const newUnit = catObj?.supportedUnits?.[0] || "pcs";
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, categoryId: newCatId, unit: newUnit } : p)));
  };

  const handleSaveVariants = (updatedProduct: PendingProduct) =>
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));

  const handleSelectDrugSuggestion = (rowId: string, drug: DrugLibraryItem) => {
    const matchCat = categories.find((c) => c.label.toLowerCase().includes(drug.category.toLowerCase()) || drug.category.toLowerCase().includes(c.label.toLowerCase()));
    setProducts((prev) => prev.map((p) => p.id === rowId ? { ...p, name: drug.name + (drug.strength ? ` (${drug.strength})` : ""), categoryId: matchCat?.id || p.categoryId, unit: drug.dosageForm === "Syrup" || drug.dosageForm === "Liquid" ? "bottle" : "pcs", isPrescriptionOnly: drug.isPrescriptionOnly ?? drug.requiresPrescription ?? false, verificationStatus: drug.verificationStatus, source: drug.source } : p));
    setFocusedRowId(null);
    toast.success(`Autofilled details for ${drug.name}!`);
  };

  const handleSubmitCustomDrug = async () => {
    if (!customDrugName.trim()) { toast.error("Please enter drug name"); return; }
    setIsSubmittingCustom(true);
    try {
      const newDrug: Partial<DrugLibraryItem> = { name: customDrugName.trim(), genericName: customGenericName.trim() || customDrugName.trim(), strength: customStrength.trim() || "Standard", dosageForm: customDosageForm, category: customCategory, description: customDescription.trim() || "Custom merchant drug entry.", manufacturer: customManufacturer.trim() || "Local Merchant", isPrescriptionOnly: customIsRx, requiresPrescription: customIsRx, source: "merchant_submitted", verificationStatus: "pending_review", createdAt: new Date().toISOString() };
      await addDoc(collection(db, "drugLibrary"), newDrug);
      toast.success("Custom drug submitted for review and added to current list!");
      const firstCat = categories[0];
      setProducts((prev) => [...prev, { id: Math.random().toString(36).substring(2, 9), name: `${customDrugName} (${customStrength || "Custom"})`, price: "1000", stock: "10", unit: customDosageForm === "Syrup" ? "bottle" : "pcs", categoryId: firstCat?.id || "", isPrescriptionOnly: customIsRx, verificationStatus: "pending_review", source: "merchant_submitted" }]);
      setIsCustomModalOpen(false);
      setCustomDrugName(""); setCustomGenericName(""); setCustomStrength(""); setCustomDescription(""); setCustomManufacturer("");
    } catch (err) { console.error("Failed to submit custom drug:", err); toast.error("Failed to submit custom drug to database."); } finally { setIsSubmittingCustom(false); }
  };

  return (
    <div className="space-y-4">
      {isPharmacy && (
        <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-semibold">
            <Pill className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>NAFDAC/WHO Drug Library active for pharmacy autofill.</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsCustomModalOpen(true)} className="h-7 text-xs bg-white dark:bg-teal-900 border-teal-300 text-teal-800 dark:text-teal-100 hover:bg-teal-100 font-bold gap-1">
            <PlusCircle className="h-3.5 w-3.5" /> Add Custom Product
          </Button>
        </div>
      )}

      <div className="p-3 bg-muted/20 border border-border/80 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" /> Pre-built Category Product Templates (One-tap add)
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">Click to append to list</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
          {getBuiltInProductSuggestions().slice(0, 15).map((template, idx) => (
            <button key={idx} type="button" onClick={() => {
              const matchCat = categories.find((c) => c.label.toLowerCase().includes(template.categoryName.toLowerCase().split(" ")[0]) || template.categoryName.toLowerCase().includes(c.label.toLowerCase().split(" ")[0]));
              setProducts((prev) => [...prev, { id: Math.random().toString(36).substring(2, 9), name: template.name, price: template.estimatedPrice ? String(template.estimatedPrice) : "1500", stock: "50", unit: template.defaultUnit, categoryId: matchCat?.id || categories[0]?.id || "" }]);
              toast.success(`Added ${template.name} (${template.defaultUnit}) to products!`);
            }} className="text-[11px] px-2.5 py-1 rounded-xl border bg-card hover:bg-teal-50 hover:border-teal-300 dark:hover:bg-teal-950/40 text-foreground transition-all flex items-center gap-1 font-medium shadow-2xs">
              <span>{template.emoji ? (() => { const Icon = getLucideIcon(template.emoji); return <Icon className="h-3.5 w-3.5" />; })() : <Package className="h-3.5 w-3.5" />}</span>
              <span>{template.name}</span>
              <span className="text-[9px] text-teal-600 dark:text-teal-400 font-mono ml-0.5 uppercase">({template.defaultUnit})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {products.length > 0 && (
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.2fr_1fr_1fr_1.2fr_40px] gap-3 px-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <div>Product Name</div>
              <div>Category</div>
              <div>Price (₦)</div>
              <div>Stock</div>
              <div>Unit</div>
              <div>Options</div>
              <div className="text-center"></div>
            </div>
            {products.map((p) => {
              const currentCategoryVal = p.categoryId || categories[0]?.id || "";
              const catObj = categories.find((c) => c.id === currentCategoryVal);
              const categoryListFormatted: Category[] = categories.map((c) => ({ id: c.id, name: c.label, description: "", parentId: null, createdAt: "", updatedAt: "", supportedUnits: c.supportedUnits }));
              const allowedUnits = getCategorySupportedUnits(catObj?.label || currentCategoryVal, catObj ? { id: catObj.id, name: catObj.label, description: "", parentId: null, createdAt: "", updatedAt: "", supportedUnits: catObj.supportedUnits } : null);
              const rowPrediction = p.name.trim().length >= 2 ? predictCategoryAndUnit(p.name, categoryListFormatted) : null;
              const matchedSuggestions = isPharmacy && p.name.trim().length >= 2 ? searchDrugs(p.name) : [];

              return (
                <div key={p.id} className="group flex flex-col gap-3 md:grid md:grid-cols-[2fr_1.5fr_1.2fr_1fr_1fr_1.2fr_40px] md:gap-3 rounded-xl border border-muted-foreground/15 md:border-transparent p-4 md:p-1 relative transition-all duration-200 hover:border-primary/25 md:hover:bg-accent/10 md:rounded-lg">
                  <div className="absolute top-2 right-2 md:relative md:top-auto md:right-auto md:order-last md:flex md:items-center md:justify-center">
                    <Button variant="ghost" size="icon" onClick={() => removeRow(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100" title="Remove product">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1 md:space-y-0 relative">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Product Name</span>
                    <Input value={p.name} onChange={(e) => updateRow(p.id, "name", e.target.value)} onFocus={() => setFocusedRowId(p.id)} onBlur={() => setTimeout(() => setFocusedRowId(null), 250)} placeholder={isPharmacy ? "e.g. Paracetamol or Coartem" : "e.g. Silk Shirt"} className="h-10 text-sm rounded-xl focus-visible:ring-primary/20" />
                    {rowPrediction && rowPrediction.confidence !== "low" && (
                      <button type="button" onMouseDown={() => { updateRow(p.id, "categoryId", rowPrediction.matchedCategory?.id || currentCategoryVal); updateRow(p.id, "unit", rowPrediction.suggestedUnit); if (rowPrediction.builtInProduct?.estimatedPrice) updateRow(p.id, "price", String(rowPrediction.builtInProduct.estimatedPrice)); toast.success(`Set Category: ${rowPrediction.suggestedCategoryName} (${rowPrediction.suggestedUnit})`); }} className="mt-1 text-[10px] px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 dark:bg-teal-950/70 dark:text-teal-200 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 font-bold flex items-center gap-1 transition-all shadow-2xs">
                        <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>Category: {rowPrediction.suggestedCategoryName} ({rowPrediction.suggestedUnit})</span>
                      </button>
                    )}
                    {isPharmacy && focusedRowId === p.id && matchedSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-teal-200 rounded-lg shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="p-1.5 bg-teal-50 dark:bg-teal-950/40 text-[9px] font-extrabold text-teal-800 dark:text-teal-300 flex items-center justify-between">
                          <span>NAFDAC DRUG AUTOFILL MATCHES</span>
                          <span>{matchedSuggestions.length} items</span>
                        </div>
                        {matchedSuggestions.map((drug, idx) => (
                          <button key={`${drug.id || drug.name}-${idx}`} type="button" onMouseDown={() => handleSelectDrugSuggestion(p.id, drug)} className="w-full text-left p-2 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 flex items-center justify-between transition-colors">
                            <div>
                              <p className="text-xs font-bold text-foreground">{drug.name}</p>
                              <p className="text-[9px] text-muted-foreground">{drug.genericName} · {drug.strength}</p>
                            </div>
                            <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded uppercase", drug.isPrescriptionOnly || drug.requiresPrescription ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" : "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300")}>
                              {drug.isPrescriptionOnly || drug.requiresPrescription ? "Rx Only" : "OTC"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Category</span>
                    <Select value={currentCategoryVal} onValueChange={(v) => updateRowCategory(p.id, v)}>
                      <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-primary/20 bg-background"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id} className="text-xs py-2"><span className="mr-2">{(() => { const Icon = getLucideIcon(c.emoji); return <Icon className="h-3.5 w-3.5 inline" />; })()}</span><span>{c.label}</span></SelectItem>))}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Price (₦)</span>
                    <div className="relative">
                      <Input type="number" value={p.price} disabled={!!p.enableColours || !!p.enableSizes} onChange={(e) => updateRow(p.id, "price", e.target.value)} placeholder="2500" className="h-10 text-sm font-mono rounded-xl focus-visible:ring-primary/20 pl-6 disabled:opacity-75 disabled:bg-muted/10" />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">₦</span>
                    </div>
                  </div>

                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Stock</span>
                    <Input type="number" value={p.stock} disabled={!!p.enableColours || !!p.enableSizes} onChange={(e) => updateRow(p.id, "stock", e.target.value)} placeholder="100" className="h-10 text-sm font-mono rounded-xl focus-visible:ring-primary/20 disabled:opacity-75 disabled:bg-muted/10" />
                  </div>

                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Unit</span>
                    <Select value={p.unit} onValueChange={(v) => updateRow(p.id, "unit", v)}>
                      <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-primary/20 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>{allowedUnits.map((u) => (<SelectItem key={u.id} value={u.id} className="text-xs">{u.id}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 md:space-y-0 flex items-end">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Options</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedProductForVariants(p)} disabled={p.name.trim() === ""} className={cn("h-10 text-xs rounded-xl flex items-center justify-center gap-1 w-full md:w-full", (p.enableColours || p.enableSizes) ? "border-primary text-primary font-semibold" : "text-muted-foreground")}>
                      <Tag className="h-3.5 w-3.5" /><span>Variants</span>
                      {(p.enableColours || p.enableSizes) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" onClick={addRow} className="h-9 px-4 text-xs font-semibold rounded-xl border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/5 transition-all gap-1.5">
          <Plus className="h-4 w-4" /> Add Row
        </Button>
        {isPharmacy && (
          <Button type="button" variant="ghost" onClick={() => setIsCustomModalOpen(true)} className="h-9 text-xs text-teal-700 dark:text-teal-300 font-bold gap-1 hover:bg-teal-50 dark:hover:bg-teal-950/40">
            <PlusCircle className="h-3.5 w-3.5 text-teal-600" /> Add Custom Drug Entry
          </Button>
        )}
      </div>

      {selectedProductForVariants && (
        <OnboardingVariantDialog open={!!selectedProductForVariants} onClose={() => setSelectedProductForVariants(null)} product={selectedProductForVariants} onSave={handleSaveVariants} />
      )}

      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-teal-800 dark:text-teal-200">
              <Pill className="h-4 w-4 text-teal-600" /> Add Custom Drug / Product
            </DialogTitle>
            <DialogDescription className="text-xs">Can't find a medicine in the standard library? Add custom product details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Brand / Product Name *</label>
              <Input value={customDrugName} onChange={(e) => setCustomDrugName(e.target.value)} placeholder="e.g. Lonart Forte" className="h-9 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="font-semibold block mb-1">Active Ingredient</label><Input value={customGenericName} onChange={(e) => setCustomGenericName(e.target.value)} placeholder="e.g. Artemether/Lumefantrine" className="h-9 text-xs" /></div>
              <div><label className="font-semibold block mb-1">Strength</label><Input value={customStrength} onChange={(e) => setCustomStrength(e.target.value)} placeholder="e.g. 80mg/480mg" className="h-9 text-xs" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Dosage Form</label>
                <Select value={customDosageForm} onValueChange={setCustomDosageForm}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tablet" className="text-xs">Tablet</SelectItem>
                    <SelectItem value="Capsule" className="text-xs">Capsule</SelectItem>
                    <SelectItem value="Syrup" className="text-xs">Syrup/Liquid</SelectItem>
                    <SelectItem value="Injection" className="text-xs">Injection</SelectItem>
                    <SelectItem value="Ointment" className="text-xs">Ointment/Cream</SelectItem>
                    <SelectItem value="Sachet" className="text-xs">Sachet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Category</label>
                <Select value={customCategory} onValueChange={setCustomCategory}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Analgesic" className="text-xs">Analgesic</SelectItem>
                    <SelectItem value="Antibiotic" className="text-xs">Antibiotic</SelectItem>
                    <SelectItem value="Antimalarial" className="text-xs">Antimalarial</SelectItem>
                    <SelectItem value="Antihistamine" className="text-xs">Antihistamine</SelectItem>
                    <SelectItem value="Antacid/Gastro" className="text-xs">Antacid/Gastro</SelectItem>
                    <SelectItem value="Vitamin/Supplement" className="text-xs">Vitamin/Supplement</SelectItem>
                    <SelectItem value="General" className="text-xs">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="customIsRx" checked={customIsRx} onChange={(e) => setCustomIsRx(e.target.checked)} className="h-4 w-4 rounded border-teal-400 text-teal-600 focus:ring-teal-500" />
              <label htmlFor="customIsRx" className="font-semibold text-xs text-rose-600 dark:text-rose-400 cursor-pointer">Requires Doctor's Prescription (POM / Rx)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCustomModalOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSubmitCustomDrug} disabled={isSubmittingCustom} className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white">
              {isSubmittingCustom ? "Submitting..." : "Submit Custom Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
