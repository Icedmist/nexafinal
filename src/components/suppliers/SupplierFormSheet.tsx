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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCreateSupplier, useUpdateSupplier } from "@/hooks/useInventoryMutations";
import type { Supplier } from "@/types/inventory";
import { Building2, X } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string(),
  email: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string(),
  address: z.string(),
  notes: z.string(),
  paymentTerms: z.string(),
  leadTimeDays: z.coerce.number().int().min(0, "Must be 0 or more"),
  minOrderQuantity: z.coerce.number().int().min(0, "Must be 0 or more"),
});

type FormValues = z.infer<typeof schema>;

interface SupplierFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
}

export function SupplierFormSheet({ open, onOpenChange, supplier }: SupplierFormSheetProps) {
  const isEdit = !!supplier;
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      paymentTerms: "",
      leadTimeDays: 0,
      minOrderQuantity: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          name: supplier.name,
          contactName: supplier.contactName ?? "",
          email: supplier.email ?? "",
          phone: supplier.phone ?? "",
          address: supplier.address ?? "",
          notes: supplier.notes ?? "",
          paymentTerms: "",
          leadTimeDays: supplier.leadTimeDays ?? 0,
          minOrderQuantity: 0,
        });
      } else {
        form.reset();
      }
    }
  }, [open, supplier, form]);

  function onSubmit(values: FormValues) {
    const now = new Date().toISOString();

    if (isEdit && supplier) {
      updateSupplier.mutate(
        {
          id: supplier.id,
          updates: {
            name: values.name,
            contactName: values.contactName ?? "",
            email: values.email ?? "",
            phone: values.phone ?? "",
            address: values.address ?? "",
            notes: values.notes ?? "",
            leadTimeDays: values.leadTimeDays ?? 0,
            updatedAt: now,
          },
        },
        {
          onSuccess: () => {
            toast.success("Supplier updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(e.message || "Failed to update supplier."),
        },
      );
    } else {
      const newSupplier: Supplier = {
        id: crypto.randomUUID(),
        name: values.name,
        contactName: values.contactName ?? "",
        email: values.email ?? "",
        phone: values.phone ?? "",
        address: values.address ?? "",
        notes: values.notes ?? "",
        leadTimeDays: values.leadTimeDays ?? 0,
        rating: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      createSupplier.mutate(newSupplier, {
        onSuccess: () => {
          toast.success("Supplier created");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message || "Failed to create supplier."),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden nexa-card border-none bg-transparent shadow-none">
        <div className="nexa-card bg-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight">{isEdit ? "Edit Supplier" : "New Supplier"}</DialogTitle>
            </div>
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Supplier Name *</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Acme Corp" className="h-11 rounded-xl border-2 font-bold" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contact Person</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. John Doe" className="h-11 rounded-xl border-2 font-bold" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</FormLabel>
                      <FormControl><Input type="email" {...field} placeholder="email@example.com" className="h-11 rounded-xl border-2 font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</FormLabel>
                      <FormControl><Input {...field} placeholder="+234 ..." className="h-11 rounded-xl border-2 font-mono font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Physical Address</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder="Street, City, State" className="rounded-xl border-2 font-bold resize-none" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="leadTimeDays"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Lead Time (Days)</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} className="h-11 rounded-xl border-2 font-mono font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Terms</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Net 30" className="h-11 rounded-xl border-2 font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Additional Notes</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder="Supplier relationship details..." className="rounded-xl border-2 font-bold resize-none" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
                  {isEdit ? "Save Changes" : "Create Supplier"}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-12 font-bold px-6 border-2">
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
