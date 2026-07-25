import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useInventoryData";
import { Calendar, CloudSun, Droplets, MapPin, Sprout, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgricultureDashboard() {
  const { data: items } = useItems();
  
  const agriculturalItems = items.filter(i => i.status !== "archived");

  return (
    <div className="space-y-6">
      {/* Environmental Metrics */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Temp", value: "28°C", sub: "Sunny / Clear", icon: CloudSun, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Humidity", value: "65%", sub: "Optimal", icon: Droplets, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Moisture", value: "Low", sub: "Watering Needed", icon: Droplets, color: "text-cyan-600", bg: "bg-cyan-50" },
          { label: "Crops", value: agriculturalItems.length, sub: "Actively Growing", icon: Sprout, color: "text-green-600", bg: "bg-green-50" },
        ].map((stat, i) => (
          <div key={i} className={cn("rounded-xl border border-border p-4 shadow-xs", stat.bg)}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-lg bg-background border border-border/50", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular-nums">{stat.value}</span>
              <span className="text-[10px] font-medium text-muted-foreground">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-3">
             <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Inventory Items
                </CardTitle>
                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter bg-background">Active Catalog</Badge>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {agriculturalItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground italic text-xs">
                  No items in inventory yet.
                </div>
              ) : (
                agriculturalItems.slice(0, 5).map(item => {
                  return (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shadow-xs border border-border/30">
                           <Sprout className="h-5 w-5 text-green-600" />
                         </div>
                        <div>
                          <p className="text-sm font-bold">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-medium text-muted-foreground">
                              Main Storage
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold font-mono tracking-tight text-foreground">
                          {item.currentStock} {item.unit}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 bg-muted/10">
               <Button variant="ghost" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
                 View Full Farm Schedule
               </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="bg-muted/30 pb-3">
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <MapPin className="h-4 w-4 text-primary" />
               Field Grid Status
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col items-center justify-center">
             <div className="grid grid-cols-4 gap-2.5 w-full max-w-[240px]">
                {[...Array(16)].map((_, i) => {
                  const plotId = `Field ${String.fromCharCode(65 + Math.floor(i/4))}-${(i%4)+1}`;
                  const crop = agriculturalItems[i % agriculturalItems.length];
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "aspect-square rounded-lg border flex items-center justify-center text-sm relative group cursor-pointer transition-all hover:scale-110 hover:shadow-lg hover:z-10",
                        crop ? "bg-green-500/10 border-green-500/30 text-green-700" : "bg-muted/10 border-dashed border-border"
                      )}
                    >
                      {crop ? (
                        <span className="animate-in zoom-in-50 duration-300">
                          <Sprout className="h-4 w-4" />
                        </span>
                      ) : (
                        <Plus className="h-2 w-2 text-muted-foreground/30" />
                      )}
                      
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-foreground text-background px-2 py-1 rounded text-[8px] font-bold whitespace-nowrap pointer-events-none transition-all shadow-xl z-20">
                         {plotId}: {crop?.name || "Ready for Sowing"}
                      </div>
                    </div>
                  );
                })}
             </div>
             <div className="mt-8 w-full space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                   <span>Land Utilization</span>
                   <span>{(Math.min(agriculturalItems.length, 16) / 16 * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-green-500 transition-all duration-1000" 
                     style={{ width: `${(Math.min(agriculturalItems.length, 16) / 16 * 100)}%` }}
                   />
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
