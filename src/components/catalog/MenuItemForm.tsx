import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  X, Plus, UtensilsCrossed, Flame, Clock, FileText,
  Package, DollarSign, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Item, MenuItemSize, MenuItemAddon, MenuItemConfig } from "@/types/inventory";
import { ItemStatus } from "@/types/inventory";

const sizeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

const addonSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  currentStock: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  status: z.nativeEnum(ItemStatus),
  imageUrl: z.string().nullable().optional(),
  // Restaurant config
  sizes: z.array(sizeSchema).min(1, "At least one portion size is required"),
  addons: z.array(addonSchema),
  spiceLevels: z.array(z.string()),
  allowKitchenNotes: z.boolean(),
  prepTimeMinutes: z.coerce.number().min(0),
  isCombo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface MenuItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  categories: Array<{ id: string; name: string }>;
  existingSkus: string[];
  onSave: (data: Partial<Item>) => void;
  loading?: boolean;
}

function generateId(): string {
  return `_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_SIZES: MenuItemSize[] = [
  { id: generateId(), name: "Regular", price: 0 },
  { id: generateId(), name: "Large", price: 0 },
];

const DEFAULT_SPICE_LEVELS = ["Mild", "Medium", "Hot", "Extra Hot"];

export function MenuItemForm({
  open,
  onOpenChange,
  item,
  categories,
  existingSkus,
  onSave,
  loading,
}: MenuItemFormProps) {
  const isEdit = !!item;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors }, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      currentStock: 100,
      sellingPrice: 0,
      status: ItemStatus.Active,
      imageUrl: null,
      sizes: DEFAULT_SIZES,
      addons: [],
      spiceLevels: DEFAULT_SPICE_LEVELS,
      allowKitchenNotes: true,
      prepTimeMinutes: 15,
      isCombo: false,
    },
  });

  const sizes = watch("sizes") || [];
  const addons = watch("addons") || [];
  const spiceLevels = watch("spiceLevels") || [];
  const allowKitchenNotes = watch("allowKitchenNotes");
  const isCombo = watch("isCombo");

  useEffect(() => {
    if (open) {
      if (item) {
        const config = item.menuItemConfig;
        reset({
          name: item.name,
          sku: item.sku,
          description: item.description || "",
          categoryId: item.categoryId ?? "",
          currentStock: item.currentStock,
          sellingPrice: item.sellingPrice,
          status: item.status,
          imageUrl: item.imageUrl || null,
          sizes: config?.sizes?.length ? config.sizes : DEFAULT_SIZES,
          addons: config?.addons || [],
          spiceLevels: config?.spiceLevels || DEFAULT_SPICE_LEVELS,
          allowKitchenNotes: config?.allowKitchenNotes ?? true,
          prepTimeMinutes: config?.prepTimeMinutes ?? 15,
          isCombo: config?.isCombo ?? false,
        });
      } else {
        reset({
          name: "",
          sku: "",
          description: "",
          categoryId: "",
          currentStock: 100,
          sellingPrice: 0,
          status: ItemStatus.Active,
          imageUrl: null,
          sizes: DEFAULT_SIZES,
          addons: [],
          spiceLevels: DEFAULT_SPICE_LEVELS,
          allowKitchenNotes: true,
          prepTimeMinutes: 15,
          isCombo: false,
        });
      }
    }
  }, [open, item, reset]);

  const onSubmit = (data: FormValues) => {
    const isSkuChanging = !isEdit || (item && item.sku !== data.sku);
    if (isSkuChanging && existingSkus.includes(data.sku)) {
      setError("sku", { message: "This SKU is already assigned" });
      return;
    }

    const config: MenuItemConfig = {
      sizes: data.sizes,
      addons: data.addons,
      spiceLevels: data.spiceLevels,
      allowKitchenNotes: data.allowKitchenNotes,
      prepTimeMinutes: data.prepTimeMinutes,
      isCombo: data.isCombo,
      comboSlots: [],
    };

    // Use the first size's price as the base selling price
    const basePrice = data.sizes[0]?.price || 0;

    onSave({
      name: data.name,
      sku: data.sku,
      description: data.description || "",
      categoryId: data.categoryId || null,
      currentStock: data.currentStock,
      sellingPrice: basePrice,
      status: data.status,
      imageUrl: data.imageUrl || null,
      menuItemConfig: config,
    });
  };

  const addSize = () => {
    const current = watch("sizes") || [];
    setValue("sizes", [...current, { id: generateId(), name: "", price: 0 }]);
  };

  const removeSize = (index: number) => {
    const current = watch("sizes") || [];
    setValue("sizes", current.filter((_, i) => i !== index));
  };

  const addAddon = () => {
    const current = watch("addons") || [];
    setValue("addons", [...current, { id: generateId(), name: "", price: 0 }]);
  };

  const removeAddon = (index: number) => {
    const current = watch("addons") || [];
    setValue("addons", current.filter((_, i) => i !== index));
  };

  const toggleSpiceLevel = (level: string) => {
    const current = watch("spiceLevels") || [];
    if (current.includes(level)) {
      setValue("spiceLevels", current.filter(l => l !== level));
    } else {
      setValue("spiceLevels", [...current, level]);
    }
  };

  const addCustomSpice = () => {
    const custom = prompt("Enter custom spice level:");
    if (custom) {
      const current = watch("spiceLevels") || [];
      if (!current.includes(custom)) {
        setValue("spiceLevels", [...current, custom]);
      }
    }
  };

  const inputCls = "h-10 w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-background px-3 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const labelCls = "text-sm font-medium text-foreground";
  const errCls = "text-xs text-destructive mt-1";
  const cardGroupCls = "rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-card p-5 shadow-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <div className="nexa-card bg-card flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">
                  {isEdit ? "Edit Menu Item" : "New Menu Item"}
                </DialogTitle>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Restaurant Catalog
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form */}
          <div className="overflow-y-auto p-6 scroll-smooth">
            <form id="menu-item-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Basics */}
              <div className={cardGroupCls}>
                <div className="mb-4 flex items-center gap-2 text-emerald-600">
                  <Package className="h-4 w-4" />
                  <h3 className="font-semibold text-foreground">Basics</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Item name *</label>
                    <input {...register("name")} className={`${inputCls} mt-1.5`} placeholder="e.g. Jollof rice" />
                    {errors.name && <p className={errCls}>{errors.name.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`${labelCls} flex items-center gap-1.5`}>
                        SKU *
                      </label>
                      <input {...register("sku")} className={`${inputCls} mt-1.5 font-mono uppercase`} placeholder="JOL-001" />
                      {errors.sku && <p className={errCls}>{errors.sku.message}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Category</label>
                      <select {...register("categoryId")} className={`${inputCls} mt-1.5`}>
                        <option value="">Select category</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea {...register("description")} rows={2} className={`${inputCls} h-auto py-2.5 mt-1.5 resize-none`} placeholder="Peppered smoky jollof rice" />
                  </div>
                  <div>
                    <label className={`${labelCls} flex items-center gap-1.5`}>
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Prep time (kitchen estimate)
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type="number"
                        {...register("prepTimeMinutes")}
                        className={`${inputCls} pr-16`}
                        min={0}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                        mins
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portion Sizes */}
              <div className={cardGroupCls}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <DollarSign className="h-4 w-4" />
                    <h3 className="font-semibold text-foreground">Portion Sizes</h3>
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-600">
                      required choice
                    </span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-bold px-2" onClick={addSize}>
                    <Plus className="h-3 w-3 mr-1" /> Add size
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">Customer must pick one</p>

                <div className="space-y-2">
                  {sizes.map((size: MenuItemSize, index: number) => (
                    <div key={size.id} className="flex items-center gap-2">
                      <span className="text-lg">🍽️</span>
                      <input
                        {...register(`sizes.${index}.name`)}
                        className={`${inputCls} h-9 flex-1`}
                        placeholder="e.g. Regular, Large"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₦</span>
                        <input
                          type="number"
                          {...register(`sizes.${index}.price`)}
                          className={`${inputCls} h-9 pl-6`}
                          placeholder="0"
                        />
                      </div>
                      {sizes.length > 1 && (
                        <button type="button" onClick={() => removeSize(index)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.sizes && <p className={errCls}>{errors.sizes.message}</p>}
              </div>

              {/* Protein Add-on */}
              <div className={cardGroupCls}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Flame className="h-4 w-4" />
                    <h3 className="font-semibold text-foreground">Add-on options</h3>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                      optional
                    </span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-bold px-2" onClick={addAddon}>
                    <Plus className="h-3 w-3 mr-1" /> Add option
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">Customer can add one (or skip)</p>

                <div className="space-y-2">
                  {addons.map((addon: MenuItemAddon, index: number) => (
                    <div key={addon.id} className="flex items-center gap-2">
                      <span className="text-lg">🥩</span>
                      <input
                        {...register(`addons.${index}.name`)}
                        className={`${inputCls} h-9 flex-1`}
                        placeholder="e.g. Chicken, Beef"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₦</span>
                        <input
                          type="number"
                          {...register(`addons.${index}.price`)}
                          className={`${inputCls} h-9 pl-6`}
                          placeholder="0"
                        />
                      </div>
                      <button type="button" onClick={() => removeAddon(index)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spice Level */}
              <div className={cardGroupCls}>
                <div className="mb-4 flex items-center gap-2 text-emerald-600">
                  <Flame className="h-4 w-4" />
                  <h3 className="font-semibold text-foreground">Spice level</h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                    free, optional
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {spiceLevels.map((level: string) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleSpiceLevel(level)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={addCustomSpice}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-border hover:border-emerald-500 text-muted-foreground hover:text-emerald-600 transition-all"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Kitchen Notes */}
              <div className={cardGroupCls}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <FileText className="h-4 w-4" />
                    <h3 className="font-semibold text-foreground">Kitchen notes field</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("allowKitchenNotes", !allowKitchenNotes)}
                    className="text-emerald-600"
                  >
                    {allowKitchenNotes ? (
                      <ToggleRight className="h-8 w-8" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Allow free-text notes (e.g. "no onions")
                </p>
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/20 p-4 sm:px-6 z-10 flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              type="submit"
              form="menu-item-form"
              disabled={loading}
              className="min-w-[140px] rounded-xl font-black uppercase tracking-widest text-xs h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            >
              {loading ? "Saving…" : isEdit ? "Update Menu Item" : "Save Menu Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
