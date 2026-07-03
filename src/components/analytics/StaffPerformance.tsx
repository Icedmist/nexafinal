import { useMemo } from "react";
import { 
  TrendingUp, 
  ShoppingBag, 
  Banknote, 
  BarChart3, 
  ArrowUpRight,
  User as UserIcon,
  Store
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSales } from "@/hooks/useSalesData";
import { useStaff, useStoreBranches } from "@/hooks/useStaffData";
import type { SaleTransaction } from "@/types/inventory";
import type { Staff, Branch } from "@/types/tenant";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { exportStaffPerformancePDF } from "@/lib/pdf-export";

import { Skeleton } from "@/components/ui/skeleton";
import { MetricCardSkeleton } from "@/components/shared/skeletons";

interface StaffMetrics {
  uid: string;
  name: string;
  email: string;
  role: string;
  branchName: string;
  totalSales: number;
  transactionCount: number;
  avgTransaction: number;
}

export function StaffPerformance() {
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: staff, isLoading: staffLoading } = useStaff();
  const { data: branches } = useStoreBranches();
  const { profile } = useBusiness();
  const storeName = profile?.storeDetails?.name || "Nexa Store OS";

  const metrics = useMemo(() => {
    if (!sales.length || !staff.length) return [];

    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    
    return staff.map(s => {
      const staffSales = sales.filter(sale => sale.recordedBy === s.uid);
      const totalSales = staffSales.reduce((acc, sale) => acc + sale.totalNgn, 0);
      const count = staffSales.length;
      
      return {
        uid: s.uid,
        name: s.displayName,
        email: s.email,
        role: s.role,
        branchName: branchMap.get(s.branchId) || "Not Assigned",
        totalSales,
        transactionCount: count,
        avgTransaction: count > 0 ? totalSales / count : 0
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [sales, staff, branches]);

  const stats = useMemo(() => {
    const total = metrics.reduce((acc, m) => acc + m.totalSales, 0);
    const avg = metrics.length > 0 ? total / metrics.length : 0;
    const topPerformer = metrics[0];
    
    return { total, avg, topPerformer };
  }, [metrics]);

  if (salesLoading || staffLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <Card className="p-6 border-2">
          <Skeleton className="h-5 w-48 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-2">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Staff Sales</p>
              <h3 className="text-2xl font-black italic">₦{stats.total.toLocaleString()}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-accent/10 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-amber-accent" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Transactions</p>
              <h3 className="text-2xl font-black italic">{sales.length}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-2">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <Banknote className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Avg per Staff</p>
              <h3 className="text-2xl font-black italic">₦{stats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="border-2 rounded-2xl overflow-hidden">
        <div className="p-6 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Staff Sales Leaderboard
          </h3>
          {metrics.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest hover:bg-muted/50"
              onClick={() => exportStaffPerformancePDF(metrics, storeName)}
            >
              Export Leaderboard
            </Button>
          )}
        </div>
        <div className="divide-y-2">
          {metrics.map((m, idx) => (
            <div key={m.uid} className="p-6 flex flex-col md:flex-row md:items-center gap-6 hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-4 min-w-[240px]">
                <div className="relative">
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center font-black text-lg",
                    idx === 0 ? "bg-amber-accent text-white shadow-lg shadow-amber-accent/20" : "bg-muted text-muted-foreground"
                  )}>
                    {m.name[0]}
                  </div>
                  {idx === 0 && (
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5">
                      <div className="bg-amber-accent rounded-full p-0.5">
                        <ArrowUpRight className="h-2 w-2 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-black text-sm">{m.name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Building2 className="h-3 w-3" />
                    {m.branchName}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span>Progress to Target</span>
                  <span>₦{m.totalSales.toLocaleString()}</span>
                </div>
                <Progress 
                  value={stats.total > 0 ? (m.totalSales / stats.total) * 100 * 2 : 0} 
                  className="h-2" 
                />
              </div>

              <div className="grid grid-cols-2 gap-8 md:min-w-[200px]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sales</p>
                  <p className="font-black italic">{m.transactionCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg. Value</p>
                  <p className="font-black italic text-sm">₦{m.avgTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Building2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}
