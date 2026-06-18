import * as React from "react";
import { useEffect } from "react";
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
import { X, Plus, PackagePlus, Tag, Boxes, Banknote, MapPin, Upload, Image as ImageIcon } from "lucide-react";
import { uploadImage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Item, Category, Supplier, Location } from "@/types/inventory";
import { ItemStatus } from "@/types/inventory";
import type { Branch } from "@/types/tenant";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/contexts/TenantContext";
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
  status: z.nativeEnum(ItemStatus),
  imageUrl: z.string().nullable().optional(),
  units: z.array(z.object({
    name: z.string().min(1, "Unit name is required"),
    conversionFactor: z.coerce.number().min(0.00001, "Conversion must be greater than 0"),
    sellingPrice: z.coerce.number().optional(),
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
  const isEdit = !!item;
  const [isUploading, setIsUploading] = React.useState(false);

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
      status: ItemStatus.Active,
      imageUrl: null,
    },
  });

  const imageUrl = watch("imageUrl");

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
          status: item.status,
          imageUrl: item.imageUrl || null,
          units: item.units || [],
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
          status: ItemStatus.Active,
          imageUrl: null,
          units: [],
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
    
    // Ensure numeric fields are numbers
    const finalData = {
      ...cleanedData,
      units: cleanedData.units?.map(u => ({
        ...u,
        conversionFactor: Number(u.conversionFactor),
        sellingPrice: u.sellingPrice ? Number(u.sellingPrice) : undefined
      }))
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
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={`${labelCls} flex items-center gap-1.5`}>
                      SKU * <HelpTooltip text="Unique identifier for this item. Must be different from all other items." />
                    </label>
                    <input {...register("sku")} className={`${inputCls} mt-1.5 font-mono uppercase`} placeholder="STK-XXXX" />
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
                  <label className={labelCls}>Description (Optional)</label>
                  <textarea {...register("description")} rows={2} className={`${inputCls} h-auto py-2.5 mt-1.5 resize-none`} placeholder="Brief description of the product..." />
                  {errors.description && <p className={errCls}>{errors.description.message}</p>}
                </div>
              </div>
            </div>

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
                      <option value="Piece" />
                      <option value="Yard" />
                      <option value="Mudu" />
                      <option value="kg" />
                      <option value="Litre" />
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
                  <label className={labelCls}>Selling Price</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input type="number" step="0.01" {...register("sellingPrice")} className={`${inputCls} pl-7`} placeholder="0.00" />
                  </div>
                  {errors.sellingPrice && <p className={errCls}>{errors.sellingPrice.message}</p>}
                </div>
              </div>
            </div>

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
