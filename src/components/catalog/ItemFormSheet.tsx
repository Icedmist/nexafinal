import * as React from "react";
import { useEffect, useMemo } from "react";
import { HelpTooltip } from "@/components/shared/HelpTooltip";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Plus, PackagePlus, Tag, Boxes, Banknote, MapPin, Upload, Image as ImageIcon, Palette, Ruler, Layers, Sparkles } from "lucide-react";
import { uploadImage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Item, Category, Supplier, Location, ProductVariant } from "@/types/inventory";
import { ItemStatus, SUPPORTED_UNITS } from "@/types/inventory";
import type { Branch } from "@/types/tenant";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/contexts/TenantContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useDrugLibrary } from "@/hooks/useDrugLibrary";
import { generateProductDescription } from "@/lib/gemini";
import type { DrugLibraryItem } from "@/data/drugLibrary";
import {
  VARIANT_ATTRIBUTES,
  DEFAULT_SIZE_OPTIONS,
  DEFAULT_MATERIAL_OPTIONS,
  getAttributeOptions,
  getColorHex,
  generateVariantId,
  type VariantAttribute,
} from "@/lib/variants";
function generateSuggestedSku(pName: string): string {
  if (!pName || !pName.trim()) return "";
  const parts = pName.trim().toUpperCase().split(/\s+/);
  let base: string;
  if (parts.length >= 2) {
    base = parts.slice(0, 3).map((p) => p[0]).join("");
  } else {
    base = parts[0].slice(0, 3);
  }
  base = base.replace(/[^A-Z0-9]/g, "");
  if (!base) base = "PRD";
  return `${base}-001`;
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  locationId: z.string().optional(),
  branchId: z.string().optional(),
  unit: z.string().optional(),
  currentStock: z.coerce.number().min(0, "Stock cannot be negative"),
  reorderPoint: z.coerce.number().min(0, "Reorder point cannot be negative"),
  reorderQuantity: z.coerce.number().min(0, "Reorder quantity cannot be negative"),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative"),
  sellingPrice: z.coerce.number().min(0, "Selling price cannot be negative"),
  wholesalePrice: z.coerce.number().min(0, "Wholesale price cannot be negative"),
  distributorPrice: z.coerce.number().min(0, "Distributor price cannot be negative").optional(),
  // Pharmacy clinical specs
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  dosageForm: z.string().optional(),
  requiresPrescription: z.boolean().optional(),
  status: z.nativeEnum(ItemStatus),
  imageUrl: z.string().nullable().optional(),
  units: z.array(z.object({
    name: z.string().min(1, "Unit name is required"),
    conversionFactor: z.coerce.number().min(0.00001, "Conversion must be greater than 0"),
    sellingPrice: z.coerce.number().optional(),
  })).optional(),
  // Variant support
  variantAttributes: z.array(z.string()).optional(),
  selectedColors: z.array(z.string()).optional(),
  selectedSizes: z.array(z.string()).optional(),
  selectedMaterials: z.array(z.string()).optional(),
  variants: z.array(z.object({
    id: z.string(),
    attributes: z.record(z.string()),
    price: z.coerce.number().min(0),
    stock: z.coerce.number().min(0),
    sku: z.string().optional(),
  })).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  defaultBarcode?: string | null;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  branches: Branch[];
  existingSkus: string[];
  onSave: (data: Partial<Item>) => void;
  loading?: boolean;
}

interface VariantsSectionProps {
  control: ReturnType<typeof useForm<FormValues>>["control"];
  watch: ReturnType<typeof useForm<FormValues>>["watch"];
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  cardGroupCls: string;
  labelCls: string;
  inputCls: string;
}

function VariantsSection({ control, watch, setValue, errors, cardGroupCls, labelCls, inputCls }: VariantsSectionProps) {
  const variantAttributes = watch("variantAttributes") || [];
  const selectedColors = watch("selectedColors") || [];
  const selectedSizes = watch("selectedSizes") || [];
  const selectedMaterials = watch("selectedMaterials") || [];
  const variants = watch("variants") || [];
  const sellingPrice = watch("sellingPrice") || 0;

  const hasColour = variantAttributes.includes("Colour");
  const hasSize = variantAttributes.includes("Size");
  const hasMaterial = variantAttributes.includes("Material");

  // Generate variant combinations when selections change
  const generateVariants = () => {
    const colors = hasColour ? (selectedColors.length > 0 ? selectedColors : ["Default"]) : ["Default"];
    const sizes = hasSize ? (selectedSizes.length > 0 ? selectedSizes : ["Default"]) : ["Default"];
    const materials = hasMaterial ? (selectedMaterials.length > 0 ? selectedMaterials : ["Default"]) : ["Default"];

    const combos: ProductVariant[] = [];
    for (const color of colors) {
      for (const size of sizes) {
        for (const material of materials) {
          const attrs: Record<string, string> = {};
          if (hasColour) attrs["Colour"] = color;
          if (hasSize) attrs["Size"] = size;
          if (hasMaterial) attrs["Material"] = material;

          // Check if this variant already exists
          const existing = variants.find((v: ProductVariant) => {
            return Object.keys(attrs).every(k => v.attributes[k] === attrs[k]);
          });

          combos.push(existing || {
            id: generateVariantId(),
            attributes: attrs,
            price: sellingPrice,
            stock: 0,
          });
        }
      }
    }
    return combos;
  };

  // Regenerate variants when attributes or selections change
  const regenerateVariants = () => {
    const newVariants = generateVariants();
    setValue("variants", newVariants);
  };

  const toggleAttribute = (attr: string) => {
    const current = variantAttributes;
    const next = current.includes(attr)
      ? current.filter((a: string) => a !== attr)
      : [...current, attr];
    setValue("variantAttributes", next);

    // Clear selections for removed attributes
    if (attr === "Colour") setValue("selectedColors", []);
    if (attr === "Size") setValue("selectedSizes", []);
    if (attr === "Material") setValue("selectedMaterials", []);

    // Regenerate after state updates
    setTimeout(regenerateVariants, 0);
  };

  const toggleColor = (color: string) => {
    const current = selectedColors;
    const next = current.includes(color)
      ? current.filter((c: string) => c !== color)
      : [...current, color];
    setValue("selectedColors", next);
    setTimeout(regenerateVariants, 0);
  };

  const toggleSize = (size: string) => {
    const current = selectedSizes;
    const next = current.includes(size)
      ? current.filter((s: string) => s !== size)
      : [...current, size];
    setValue("selectedSizes", next);
    setTimeout(regenerateVariants, 0);
  };

  const toggleMaterial = (material: string) => {
    const current = selectedMaterials;
    const next = current.includes(material)
      ? current.filter((m: string) => m !== material)
      : [...current, material];
    setValue("selectedMaterials", next);
    setTimeout(regenerateVariants, 0);
  };

  const updateVariant = (index: number, field: string, value: number | string) => {
    const current = [...(variants as ProductVariant[])];
    current[index] = { ...current[index], [field]: value };
    setValue("variants", current);
  };

  const fillAll = (field: "price" | "stock", value: number) => {
    const current = (variants as ProductVariant[]).map((v) => ({ ...v, [field]: value }));
    setValue("variants", current);
  };

  const hasVariants = variantAttributes.length > 0;

  return (
    <div className={cardGroupCls}>
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Layers className="h-4 w-4" />
        <h3 className="font-semibold text-foreground">Variants</h3>
        {hasVariants && (
          <span className="ml-1 inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            new
          </span>
        )}
      </div>

      {/* Attribute Selector */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Which attributes does this product have?</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {VARIANT_ATTRIBUTES.map((attr) => {
              const isActive = variantAttributes.includes(attr);
              return (
                <button
                  key={attr}
                  type="button"
                  onClick={() => toggleAttribute(attr)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  {attr === "Colour" && <Palette className="h-3 w-3" />}
                  {attr === "Size" && <Ruler className="h-3 w-3" />}
                  {attr === "Material" && <Sparkles className="h-3 w-3" />}
                  {attr}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Swatches */}
        {hasColour && (
          <div>
            <label className={labelCls}>Colours in stock</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {getAttributeOptions("Colour").map((color) => {
                const isSelected = selectedColors.includes(color);
                const hex = getColorHex(color);
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => toggleColor(color)}
                    className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all",
                      isSelected
                        ? "border-emerald-600 ring-2 ring-emerald-600/30 scale-110"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                    style={{ backgroundColor: hex || "#e5e7eb" }}
                    title={color}
                  >
                    {isSelected && (
                      <svg className="h-4 w-4 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size Pills */}
        {hasSize && (
          <div>
            <label className={labelCls}>Sizes in stock</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DEFAULT_SIZE_OPTIONS.map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={cn(
                      "h-8 min-w-8 px-2 rounded-lg text-xs font-bold transition-all border",
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {size}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  const custom = prompt("Enter custom size:");
                  if (custom && !selectedSizes.includes(custom)) {
                    toggleSize(custom);
                  }
                }}
                className="h-8 px-2 rounded-lg text-xs font-bold border border-dashed border-border hover:border-emerald-500 text-muted-foreground hover:text-emerald-600 transition-all"
              >
                + custom
              </button>
            </div>
          </div>
        )}

        {/* Material Pills */}
        {hasMaterial && (
          <div>
            <label className={labelCls}>Materials in stock</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DEFAULT_MATERIAL_OPTIONS.map((material) => {
                const isSelected = selectedMaterials.includes(material);
                return (
                  <button
                    key={material}
                    type="button"
                    onClick={() => toggleMaterial(material)}
                    className={cn(
                      "h-8 px-2 rounded-lg text-xs font-bold transition-all border",
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {material}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  const custom = prompt("Enter custom material:");
                  if (custom && !selectedMaterials.includes(custom)) {
                    toggleMaterial(custom);
                  }
                }}
                className="h-8 px-2 rounded-lg text-xs font-bold border border-dashed border-border hover:border-emerald-500 text-muted-foreground hover:text-emerald-600 transition-all"
              >
                + custom
              </button>
            </div>
          </div>
        )}

        {/* Variant Grid */}
        {hasVariants && variants.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <label className={labelCls}>Variant grid — set price & stock per combination</label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-bold px-2"
                  onClick={() => {
                    const price = prompt("Set price for all variants:", String(sellingPrice));
                    if (price !== null) fillAll("price", Number(price));
                  }}
                >
                  Fill all
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_100px_80px] gap-2 px-3 py-2 bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>Variant</span>
                <span className="text-right">Price (₦)</span>
                <span className="text-right">Stock</span>
              </div>

              {/* Rows */}
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border/50">
                {variants.map((variant: ProductVariant, index: number) => {
                  const label = Object.values(variant.attributes).join(" / ");
                  const colorHex = variant.attributes["Colour"] ? getColorHex(variant.attributes["Colour"]) : null;

                  return (
                    <div
                      key={variant.id}
                      className="grid grid-cols-[1fr_100px_80px] gap-2 px-3 py-2.5 items-center hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {colorHex && (
                          <span
                            className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: colorHex }}
                          />
                        )}
                        <span className="text-xs font-bold truncate">{label}</span>
                      </div>
                      <div>
                        <input
                          type="number"
                          value={variant.price || ""}
                          onChange={(e) => updateVariant(index, "price", Number(e.target.value))}
                          className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs font-mono text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={variant.stock || ""}
                          onChange={(e) => updateVariant(index, "stock", Number(e.target.value))}
                          className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs font-mono text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-2 text-[9px] text-muted-foreground italic">
              Leave stock as 0 if this combination is not available. It will show as "sold out" at POS.
            </p>
          </div>
        )}

        {hasVariants && variants.length === 0 && (
          <p className="text-xs text-muted-foreground italic mt-2">
            Select colours, sizes, or materials above to generate variant combinations.
          </p>
        )}
      </div>
    </div>
  );
}

export function ItemFormSheet({
  open,
  onOpenChange,
  item,
  defaultBarcode,
  categories,
  suppliers,
  locations,
  branches,
  existingSkus,
  onSave,
  loading,
}: ItemFormSheetProps) {
  const { isAdmin } = useRole();
  const { store } = useTenant();
  const { profile } = useBusiness();
  const isEdit = !!item;
  const [isUploading, setIsUploading] = React.useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = React.useState(false);

  const businessType = profile?.businessType || "retail";
  const isPharmacy = businessType === "pharmacy";
  const { searchDrugs } = useDrugLibrary(isPharmacy);

  const { register, handleSubmit, reset, control, formState: { errors }, setError, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      categoryId: "",
      supplierId: "",
      locationId: "",
      branchId: "all",
      unit: "each",
      currentStock: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      distributorPrice: 0,
      expiryDate: "",
      batchNumber: "",
      dosageForm: "",
      requiresPrescription: false,
      status: ItemStatus.Active,
      imageUrl: null,
      variantAttributes: [],
      selectedColors: [],
      selectedSizes: [],
      selectedMaterials: [],
      variants: [],
    },
  });

  const watchedName = watch("name") || "";
  const matchedDrugs = useMemo(() => {
    if (!isPharmacy || isEdit || watchedName.trim().length < 2) return [];
    return searchDrugs(watchedName);
  }, [isPharmacy, isEdit, watchedName, searchDrugs]);

  const handleMagicWrite = async () => {
    if (!watchedName.trim()) {
      import("sonner").then(({ toast }) => toast.error("Enter a product name first to generate a description"));
      return;
    }
    try {
      setIsGeneratingDesc(true);
      let desc = "";
      try {
        const catId = watch("categoryId");
        const catName = catId && catId !== "none" ? categories.find((c) => c.id === catId)?.name : "";
        desc = await generateProductDescription(watchedName, catName || "");
      } catch (e) {
        desc = "";
      }
      if (!desc) {
        desc = `${watchedName} — premium quality, competitively priced. Ideal for retail and bulk buyers.`;
      }
      setValue("description", desc);
      import("sonner").then(({ toast }) => toast.success("Description generated"));
    } catch (e) {
      import("sonner").then(({ toast }) => toast.error("Failed to generate description"));
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleApplyDrug = (drug: DrugLibraryItem) => {
    setValue("name", drug.name);
    setValue("description", drug.description || `${drug.name} ${drug.strength ? `(${drug.strength}) ` : ""}${drug.genericName}.`);
    const catName = drug.category;
    const matchedCat = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    if (matchedCat) setValue("categoryId", matchedCat.id);
    setValue("dosageForm", drug.dosageForm || "");
    setValue("requiresPrescription", drug.requiresPrescription || drug.isPrescriptionOnly || false);
  };

  // Auto-suggest a SKU from the product name on new items
  useEffect(() => {
    if (!isEdit && watchedName.trim() && !watch("sku")) {
      setValue("sku", generateSuggestedSku(watchedName), { shouldValidate: false });
    }
  }, [watchedName, isEdit, setValue, watch]);

  const imageUrl = watch("imageUrl");
  const watchedVariantAttrs = watch("variantAttributes") || [];
  const watchedVariants = watch("variants") || [];
  const hasActiveVariants = watchedVariantAttrs.length > 0 && watchedVariants.length > 0;
  const variantStockTotal = hasActiveVariants
    ? watchedVariants.reduce((sum, v) => sum + (v.stock || 0), 0)
    : 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const result = await uploadImage(file, "products");
      setValue("imageUrl", result.url);
      import("sonner").then(({ toast }) => {
        toast.success("Image uploaded successfully");
      });
    } catch (error) {
      import("sonner").then(({ toast }) => {
        toast.error("Failed to upload image");
      });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (item) {
        // Derive selected colors/sizes/materials from existing variants
        const variantAttrs = item.variantAttributes || [];
        const variants = item.variants || [];
        const selectedColors = [...new Set(variants.map(v => v.attributes["Colour"]).filter(Boolean))];
        const selectedSizes = [...new Set(variants.map(v => v.attributes["Size"]).filter(Boolean))];
        const selectedMaterials = [...new Set(variants.map(v => v.attributes["Material"]).filter(Boolean))];

        reset({
          name: item.name,
          sku: item.sku,
          barcode: item.barcode || "",
          description: item.description || "",
          categoryId: item.categoryId ?? "",
          supplierId: item.supplierId ?? "",
          locationId: item.locationId ?? "",
          branchId: item.branchId ?? "all",
          unit: item.unit || "each",
          currentStock: item.currentStock,
          reorderPoint: item.reorderPoint,
          reorderQuantity: item.reorderQuantity,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          wholesalePrice: item.wholesalePrice ?? 0,
          // If no distinct distributor tier is stored, treat it as equal to wholesale
          distributorPrice: item.pricingTiers?.distributor ?? item.wholesalePrice ?? 0,
          expiryDate: item.pharmacy?.expiryDate || "",
          batchNumber: item.pharmacy?.batchNumber || "",
          dosageForm: item.pharmacy?.dosageForm || "",
          requiresPrescription: item.pharmacy?.requiresPrescription || false,
          status: item.status,
          imageUrl: item.imageUrl || null,
          units: item.units || [],
          variantAttributes: variantAttrs,
          selectedColors,
          selectedSizes,
          selectedMaterials,
          variants,
        });
      } else {
        reset({
          name: "",
          sku: "",
          barcode: defaultBarcode || "",
          description: "",
          categoryId: "none",
          supplierId: "none",
          locationId: "none",
          branchId: "all",
          unit: "each",
          currentStock: 0,
          reorderPoint: 0,
          reorderQuantity: 0,
          costPrice: 0,
          sellingPrice: 0,
          wholesalePrice: 0,
          distributorPrice: 0,
          expiryDate: "",
          batchNumber: "",
          dosageForm: "",
          requiresPrescription: false,
          status: ItemStatus.Active,
          imageUrl: null,
          units: [],
          variantAttributes: [],
          selectedColors: [],
          selectedSizes: [],
          selectedMaterials: [],
          variants: [],
        });
      }
    }
  }, [open, item, defaultBarcode, reset]);

  const onSubmit = (data: FormValues) => {
    // Check for SKU conflict manually before proceeding
    const isSkuChanging = !isEdit || (item && item.sku !== data.sku);
    if (isSkuChanging && existingSkus.includes(data.sku)) {
      setError("sku", { message: "This SKU is already assigned to another product" });
      import("sonner").then(({ toast }) => {
        toast.error("Validation Error: SKU already exists");
      });
      return;
    }

    // Clean up "none" values and empty strings for optional fields
    const cleanedData = {
      ...data,
      description: data.description?.trim() || "",
      categoryId: (data.categoryId === "none" || !data.categoryId) ? null : data.categoryId,
      supplierId: (data.supplierId === "none" || !data.supplierId) ? null : data.supplierId,
      locationId: (data.locationId === "none" || !data.locationId) ? null : data.locationId,
      branchId: (data.branchId === "all" || !data.branchId) ? null : data.branchId,
    };
    
    // Stock is managed manually as requested, even for variant products
    // (Bypassed automatic variant stock calculation)

    // Ensure numeric fields are numbers
    const finalData = {
      ...cleanedData,
      currentStock: hasActiveVariants ? variantStockTotal : cleanedData.currentStock,
      units: cleanedData.units?.map(u => ({
        ...u,
        conversionFactor: Number(u.conversionFactor),
        sellingPrice: u.sellingPrice !== undefined && u.sellingPrice !== null ? Number(u.sellingPrice) : undefined
      })),
      wholesalePrice: cleanedData.wholesalePrice !== undefined && cleanedData.wholesalePrice !== null ? Number(cleanedData.wholesalePrice) : 0,
      // Tiered pricing (retail/wholesale/distributor)
      pricingTiers: (cleanedData.wholesalePrice || cleanedData.distributorPrice)
        ? {
            retail: cleanedData.sellingPrice ?? 0,
            ...(cleanedData.wholesalePrice ? { wholesale: Number(cleanedData.wholesalePrice) } : {}),
            ...(cleanedData.distributorPrice ? { distributor: Number(cleanedData.distributorPrice) } : {}),
            tierEnabled: true,
          }
        : undefined,
      // Pharmacy clinical specs
      pharmacy: isPharmacy
        ? {
            ...(cleanedData.expiryDate ? { expiryDate: cleanedData.expiryDate } : {}),
            ...(cleanedData.batchNumber?.trim() ? { batchNumber: cleanedData.batchNumber.trim() } : {}),
            ...(cleanedData.dosageForm ? { dosageForm: cleanedData.dosageForm } : {}),
            requiresPrescription: cleanedData.requiresPrescription || false,
          }
        : undefined,
      // Variant support: pass through variantAttributes and variants
      variantAttributes: cleanedData.variantAttributes || [],
      variants: cleanedData.variants || [],
    };
  
    onSave(finalData as any);
  };

  const onInvalid = (errors: any) => {
    const errorMessages = Object.entries(errors)
      .map(([field, error]: [string, any]) => {
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
        return `${fieldName}: ${error.message}`;
      })
      .join("\n");
    
    import("sonner").then(({ toast }) => {
      toast.error("Please fix the following errors:", {
        description: errorMessages,
        duration: 5000,
      });
    });
  };

  const inputCls = "h-10 w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-background px-3 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const labelCls = "text-sm font-medium text-foreground";
  const errCls = "text-xs text-destructive mt-1";
  const cardGroupCls = "rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-card p-5 shadow-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <div className="nexa-card bg-card flex flex-col max-h-[90vh]">
          <div className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PackagePlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">{isEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inventory Cataloging</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

        <div className="overflow-y-auto p-6 scroll-smooth">
          <form id="item-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            
            {/* Image Upload Section */}
            <div className={cardGroupCls}>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <ImageIcon className="h-4 w-4" />
                <h3 className="font-semibold text-foreground">Product Image</h3>
              </div>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative group h-40 w-full sm:w-64 rounded-xl border-2 border-dashed border-emerald-100 dark:border-emerald-900/30 overflow-hidden flex items-center justify-center bg-muted/20">
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Product" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => setValue("imageUrl", null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-8 w-8 opacity-20" />
                      <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                    </div>
                  )}
                  
                  {isUploading && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Uploading...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="rounded-lg h-9 font-bold uppercase tracking-widest text-[10px] relative overflow-hidden"
                    disabled={isUploading}
                  >
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    {imageUrl ? "Change Image" : "Upload Image"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-center">
                    PNG, JPG or WebP. Max 1MB. (Auto-compressed)
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className={cardGroupCls}>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <Tag className="h-4 w-4" />
                <h3 className="font-semibold text-foreground">Basic Details</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Product Name *</label>
                  <input {...register("name")} className={`${inputCls} mt-1.5`} placeholder="e.g. Wireless Mouse" />
                  {errors.name && <p className={errCls}>{errors.name.message}</p>}
                  {isPharmacy && matchedDrugs.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
                      <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 bg-amber-500/10">
                        Inbuilt NAFDAC/WHO drug suggestions
                      </div>
                      <ul className="max-h-40 overflow-y-auto divide-y divide-border/60">
                        {matchedDrugs.map((drug, idx) => (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => handleApplyDrug(drug)}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-amber-500/5 transition-colors"
                            >
                              <span className="min-w-0">
                                <span className="font-bold text-foreground block truncate">{drug.name} {drug.strength ? <span className="text-muted-foreground font-mono">{drug.strength}</span> : null}</span>
                                <span className="text-muted-foreground block truncate">{drug.genericName} · {drug.dosageForm} · {drug.category}</span>
                              </span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${drug.requiresPrescription || drug.isPrescriptionOnly ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"}`}>
                                {(drug.requiresPrescription || drug.isPrescriptionOnly) ? "POM (Rx)" : "OTC"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={`${labelCls} flex items-center gap-1.5`}>
                      SKU * <HelpTooltip text="Unique identifier for this item. Must be different from all other items." />
                    </label>
                    <div className="relative mt-1.5">
                      <input {...register("sku")} className={`${inputCls} font-mono uppercase pr-14`} placeholder="STK-XXXX" />
                      {!isEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            if (watchedName.trim()) setValue("sku", generateSuggestedSku(watchedName), { shouldValidate: false });
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2 rounded-md text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Auto-generate SKU from name"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                    {errors.sku && <p className={errCls}>{errors.sku.message}</p>}
                  </div>
                  <div>
                    <label className={`${labelCls} flex items-center gap-1.5`}>
                      Barcode <HelpTooltip text="Optional barcode for scanning." />
                    </label>
                    <input {...register("barcode")} className={`${inputCls} mt-1.5 font-mono`} placeholder="Scan or type..." />
                    {errors.barcode && <p className={errCls}>{errors.barcode.message}</p>}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>Description (Optional)</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleMagicWrite}
                      disabled={isGeneratingDesc}
                      className="h-7 gap-1.5 text-[10px] font-black uppercase tracking-widest border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/5"
                    >
                      <Sparkles className="h-3 w-3" />
                      {isGeneratingDesc ? "Writing..." : "Magic Write"}
                    </Button>
                  </div>
                  <textarea {...register("description")} rows={2} className={`${inputCls} h-auto py-2.5 mt-1.5 resize-none`} placeholder="Brief description of the product..." />
                  {errors.description && <p className={errCls}>{errors.description.message}</p>}
                </div>
              </div>
            </div>

            {/* Variants */}
            <VariantsSection
              control={control}
              watch={watch}
              setValue={setValue}
              errors={errors}
              cardGroupCls={cardGroupCls}
              labelCls={labelCls}
              inputCls={inputCls}
            />

            {/* Units & Measurements */}
            <div className={cardGroupCls}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Boxes className="h-4 w-4" />
                  <h3 className="font-semibold text-foreground">Units & Measurements</h3>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[10px] font-black uppercase tracking-widest px-2"
                  onClick={() => {
                    const currentUnits = watch("units") || [];
                    setValue("units", [...currentUnits, { name: "", conversionFactor: 1 }]);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Unit
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Base Unit (Smallest Unit)</label>
                    <input 
                      {...register("unit")} 
                      list="unit-suggestions"
                      className={`${inputCls} mt-1.5`} 
                      placeholder="e.g. Piece, Yard, kg" 
                    />
                    <datalist id="unit-suggestions">
                      {store?.unitPresets?.map((p, idx) => (
                        <option key={idx} value={p.name} />
                      ))}
                      {SUPPORTED_UNITS.map((u) => (
                        <option key={u.id} value={u.label} />
                      ))}
                    </datalist>
                    {errors.unit && <p className={errCls}>{errors.unit.message}</p>}
                  </div>
                </div>

                {/* Secondary Units */}
                <div className="space-y-3">
                  {(watch("units") || []).map((u, index) => (
                    <div key={index} className="relative rounded-xl border border-border bg-muted/20 p-4 pt-8">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const currentUnits = watch("units") || [];
                          setValue("units", currentUnits.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit Name</label>
                          <input 
                            {...register(`units.${index}.name` as const)} 
                            className={`${inputCls} mt-1 h-9`} 
                            placeholder="e.g. Carton, Bundle" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {watch(`units.${index}.name`) || "Bulk Unit"} contains...
                          </label>
                          <div className="relative mt-1">
                            <input 
                              type="number" 
                              step="any"
                              {...register(`units.${index}.conversionFactor` as const)} 
                              className={`${inputCls} h-9 pr-12`} 
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                              {watch("unit") || "Units"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selling Price (Optional)</label>
                          <div className="relative mt-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₦</span>
                            <input 
                              type="number" 
                              step="0.01"
                              {...register(`units.${index}.sellingPrice` as const)} 
                              className={`${inputCls} h-9 pl-5`} 
                              placeholder="Bulk Price"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-[9px] font-medium text-primary/70 italic uppercase tracking-wider">
                        1 {watch(`units.${index}.name`) || "Bulk Unit"} = {watch(`units.${index}.conversionFactor`) || "?"} {watch("unit") || "Base Units"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Classification & Stock */}
            <div className={cardGroupCls}>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <Boxes className="h-4 w-4" />
                <h3 className="font-semibold text-foreground">Stock & Classification</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="sm:col-span-3">
                  <label className={labelCls}>Category</label>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={`${inputCls} mt-1.5 h-10`}>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories.filter(c => c && c.id && c.id.trim() !== "").map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoryId && <p className={errCls}>{errors.categoryId.message}</p>}
                </div>
                {!hasActiveVariants ? (
                  <>
                    <div>
                      <label className={labelCls}>Current Stock</label>
                      <input type="number" {...register("currentStock")} className={`${inputCls} mt-1.5`} />
                      {errors.currentStock && <p className={errCls}>{errors.currentStock.message}</p>}
                    </div>
                    <div>
                      <label className={`${labelCls} flex items-center gap-1.5`}>
                        Reorder Point <HelpTooltip text="Minimum quantity before a low-stock alert is triggered. Set based on your typical usage rate." />
                      </label>
                      <input type="number" {...register("reorderPoint")} className={`${inputCls} mt-1.5`} />
                      {errors.reorderPoint && <p className={errCls}>{errors.reorderPoint.message}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Reorder Qty</label>
                      <input type="number" {...register("reorderQuantity")} className={`${inputCls} mt-1.5`} />
                      {errors.reorderQuantity && <p className={errCls}>{errors.reorderQuantity.message}</p>}
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">Variant Stock Mode Active</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Stock quantities are managed individually for each variant combination.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Units</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{variantStockTotal}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className={cardGroupCls}>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <Banknote className="h-4 w-4" />
                <h3 className="font-semibold text-foreground">Pricing</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Cost Price</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input type="number" step="0.01" {...register("costPrice")} className={`${inputCls} pl-7`} placeholder="0.00" />
                  </div>
                  {errors.costPrice && <p className={errCls}>{errors.costPrice.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Retail Selling Price</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input type="number" step="0.01" {...register("sellingPrice")} className={`${inputCls} pl-7`} placeholder="0.00" />
                  </div>
                  {errors.sellingPrice && <p className={errCls}>{errors.sellingPrice.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Wholesale Selling Price</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input type="number" step="0.01" {...register("wholesalePrice")} className={`${inputCls} pl-7`} placeholder="0.00" />
                  </div>
                  {errors.wholesalePrice && <p className={errCls}>{errors.wholesalePrice.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={`${labelCls} flex items-center gap-1.5`}>
                    Distributor Selling Price <HelpTooltip text="Optional volume price for distributor/bulk customers. Falls back to wholesale then retail when not set." />
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input type="number" step="0.01" {...register("distributorPrice")} className={`${inputCls} pl-7`} placeholder="0.00" />
                  </div>
                  {errors.distributorPrice && <p className={errCls}>{errors.distributorPrice.message}</p>}
                </div>
              </div>
            </div>

            {isPharmacy && (
              <div className={cardGroupCls}>
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <Tag className="h-4 w-4" />
                  <h3 className="font-semibold text-foreground">Pharmacy Clinical Specifications</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Dosage Form</label>
                    <input {...register("dosageForm")} list="dosage-form-options" className={`${inputCls} mt-1.5`} placeholder="e.g. Tablet, Capsule, Syrup" />
                    <datalist id="dosage-form-options">
                      {["Tablet", "Capsule", "Syrup", "Injection", "Sachet", "Ointment", "Liquid", "Inhaler", "Drops", "Cream", "Suppository"].map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                    {errors.dosageForm && <p className={errCls}>{errors.dosageForm.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Batch Number</label>
                    <input {...register("batchNumber")} className={`${inputCls} mt-1.5 font-mono`} placeholder="e.g. BATCH-2025-001" />
                    {errors.batchNumber && <p className={errCls}>{errors.batchNumber.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Expiry Date</label>
                    <input type="date" {...register("expiryDate")} className={`${inputCls} mt-1.5`} />
                    {errors.expiryDate && <p className={errCls}>{errors.expiryDate.message}</p>}
                  </div>
                  <div className="flex items-end">
                    <label className={`${inputCls} flex h-10 cursor-pointer items-center gap-2.5 border-emerald-200 dark:border-emerald-800/50 px-3`}>
                      <input type="checkbox" {...register("requiresPrescription")} className="h-4 w-4 rounded border-input text-primary focus:ring-primary" />
                      <span className="text-sm font-medium text-foreground">Requires Prescription (POM)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment & Status */}
            <div className={cardGroupCls}>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <MapPin className="h-4 w-4" />
                <h3 className="font-semibold text-foreground">Assignment & Status</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Supplier</label>
                  <Controller
                    name="supplierId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={`${inputCls} mt-1.5 h-10`}>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {suppliers.filter(s => s && s.id && s.id.trim() !== "").map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.supplierId && <p className={errCls}>{errors.supplierId.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <Controller
                    name="locationId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={`${inputCls} mt-1.5 h-10`}>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {locations.filter(l => l && l.id && l.id.trim() !== "").map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.locationId && <p className={errCls}>{errors.locationId.message}</p>}
                </div>
                {isAdmin && (
                  <div>
                    <label className={labelCls}>Branch Visibility</label>
                    <Controller
                      name="branchId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={`${inputCls} mt-1.5 h-10`}>
                            <SelectValue placeholder="All branches" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All branches</SelectItem>
                            {branches.filter(b => b && b.id && b.id.trim() !== "").map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.branchId && <p className={errCls}>{errors.branchId.message}</p>}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Product Status</label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={`${inputCls} mt-1.5 h-10`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ItemStatus.Active}>Active - Available for Sale</SelectItem>
                          <SelectItem value={ItemStatus.Discontinued}>Discontinued - No longer restocking</SelectItem>
                          <SelectItem value={ItemStatus.Archived}>Archived - Hidden from active lists</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && <p className={errCls}>{errors.status.message}</p>}
                </div>
              </div>
            </div>

          </form>
        </div>
        
        <div className="border-t border-border bg-muted/20 p-4 sm:px-6 z-10 flex items-center justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="item-form" 
            disabled={loading} 
            className="min-w-[140px] rounded-xl font-black uppercase tracking-widest text-xs h-11 shadow-lg shadow-primary/20"
          >
            {loading ? "Saving…" : (isEdit ? "Update Product" : "Add Product")}
          </Button>
        </div>
      </div>
    </DialogContent>
    </Dialog>
  );
}
