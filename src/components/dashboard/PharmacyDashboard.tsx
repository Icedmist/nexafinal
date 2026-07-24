import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useItems } from "@/hooks/useInventoryData";
import { AlertCircle, Calendar, FlaskConical, Pill, ShieldAlert } from "lucide-react";
import { format, isBefore, addMonths, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export function PharmacyDashboard() {
  const { data: items } = useItems();
  
  const pharmacyItems = items.filter(i => i.pharmacy);
  
  // Sorted by expiry date
  const medicationsExpiringSoon = pharmacyItems
    .filter(i => i.pharmacy?.expiryDate)
    .sort((a, b) => 
      new Date(a.pharmacy!.expiryDate!).getTime() - 
      new Date(b.pharmacy!.expiryDate!).getTime()
    )
    .slice(0, 5);

  const prescriptionCount = pharmacyItems.filter(i => i.pharmacy?.requiresPrescription).length;

  return (
    <div className="space-y-6">
      {/* Pharmacy Operational KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { 
            label: "Expired", 
            value: pharmacyItems.filter(i => i.pharmacy?.expiryDate && isBefore(parseISO(i.pharmacy.expiryDate), new Date())).length, 
            sub: "Requires Disposal", 
            icon: ShieldAlert, 
            color: "text-red-600", 
            bg: "bg-red-50" 
          },
          { 
            label: "Critical (3m)", 
            value: pharmacyItems.filter(i => i.pharmacy?.expiryDate && isBefore(parseISO(i.pharmacy.expiryDate), addMonths(new Date(), 3)) && !isBefore(parseISO(i.pharmacy.expiryDate), new Date())).length, 
            sub: "Fast Track Sale", 
            icon: Calendar, 
            color: "text-orange-600", 
            bg: "bg-orange-50" 
          },
          { 
            label: "Rx Restricted", 
            value: prescriptionCount, 
            sub: "Requires MD Script", 
            icon: Pill, 
            color: "text-blue-600", 
            bg: "bg-blue-50" 
          },
          { 
            label: "Medications", 
            value: pharmacyItems.length, 
            sub: "Active Inventory", 
            icon: FlaskConical, 
            color: "text-primary", 
            bg: "bg-primary/5" 
          },
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
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Inventory Expiry Watchlist
                </CardTitle>
                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter bg-background">Regulation Checklist</Badge>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {medicationsExpiringSoon.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground italic text-xs">
                  All medications within safe shelf-life.
                </div>
              ) : (
                medicationsExpiringSoon.map(item => {
                  const expiryDate = parseISO(item.pharmacy!.expiryDate!);
                  const isExpired = isBefore(expiryDate, new Date());
                  const isSoon = !isExpired && isBefore(expiryDate, addMonths(new Date(), 1));
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-xs border border-border/30",
                          isExpired ? "bg-red-100" : isSoon ? "bg-orange-100" : "bg-muted/50"
                        )}>
                          {item.emoji || "💊"}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono uppercase text-muted-foreground">
                              {item.pharmacy?.batchNumber || "NO-BATCH"}
                            </span>
                            {item.pharmacy?.requiresPrescription && (
                              <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                Prescription
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-xs font-bold font-mono tracking-tight", isExpired ? "text-red-600" : isSoon ? "text-orange-600" : "text-foreground")}>
                          {format(expiryDate, "MMM dd, yyyy")}
                        </p>
                        <div className="mt-1">
                          {isExpired ? (
                            <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black uppercase text-white shadow-sm">
                              Expired
                            </span>
                          ) : isSoon ? (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[8px] font-black uppercase text-orange-700 ring-1 ring-inset ring-orange-600/20">
                              30 Days Left
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">Stable</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 bg-muted/10">
               <Button variant="ghost" className="w-full h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-600">
                 Generate Disposal Report
               </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="bg-muted/30 pb-3">
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <FlaskConical className="h-4 w-4 text-primary" />
               Regulatory Compliance
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6 flex-1">
            <div className="space-y-4">
              {[
                { label: "Prescription Verif.", percent: 100, color: "bg-green-500" },
                { label: "Batch Traceability", percent: 85, color: "bg-blue-500" },
                { label: "Storage Temp Check", percent: 92, color: "bg-orange-500" },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                    <span>{item.label}</span>
                    <span className="text-foreground">{item.percent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden shadow-inner">
                    <div className={cn("h-full transition-all duration-1000", item.color)} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 mt-auto">
              <div className="flex gap-3">
                <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                  <strong>Pharmacist Note:</strong> Ensure all batch records are synchronized with 
                  NAFDAC traceability standards before the EOD audit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
