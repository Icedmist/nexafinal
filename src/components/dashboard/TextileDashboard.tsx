import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useItems } from "@/hooks/useInventoryData";
import { Scissors, Ruler, Paintbrush, Box, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TextileDashboard() {
  const { data: items } = useItems();
  
  const textileItems = items.filter(i => i.textile);
  
  const totalYards = textileItems.reduce((acc, item) => {
    if (item.unit === "yard" || item.unit === "m") {
      return acc + item.currentStock;
    }
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Textile Meta Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Fabric Stock", value: `${totalYards.toLocaleString()} yds`, sub: "Total Length", icon: Ruler, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Design Variants", value: textileItems.length, sub: "Patterns & Colors", icon: Paintbrush, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Material Types", value: new Set(textileItems.map(i => i.textile?.fabricContent)).size, sub: "Silk, Cotton, Lace", icon: Scissors, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Bundles", value: textileItems.filter(i => i.unit === "bundle").length, sub: "Pre-cut packs", icon: Box, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat, i) => (
          <div key={i} className={cn("rounded-xl border border-border p-4 shadow-xs", stat.bg)}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-lg bg-background border border-border/50", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black tabular-nums">{stat.value}</span>
              <span className="text-[10px] font-medium text-muted-foreground">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/30 pb-3">
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <Scissors className="h-4 w-4 text-primary" />
               Premium Fabric Collection
             </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {textileItems.slice(0, 4).map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-xl border border-border/30">
                      {item.emoji || "🧵"}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {item.textile?.weaveType || "Standard Weave"} • {item.textile?.gsm || "???"} GSM
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                       <p className="text-xs font-bold">{item.currentStock} {item.unit}</p>
                       <p className="text-[10px] text-muted-foreground">In Stock</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-indigo-600 text-white overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <Scissors className="h-32 w-32 rotate-45" />
           </div>
           <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Textile Trends</CardTitle>
           </CardHeader>
           <CardContent className="pt-2">
              <p className="text-2xl font-black mb-1">Lace Season</p>
              <p className="text-[10px] text-white/70 font-medium leading-relaxed">
                Demand for Laces & Embroidery is up 24% this week. Ensure your yards inventory is updated before the weekend sales peak.
              </p>
              <div className="mt-6 p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-2">Popular Content</p>
                 <div className="flex flex-wrap gap-1.5">
                    {["Cotton", "Silk", "Ankara", "Chiffon"].map(t => (
                       <Badge key={t} variant="outline" className="bg-white/5 border-white/20 text-white text-[8px] font-bold uppercase">{t}</Badge>
                    ))}
                 </div>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
