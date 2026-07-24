import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useInventoryData";
import { Factory, Layers, PlayCircle, Settings, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export function ManufacturingDashboard() {
  const { data: items } = useItems();
  
  const mfgItems = items.filter(i => i.manufacturing);
  
  const stages = ["Raw Material", "Semi-Finished", "Finished Goods"];
  const stageCounts = stages.map(s => ({
    name: s,
    count: mfgItems.filter(i => i.manufacturing?.productionStage?.toLowerCase() === s.toLowerCase() || (s === "Finished Goods" && i.manufacturing?.productionStage === "Finished")).length
  }));

  return (
    <div className="space-y-6">
      {/* Manufacturing KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Products", value: mfgItems.length, sub: "Factory Tracking", icon: Factory, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Active Jobs", value: "12", sub: "Floor Capacity", icon: PlayCircle, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "OEE Efficiency", value: "98%", sub: "Top Performer", icon: Settings, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Deliveries", value: "4", sub: "Incoming/Outgoing", icon: Truck, color: "text-green-600", bg: "bg-green-50" },
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
                  <Layers className="h-4 w-4 text-primary" />
                  Production Pipeline Stages
                </CardTitle>
                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter bg-background px-2">Live Floor</Badge>
             </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {stageCounts.map(stage => (
                <div key={stage.name} className="group">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stage.name}</span>
                    <span className="text-xs font-bold font-mono text-foreground">{stage.count} Total Units</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden shadow-inner flex">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000 ease-out",
                        stage.name.includes("Raw") ? "bg-orange-500" : stage.name.includes("Semi") ? "bg-blue-500" : "bg-green-500"
                      )} 
                      style={{ width: `${(stage.count / (mfgItems.length || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-2 px-1">
               <div className="text-center p-2 rounded-lg bg-orange-50 border border-orange-100">
                  <p className="text-xs font-black text-orange-700">32%</p>
                  <p className="text-[8px] uppercase font-bold text-orange-600/70">Ingestion</p>
               </div>
               <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs font-black text-blue-700">45%</p>
                  <p className="text-[8px] uppercase font-bold text-blue-600/70">WIP Wait</p>
               </div>
               <div className="text-center p-2 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs font-black text-green-700">23%</p>
                  <p className="text-[8px] uppercase font-bold text-green-600/70">Inventory</p>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="bg-muted/30 pb-3">
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <Settings className="h-4 w-4 text-primary" />
               BOM Health Audit
             </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-border">
              {mfgItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-100/50 flex items-center justify-center text-xl shadow-xs border border-purple-200/30">
                      {item.emoji || "🏭"}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none mb-1">{item.name}</p>
                      <p className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                        <Badge variant="outline" className="h-3.5 text-[7px] uppercase px-1 border-purple-200 text-purple-700">Certified</Badge>
                        <span className="italic truncate max-w-[120px]">{item.manufacturing?.bomSummary?.split(" ")[0]}... verified</span>
                      </p>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full border-2 border-green-500/20 flex items-center justify-center">
                     <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-white scale-75">
                        <Settings className="h-3 w-3" />
                     </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-muted/10">
               <Button variant="ghost" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-purple-600">
                 Run Production Forecast
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
