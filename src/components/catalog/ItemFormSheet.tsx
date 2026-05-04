import { useEffect } from "react";
import { HelpTooltip } from "@/components/shared/HelpTooltip";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Item, Category, Supplier, Location } from "@/types/inventory";
import { ItemStatus } from "@/types/inventory";
import { PackagePlus, Tag, Boxes, DollarSign, MapPin } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string(),
  categoryId: z.string(),
  supplierId: z.string(),
  locationId: z.string(),
  unit: z.string(),
  currentStock: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0),
  reorderQuantity: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  status: z.nativeEnum(ItemStatus),
});

type FormValues = z.infer<typeof schema>;

interface ItemFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  existingSkus: string[];
  onSave: (data: Partial<Item>) => void;
  loading?: boolean;
}

export function ItemFormSheet({
  open,
  onOpenChange,
  item,
  categories,
  suppliers,
  locations,
  existingSkus,
  onSave,
  loading,
}: ItemFormSheetProps) {
  const isEdit = !!item;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors }, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      supplierId: "",
      locationId: "",
      unit: "each",
      currentStock: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      status: ItemStatus.Active,
    },
  });

  useEffect(() => {
    if (open && item) {
      reset({
        name: item.name,
        sku: item.sku,
        description: item.description,
        categoryId: item.categoryId ?? undefined,
        supplierId: item.supplierId ?? undefined,
        locationId: item.locationId ?? undefined,
        unit: item.unit,
        currentStock: item.currentStock,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        status: item.status,
      });
    } else if (open) {
      reset();
    }
  }, [open, item, reset]);

  const onSubmit = (data: FormValues) => {
    const skuConflict = existingSkus.filter((s) => s === data.sku);
    const allowed = isEdit && item?.sku === data.sku ? 1 : 0;
    if (skuConflict.length > allowed) {
      setError("sku", { message: "SKU already exists" });
      return;
    }
    onSave({
      ...data,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
      locationId: data.locationId || null,
    });
  };

  const inputCls = "h-10 w-full rounded-xl border border-border/40 bg-background/50 backdrop-blur-sm px-4 text-sm outline-none transition-all duration-300 placeholder:text-muted-foreground/50 hover:border-emerald-500/30 focus:border-emerald-500/50 focus:bg-background focus:ring-4 focus:ring-emerald-500/10";
  const labelCls = "text-sm font-medium text-foreground/80 ml-1";
  const errCls = "text-xs text-destructive mt-1.5 ml-1 font-medium";
  const cardGroupCls = "rounded-2xl border border-white/5 bg-card/30 backdrop-blur-xl p-6 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/20 relative overflow-hidden group";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden bg-background/80 backdrop-blur-2xl border-emerald-500/20 shadow-[0_0_60px_-15px_rgba(16,185,129,0.15)] rounded-3xl flex flex-col max-h-[85vh]">
        <DialogHeader className="px-8 py-5 border-b border-border/30 bg-transparent z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">{isEdit ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                {isEdit ? "Update the details for this product in your catalog." : "Create a new product to add to your inventory catalog."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-6 scroll-smooth">
          <form id="item-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
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
                <div>
                  <label className={`${labelCls} flex items-center gap-1.5`}>
                    SKU * <HelpTooltip text="Unique identifier for this item. Must be different from all other items." />
                  </label>
                  <input {...register("sku")} className={`${inputCls} mt-1.5 font-mono uppercase`} placeholder="STK-XXXX" />
                  {errors.sku && <p className={errCls}>{errors.sku.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Unit of Measure</label>
                  <input {...register("unit")} className={`${inputCls} mt-1.5`} placeholder="each, kg, box…" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Description (Optional)</label>
                  <textarea {...register("description")} rows={2} className={`${inputCls} h-auto py-2.5 mt-1.5 resize-none`} placeholder="Brief description of the product..." />
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
                  <Select value={watch("categoryId") ?? ""} onValueChange={(v) => setValue("categoryId", v || "")}>
                    <SelectTrigger className={`${inputCls} mt-1.5 h-10`}><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Current Stock</label>
                  <input type="number" {...register("currentStock")} className={`${inputCls} mt-1.5`} />
                </div>
                <div>
                  <label className={`${labelCls} flex items-center gap-1.5`}>
                    Reorder Point <HelpTooltip text="Minimum quantity before a low-stock alert is triggered. Set based on your typical usage rate." />
                  </label>
                  <input type="number" {...register("reorderPoint")} className={`${inputCls} mt-1.5`} />
                </div>
                <div>
                  <label className={labelCls}>Reorder Qty</label>
                  <input type="number" {...register("reorderQuantity")} className={`${inputCls} mt-1.5`} />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className={cardGroupCls}>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <DollarSign className="h-4 w-4" />
                <h3 className="font-semibold text-foreground">Pricing</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Cost Price</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input type="number" step="0.01" {...register("costPrice")} className={`${inputCls} pl-7`} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Selling Price</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                    <input type="number" step="0.01" {...register("sellingPrice")} className={`${inputCls} pl-7`} placeholder="0.00" />
                  </div>
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
                  <Select value={watch("supplierId") ?? ""} onValueChange={(v) => setValue("supplierId", v || "")}>
                    <SelectTrigger className={`${inputCls} mt-1.5 h-10`}><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <Select value={watch("locationId") ?? ""} onValueChange={(v) => setValue("locationId", v || "")}>
                    <SelectTrigger className={`${inputCls} mt-1.5 h-10`}><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Product Status</label>
                  <Select value={watch("status")} onValueChange={(v) => setValue("status", v as ItemStatus)}>
                    <SelectTrigger className={`${inputCls} mt-1.5 h-10`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ItemStatus.Active}>Active - Available for Sale</SelectItem>
                      <SelectItem value={ItemStatus.Discontinued}>Discontinued - No longer restocking</SelectItem>
                      <SelectItem value={ItemStatus.Archived}>Archived - Hidden from active lists</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

          </form>
        </div>
        
        <div className="border-t border-border/30 bg-background/50 p-5 sm:px-8 backdrop-blur-xl z-10 flex items-center justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl hover:bg-white/5">
            Cancel
          </Button>
          <Button type="submit" form="item-form" disabled={loading} className="min-w-[130px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300">
            {loading ? "Saving…" : (isEdit ? "Update Product" : "Add Product")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
