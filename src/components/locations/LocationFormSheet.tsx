import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, MapPin, Building2, Layers, Info } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { useCreateLocation, useUpdateLocation } from "@/hooks/useInventoryMutations";
import type { Location, LocationType } from "@/types/inventory";
import { cn } from "@/lib/utils";

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: "warehouse", label: "Warehouse" },
  { value: "zone", label: "Zone" },
  { value: "aisle", label: "Aisle" },
  { value: "shelf", label: "Shelf" },
  { value: "bin", label: "Bin" },
];

const VALID_PARENTS: Record<LocationType, LocationType[]> = {
  warehouse: [],
  zone: ["warehouse"],
  aisle: ["zone"],
  shelf: ["aisle"],
  bin: ["shelf"],
};

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["warehouse", "zone", "aisle", "shelf", "bin"]),
  parentId: z.string().nullable(),
  description: z.string().max(500),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface LocationFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLocation?: Location | null;
}

export function LocationFormSheet({ open, onOpenChange, editLocation }: LocationFormSheetProps) {
  const { data: allLocations } = useLocations();
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const isEdit = !!editLocation;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "warehouse" as LocationType,
      parentId: null,
      description: "",
      isActive: true,
    },
  });

  const watchedType = form.watch("type");

  const validParents = useMemo(() => {
    const allowedParentTypes = VALID_PARENTS[watchedType] ?? [];
    if (allowedParentTypes.length === 0) return [];
    return allLocations.filter(
      (l) => allowedParentTypes.includes(l.type) && l.id !== editLocation?.id,
    );
  }, [watchedType, allLocations, editLocation?.id]);

  // Reset parentId when type changes and current parent is invalid
  useEffect(() => {
    const currentParent = form.getValues("parentId");
    if (currentParent && !validParents.find((p) => p.id === currentParent)) {
      form.setValue("parentId", null);
    }
  }, [validParents, form]);

  // Populate form when editing
  useEffect(() => {
    if (open && editLocation) {
      form.reset({
        name: editLocation.name,
        type: editLocation.type,
        parentId: editLocation.parentId,
        description: editLocation.description ?? "",
        isActive: editLocation.isActive,
      });
    } else if (open) {
      form.reset({
        name: "",
        type: "warehouse",
        parentId: null,
        description: "",
        isActive: true,
      });
    }
  }, [open, editLocation, form]);

  function onSubmit(values: FormValues) {
    if (isEdit && editLocation) {
      updateMutation.mutate(
        { id: editLocation.id, updates: { name: values.name, type: values.type, parentId: values.parentId, description: values.description, isActive: values.isActive } },
        {
          onSuccess: () => {
            toast.success("Location updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(e.message || "Failed to update location."),
        },
      );
    } else {
      const newLocation: Location = {
        id: `loc-${Date.now()}`,
        name: values.name,
        type: values.type,
        parentId: values.parentId,
        description: values.description ?? "",
        address: "",
        isActive: values.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      createMutation.mutate(newLocation, {
        onSuccess: () => {
          toast.success("Location created");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message || "Failed to create location."),
      });
    }
  }

  const noParentAllowed = VALID_PARENTS[watchedType].length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">{isEdit ? "Edit Location" : "New Location"}</DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inventory Zoning</span>
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
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 px-1">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. North Wing Shelf B" {...field} className="h-11 rounded-xl border-2 font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 px-1">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center gap-2 ml-1">
                          <Layers className="h-3 w-3 text-muted-foreground" />
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Level Type</FormLabel>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {LOCATION_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="font-bold">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!noParentAllowed && (
                    <FormField
                      control={form.control}
                      name="parentId"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <div className="flex items-center gap-2 ml-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hierarchy Parent</FormLabel>
                          </div>
                          <Select
                            onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                            value={field.value ?? "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                                <SelectValue placeholder="Select parent" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="__none__" className="font-medium italic text-muted-foreground">Independent</SelectItem>
                              {validParents.map((loc) => (
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
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 px-1">
                      <div className="flex items-center gap-2 ml-1">
                        <Info className="h-3 w-3 text-muted-foreground" />
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Zoning Notes</FormLabel>
                      </div>
                      <FormControl>
                        <Textarea placeholder="Specific storage instructions or access requirements..." rows={2} {...field} className="rounded-xl border-2 font-bold resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-2xl border-2 border-border/50 bg-muted/10 p-4 px-5">
                      <FormLabel className="cursor-pointer text-xs font-black uppercase tracking-widest text-foreground">Operational Status</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-3 pt-4 px-1">
                  <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20" disabled={createMutation.isLoading || updateMutation.isLoading}>
                    {isEdit ? "Update Location" : "Initialize Location"}
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
