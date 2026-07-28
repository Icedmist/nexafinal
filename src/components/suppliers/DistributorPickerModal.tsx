import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DISTRIBUTOR_PRESETS,
  type DistributorPreset,
} from "@/utils/categorySuggestions";
import { useCreateSupplier } from "@/hooks/useInventoryMutations";
import { useSuppliers } from "@/hooks/useInventoryData";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Search,
  Truck,
  Phone,
  Mail,
  Plus,
  Wine,
  Pill,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

interface DistributorPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
}

export function DistributorPickerModal({
  open,
  onOpenChange,
  defaultCategory = "all",
}: DistributorPickerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const createSupplier = useCreateSupplier();
  const { data: existingSuppliers } = useSuppliers();

  const categories = [
    { id: "all", label: "All Industries", icon: Sparkles },
    { id: "beverages", label: "Beverages & Drinks", icon: Wine },
    { id: "pharmacy", label: "Pharmacy & Meds", icon: Pill },
    { id: "groceries", label: "Groceries & FMCG", icon: ShoppingBag },
  ];

  const filteredDistributors = DISTRIBUTOR_PRESETS.filter((dist) => {
    const matchesCategory =
      selectedCategory === "all" ||
      dist.category === selectedCategory ||
      dist.categoryName.toLowerCase().includes(selectedCategory);

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      dist.name.toLowerCase().includes(q) ||
      dist.brands.some((b) => b.toLowerCase().includes(q)) ||
      dist.contactPerson.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const handleImport = async (dist: DistributorPreset) => {
    const isAlreadyImported = existingSuppliers?.some(
      (s) => s.name.toLowerCase() === dist.name.toLowerCase()
    );

    if (isAlreadyImported) {
      toast.info(`${dist.name} is already in your supplier list.`);
      return;
    }

    try {
      await createSupplier.mutate({
        name: dist.name,
        contactName: dist.contactPerson,
        email: dist.contactEmail,
        phone: dist.contactPhone,
        address: `${dist.state} Main Distribution Hub, Nigeria`,
        notes: `Official Verified Distributor for ${dist.categoryName}. Key Brands: ${dist.brands.join(", ")}. Min Order: ₦${dist.minOrderValueNgn.toLocaleString()}`,
        isActive: true,
        leadTimeDays: dist.deliveryLeadDays,
        rating: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast.success(`Successfully imported ${dist.name} into your active suppliers!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to import distributor");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Verified Distributors Directory</DialogTitle>
              <DialogDescription className="text-xs">
                Official FMCG, Beverage & Pharma manufacturer depots and major regional distributors
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand name (e.g. Coca-Cola, Heineken, Peak Milk, 7Up, Paracetamol)..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
          {filteredDistributors.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-2xl">
              <p className="text-xs text-muted-foreground">No matching distributors found for this filter.</p>
            </div>
          ) : (
            filteredDistributors.map((dist) => {
              const isAdded = existingSuppliers?.some(
                (s) => s.name.toLowerCase() === dist.name.toLowerCase()
              );

              return (
                <div
                  key={dist.id}
                  className="p-4 rounded-xl border bg-card hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground">{dist.name}</h4>
                      {dist.verified && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1.5 py-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified Depot
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {dist.categoryName}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-emerald-500" />
                        {dist.deliveryLeadDays} Day Delivery
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {dist.contactPhone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {dist.contactEmail}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">Key Brands:</span>
                      {dist.brands.map((brand) => (
                        <span
                          key={brand}
                          className="inline-block bg-muted/80 text-[10px] px-2 py-0.5 rounded-md font-medium text-foreground"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Min Order: ₦{dist.minOrderValueNgn.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      variant={isAdded ? "secondary" : "default"}
                      disabled={isAdded}
                      onClick={() => handleImport(dist)}
                      className="h-8 text-xs font-bold rounded-xl"
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                          Imported
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Import Distributor
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
