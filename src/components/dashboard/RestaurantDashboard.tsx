import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useInventoryData";
import { ChefHat, Clock, Leaf, Utensils, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export function RestaurantDashboard() {
  const { data: items } = useItems();

  const [tableStatuses, setTableStatuses] = useState<Record<number, { status: "available" | "cooking" | "served"; orderTime?: string; itemsCount?: number; totalPrice?: number }>>({});

  const reloadTableStatuses = () => {
    const statuses: Record<number, { status: "available" | "cooking" | "served"; orderTime?: string; itemsCount?: number; totalPrice?: number }> = {};
    for (let i = 1; i <= 12; i++) {
      const saved = localStorage.getItem(`pos-table-status-${i}`);
      if (saved) {
        try {
          statuses[i] = JSON.parse(saved) as { status: "available" | "cooking" | "served"; orderTime?: string; itemsCount?: number; totalPrice?: number };
        } catch (e) {
          statuses[i] = { status: "available" };
        }
      } else {
        statuses[i] = { status: "available" };
      }
    }
    setTableStatuses(statuses);
  };

  useEffect(() => {
    reloadTableStatuses();
    const interval = setInterval(reloadTableStatuses, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateTable = (tNum: number, nextStatus: "cooking" | "served" | "available") => {
    if (nextStatus === "available") {
      localStorage.removeItem(`pos-table-status-${tNum}`);
    } else {
      const current = tableStatuses[tNum] || {};
      localStorage.setItem(`pos-table-status-${tNum}`, JSON.stringify({
        ...current,
        status: nextStatus,
      }));
    }
    reloadTableStatuses();
  };
  
  const menuItems = items.filter(i => i.status !== "archived");

  return (
    <div className="space-y-6">
      {/* Restaurant Kitchen KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Menu Catalog", value: menuItems.length, sub: "Items Active", icon: ChefHat, color: "text-orange-600", bg: "bg-orange-50/10 dark:bg-orange-950/20" },
          { label: "In Stock", value: items.filter(i => i.currentStock > 0 && i.status !== "archived").length, sub: "Available Items", icon: Utensils, color: "text-green-600", bg: "bg-green-50/10 dark:bg-green-950/20" },
          { label: "Low Stock", value: items.filter(i => i.currentStock > 0 && i.currentStock <= (i.reorderPoint || 10) && i.status !== "archived").length, sub: "Needs Restock", icon: CircleDot, color: "text-red-600", bg: "bg-red-50/10 dark:bg-red-950/20" },
          { label: "Avg Prep", value: "18m", sub: "Kitchen Target", icon: Clock, color: "text-blue-600", bg: "bg-blue-50/10 dark:bg-blue-950/20" },
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
                  <Utensils className="h-4 w-4 text-primary" />
                  Popular Menu Highlights
                </CardTitle>
                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter bg-background px-2">Top Performer</Badge>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
               {menuItems.slice(0, 5).map(item => (
                 <div key={item.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors">
                   <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-xl bg-orange-100/50 flex items-center justify-center text-xl shadow-xs border border-orange-200/30">
                        <Utensils className="h-5 w-5 text-orange-500" />
                     </div>
                     <div>
                       <p className="text-sm font-bold">{item.name}</p>
                       <p className="text-[10px] text-muted-foreground mt-1">
                         {item.currentStock} {item.unit} in stock
                       </p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-xs font-bold font-mono tracking-tight text-foreground">
                       {item.sellingPrice.toLocaleString()}
                     </p>
                     <div className="mt-1">
                       <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-black uppercase text-primary border border-primary/20">
                         Trending
                       </span>
                     </div>
                   </div>
                 </div>
               ))}
            </div>
            <div className="p-3 bg-muted/10">
               <Button variant="ghost" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-orange-600">
                 View Full Menu & Prep Times
               </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="bg-muted/30 pb-3">
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <ChefHat className="h-4 w-4 text-primary" />
               Current Kitchen Capacity
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
             {/* Abstract Gauge */}
             <div className="relative w-48 h-24 mb-10">
                <div className="absolute inset-0 rounded-t-full border-8 border-muted" />
                <div 
                  className="absolute inset-0 rounded-t-full border-8 border-primary border-r-transparent border-b-transparent rotate-[45deg] origin-bottom transition-all duration-1000" 
                  style={{ transform: "rotate(25deg)" }}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                   <span className="text-3xl font-black tabular-nums">42%</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Utilized</span>
                </div>
             </div>
             
             <div className="w-full space-y-4">
                <div className="p-3 rounded-xl border border-orange-100 bg-orange-50/50 dark:bg-orange-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase text-orange-850">Prep Backlog</span>
                    <span className="text-[10px] font-bold text-orange-900 dark:text-orange-350">
                      {Object.values(tableStatuses).filter(t => t.status === "cooking").length} Orders cooking
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-orange-200/50 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.min(100, Object.values(tableStatuses).filter(t => t.status === "cooking").length * 25)}%` }} />
                  </div>
                </div>
                
                <p className="text-center text-[9px] text-muted-foreground leading-relaxed px-4">
                  Capacity is measured by active tickets vs. workstations. Current kitchen flow is stable.
                </p>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Live Table Layout Tracking */}
      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Utensils className="h-4 w-4 text-orange-600" />
              Live Table Layout Status & Kitchen Routing Panel
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Free</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" /> Kitchen Prep</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Eating</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, idx) => {
              const tNum = idx + 1;
              const table = tableStatuses[tNum] || { status: "available" };
              
              return (
                <div
                  key={tNum}
                  className={cn(
                    "flex flex-col rounded-2xl border p-3.5 items-center text-center transition-all",
                    table.status === "available" && "border-green-200 bg-green-50/15 dark:bg-green-950/5 hover:bg-green-50/35",
                    table.status === "cooking" && "border-amber-300 bg-amber-50/15 dark:bg-amber-950/10 ring-1 ring-amber-400/10",
                    table.status === "served" && "border-red-200 bg-red-50/15 dark:bg-red-950/10"
                  )}
                >
                  <span className={cn(
                    "h-8 w-8 rounded-full font-black text-xs flex items-center justify-center mb-2 shadow-xs",
                    table.status === "available" && "bg-green-500 text-white",
                    table.status === "cooking" && "bg-amber-500 text-white animate-pulse",
                    table.status === "served" && "bg-red-500 text-white"
                  )}>
                    T{tNum}
                  </span>
                  
                  <span className="text-[10px] font-bold uppercase tracking-wider block mb-2 text-foreground/80">
                    {table.status === "available" && "Available"}
                    {table.status === "cooking" && "Cooking..."}
                    {table.status === "served" && "Served"}
                  </span>

                  {table.status !== "available" && (
                    <div className="w-full text-[9px] text-muted-foreground font-medium space-y-0.5 border-t border-border/40 pt-1.5 mb-3">
                      <div className="flex justify-between">
                        <span>Items:</span>
                        <span className="font-bold">{table.itemsCount || 0}</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>Subtotal:</span>
                        <span className="font-bold text-foreground">{(table.totalPrice || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto w-full">
                    {table.status === "cooking" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateTable(tNum, "served")}
                        className="w-full h-7 text-[9px] font-black uppercase tracking-tight bg-amber-500 hover:bg-amber-650 text-white rounded-lg"
                      >
                        Served
                      </Button>
                    )}
                    {table.status === "served" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateTable(tNum, "available")}
                        className="w-full h-7 text-[9px] font-black uppercase tracking-tight rounded-lg"
                      >
                        Clear Table
                      </Button>
                    )}
                    {table.status === "available" && (
                      <span className="text-[9px] text-green-700 dark:text-green-400 font-bold uppercase tracking-tighter">
                        Active Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
