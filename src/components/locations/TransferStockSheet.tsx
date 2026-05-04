import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRightLeft, X, Box, MapPin, Package, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useItems, useLocations } from "@/hooks/useInventoryData";
import { useCreateMovement } from "@/hooks/useInventoryMutations";
import { MovementType } from "@/types/inventory";
import type { Item } from "@/types/inventory";
import { cn } from "@/lib/utils";

const schema = z.object({
  itemId: z.string().min(1, "Select an item"),
  fromLocationId: z.string().min(1, "Select source location"),
  toLocationId: z.string().min(1, "Select destination location"),
  quantity: z.coerce.number().int().min(1, "Minimum 1"),
});

type FormValues = z.infer<typeof schema>;

interface TransferStockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedItemId?: string;
}

export function TransferStockSheet({
  open,
  onOpenChange,
  preselectedItemId,
}: TransferStockSheetProps) {
  const { data: items } = useItems();
  const { data: locations } = useLocations();
  const createMovement = useCreateMovement();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      itemId: preselectedItemId ?? "",
      fromLocationId: "",
      toLocationId: "",
      quantity: 1,
    },
  });

  const selectedItemId = form.watch("itemId");
  const fromLocationId = form.watch("fromLocationId");

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId),
    [items, selectedItemId],
  );

  // Items that have a location assigned
  const assignedItems = useMemo(
    () => items.filter((i) => i.locationId),
    [items],
  );

  const maxQty = selectedItem?.currentStock ?? 0;

  function onSubmit(values: FormValues) {
    if (values.fromLocationId === values.toLocationId) {
      form.setError("toLocationId", {
        message: "Destination must differ from source",
      });
      return;
    }

    if (values.quantity > maxQty) {
      form.setError("quantity", {
        message: `Only ${maxQty} available`,
      });
      return;
    }

    const fromLoc = locations.find((l) => l.id === values.fromLocationId);
    const toLoc = locations.find((l) => l.id === values.toLocationId);

    createMovement.mutate(
      {
        id: crypto.randomUUID(),
        itemId: values.itemId,
        type: MovementType.Transferred,
        quantity: values.quantity,
        fromLocationId: values.fromLocationId,
        toLocationId: values.toLocationId,
        reference: `Transfer: ${fromLoc?.name ?? ""} → ${toLoc?.name ?? ""}`,
        notes: "",
        performedBy: "demo-user",
        createdAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Stock transferred successfully");
          form.reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Stock Transfer</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Internal Logistics</span>
                </div>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Item */}
                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 px-1">
                      <div className="flex items-center gap-2 ml-1">
                        <Box className="h-3 w-3 text-muted-foreground" />
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product to Move</FormLabel>
                      </div>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          // Auto-fill from location
                          const item = items.find((i) => i.id === v);
                          if (item?.locationId) {
                            form.setValue("fromLocationId", item.locationId);
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {assignedItems.map((item) => (
                            <SelectItem key={item.id} value={item.id} className="font-bold">
                              {item.name} <span className="ml-2 font-mono text-[10px] opacity-60">({item.sku})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 px-1">
                  {/* From Location */}
                  <FormField
                    control={form.control}
                    name="fromLocationId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center gap-2 ml-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source</FormLabel>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                              <SelectValue placeholder="Origin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id} className="font-bold">
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* To Location */}
                  <FormField
                    control={form.control}
                    name="toLocationId"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center gap-2 ml-1">
                          <MapPin className="h-3 w-3 text-primary" />
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destination</FormLabel>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-2 font-bold border-primary/20">
                              <SelectValue placeholder="Target" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {locations
                              .filter((l) => l.id !== fromLocationId)
                              .map((loc) => (
                                <SelectItem key={loc.id} value={loc.id} className="font-bold">
                                  {loc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 px-1">
                      <div className="flex items-center justify-between ml-1">
                        <div className="flex items-center gap-2">
                           <Package className="h-3 w-3 text-muted-foreground" />
                           <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transfer Quantity</FormLabel>
                        </div>
                        {selectedItem && (
                          <span className="text-[10px] font-bold text-muted-foreground">Max Avail: {maxQty}</span>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={maxQty}
                          {...field}
                          className="h-11 rounded-xl border-2 font-mono font-black"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-3 pt-4 px-1">
                  <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20" disabled={createMovement.isLoading}>
                    {createMovement.isLoading ? "Processing..." : "Confirm Stock Transfer"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full h-11 rounded-xl font-bold text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
