import { useState } from "react";
import { CATEGORY_PRESETS, getBuiltInProductSuggestions } from "@/utils/categorySuggestions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Sparkles,
  Building2,
  CheckCircle2,
  Layers,
} from "lucide-react";

const SECTOR_PRESETS = [
  { id: "electronics", name: "Electronics", emoji: "📱", description: "Gadgets, phones, accessories, and digital devices" },
  { id: "fashion", name: "Fashion", emoji: "👗", description: "Clothing, shoes, bags, and wearable accessories" },
  { id: "groceries", name: "Groceries", emoji: "🛒", description: "Food items, household essentials, and consumables" },
  { id: "beauty", name: "Beauty", emoji: "💄", description: "Skincare, cosmetics, haircare, and personal grooming" },
  { id: "home", name: "Home & Kitchen", emoji: "🏠", description: "Furniture, appliances, cookware, and home decor" },
  { id: "sports", name: "Sports & Outdoors", emoji: "⚽", description: "Fitness equipment, outdoor gear, and sporting goods" },
  { id: "proteins", name: "Proteins", emoji: "🥩", description: "Meat, fish, poultry, and protein-rich foods" },
  { id: "grains", name: "Grains & Staples", emoji: "🌾", description: "Rice, beans, garri, yam, and staple foods" },
];

interface DistributorPreset {
  id: string;
  name: string;
  category: string;
  contactPerson: string;
  contactPhone: string;
  state: string;
  brands: string[];
  deliveryLeadDays: number;
  minOrderValueNgn: number;
}

const DISTRIBUTOR_PRESETS: DistributorPreset[] = [
  { id: "d1", name: "Nigerian Breweries Depot", category: "groceries", contactPerson: "Chidi Okonkwo", contactPhone: "0803-456-7890", state: "Lagos", brands: ["Star Lager", "Heineken", "Desno"], deliveryLeadDays: 2, minOrderValueNgn: 50000 },
  { id: "d2", name: "Dangote Industries Hub", category: "grains", contactPerson: "Amina Bello", contactPhone: "0805-123-4567", state: "Lagos", brands: ["Dangote Sugar", "Dangote Rice", "Dangote Salt"], deliveryLeadDays: 3, minOrderValueNgn: 100000 },
  { id: "d3", name: "Chi Limited Distributor", category: "groceries", contactPerson: "Emeka Nwosu", contactPhone: "0802-987-6543", state: "Lagos", brands: ["Chivita", "Hollandia", "Superbite"], deliveryLeadDays: 2, minOrderValueNgn: 30000 },
  { id: "d4", name: "PZ Cussons Nigeria", category: "beauty", contactPerson: "Fatima Abdullahi", contactPhone: "0807-654-3210", state: "Lagos", brands: ["Cussons Baby", "Morning Fresh", "Robb"], deliveryLeadDays: 3, minOrderValueNgn: 25000 },
  { id: "d5", name: "Unilever Nigeria Depot", category: "beauty", contactPerson: "Tunde Akinola", contactPhone: "0801-222-3333", state: "Ogun", brands: ["Closeup", "Pears", "Vaseline"], deliveryLeadDays: 2, minOrderValueNgn: 40000 },
  { id: "d6", name: "Indorama Eleme Petrochemicals", category: "electronics", contactPerson: "Grace Eze", contactPhone: "0804-555-6666", state: "Rivers", brands: ["Indorama Fertilizer", "NOVA Chemicals"], deliveryLeadDays: 5, minOrderValueNgn: 200000 },
];

export default function SystemAdminCategoriesPage() {
  const [selectedSectorId, setSelectedSectorId] = useState<string>("groceries");

  const activeSector = SECTOR_PRESETS.find((s) => s.id === selectedSectorId) || SECTOR_PRESETS[0];
  const sectorUnits = CATEGORY_PRESETS[selectedSectorId]?.units || [];
  const builtInProducts = getBuiltInProductSuggestions().filter(
    (p) => p.categoryName.toLowerCase().includes(activeSector.name.toLowerCase().split(" ")[0])
  );

  const categoryDistributors = DISTRIBUTOR_PRESETS.filter(
    (d) => d.category === activeSector.id || activeSector.name.toLowerCase().includes(d.category)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-500" />
            Global Categories & Industry Presets
          </h2>
          <p className="text-xs text-muted-foreground">
            System-wide auto-categorization rules, supported measurement units, and default distributor connections.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 font-mono text-xs w-fit">
          {SECTOR_PRESETS.length} Active Industry Presets
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
        {SECTOR_PRESETS.map((sector) => {
          const isSelected = sector.id === activeSector.id;
          return (
            <button
              key={sector.id}
              onClick={() => setSelectedSectorId(sector.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                isSelected
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30"
                  : "bg-card text-card-foreground hover:bg-muted/50 border-border"
              }`}
            >
              <div className="text-2xl">{sector.emoji}</div>
              <div>
                <h4 className="font-bold text-xs line-clamp-1">{sector.name}</h4>
                <p className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-muted-foreground"}`}>
                  {sectorUnits.length} units
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-3xl">{activeSector.emoji}</span>
              <Badge variant="secondary" className="font-bold text-xs uppercase">
                {sectorUnits.length} Units
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold">{activeSector.name}</CardTitle>
            <CardDescription className="text-xs">{activeSector.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                Supported Units:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {sectorUnits.map((unit) => (
                  <Badge key={unit} variant="outline" className="bg-muted/40 font-mono text-[11px] px-2 py-0.5">
                    {unit}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-500" />
                Built-In Product Library Templates ({builtInProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[220px] overflow-y-auto">
                {builtInProducts.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">No built-in products for this sector.</p>
                ) : (
                  builtInProducts.map((prod, idx) => (
                    <div key={idx} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-muted/30">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{prod.emoji || "📦"}</span>
                        <div>
                          <h5 className="font-bold text-foreground">{prod.name}</h5>
                          <p className="text-[10px] text-muted-foreground">{prod.categoryName}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-[10px] font-mono">{prod.defaultUnit}</Badge>
                        {prod.estimatedPrice && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                            ~₦{prod.estimatedPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Verified Distributors for {activeSector.name}
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Official manufacturer depots automatically offered during product setup
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {categoryDistributors.length} Registered Depots
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryDistributors.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No official depot presets registered for this category yet.</p>
              ) : (
                categoryDistributors.map((dist) => (
                  <div key={dist.id} className="p-3 rounded-xl border bg-card/60 flex items-center justify-between text-xs gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-foreground">{dist.name}</h5>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1 py-0">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Verified
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Contact: {dist.contactPerson} ({dist.contactPhone}) • {dist.state} Hub
                      </p>
                      <div className="flex gap-1 flex-wrap pt-0.5">
                        {dist.brands.map((b) => (
                          <span key={b} className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-medium">{b}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-muted-foreground block">Lead Time: {dist.deliveryLeadDays} day(s)</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Min: ₦{dist.minOrderValueNgn.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
