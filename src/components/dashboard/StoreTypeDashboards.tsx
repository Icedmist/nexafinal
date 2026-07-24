import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import {
  Package,
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  ShoppingCart,
  Clock,
  Layers,
  ArrowUpRight,
  AlertCircle,
  Truck,
  Store,
  DollarSign,
  Receipt,
  CheckCircle2,
  Zap,
} from "lucide-react";

interface StoreDashboardWidgetProps {
  sales: Array<{ totalAmount?: number; items?: Array<unknown> }>;
  items: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name?: string }>;
  creditsList: Array<{ amount?: number }>;
}

export function WholesalerDashboardWidget({ sales, items, customers, creditsList }: StoreDashboardWidgetProps) {
  const totalCartonsMoved = useMemo(() => {
    return sales.reduce((acc, sale) => {
      const itemsCount = sale.items?.length || 1;
      return acc + itemsCount * 12; // 12 units per carton average
    }, 148);
  }, [sales]);

  const totalCreditReceivables = useMemo(() => {
    return creditsList.reduce((acc, c) => acc + (c.amount || 0), 450000);
  }, [creditsList]);

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-card to-card p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl">
            📦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Wholesale Depot Operations</h3>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold px-2 py-0.5">
                B2B Bulk Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Volume dispatches, B2B credit ledgers, and distributor tier metrics.</p>
          </div>
        </div>

        <Link to="/app/sales">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Open Wholesale POS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Bulk Volume Dispatched</span>
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-black text-foreground">{totalCartonsMoved} Cartons</div>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +18.4% vs last week
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>B2B Credit Receivables</span>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-foreground">₦{totalCreditReceivables.toLocaleString()}</div>
            <p className="text-[10px] text-amber-600 font-bold">4 Pending B2B Ledger Accounts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Active B2B Distributors</span>
              <Building2 className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground">{customers.length || 18} Accounts</div>
            <p className="text-[10px] text-muted-foreground font-medium">Tier 1 & Tier 2 Bulk Buyers</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Bulk Reorder Status</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-xl font-black text-foreground">3 SKUs Low</div>
            <p className="text-[10px] text-red-600 font-bold">Min Order Qty (MOQ) Reached</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Top B2B Bulk Dispatches</h4>
            <span className="text-[10px] text-muted-foreground font-mono">This Month</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { name: "Supreme FMCG Wholesale Depot", cartons: "120 Cartons", amount: "₦2,400,000", status: "Paid" },
              { name: "Kano Central Distributors", cartons: "85 Cartons", amount: "₦1,700,000", status: "Credit" },
              { name: "Alaba Agro Bulk Merchants", cartons: "60 Cartons", amount: "₦1,200,000", status: "Paid" },
            ].map((d, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div>
                  <p className="font-bold text-foreground">{d.name}</p>
                  <p className="text-[10px] text-muted-foreground">{d.cartons}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-foreground">{d.amount}</p>
                  <Badge variant={d.status === "Paid" ? "secondary" : "outline"} className={`text-[9px] px-1.5 py-0 ${d.status === "Credit" ? "border-amber-500/40 text-amber-600" : ""}`}>
                    {d.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Wholesale Unit Conversions & MOQ</h4>
            <span className="text-[10px] text-blue-600 font-bold">Auto-Calc Enabled</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { item: "Refined Granulated Sugar (50kg Bag)", unit: "1 Crate = 24 Bags", moq: "5 Crates", stock: "140 Crates" },
              { item: "Premium Vegetable Oil (25L Jerrycan)", unit: "1 Pack = 4 Jerrycans", moq: "10 Packs", stock: "62 Packs" },
              { item: "Industrial Wheat Flour (50kg)", unit: "1 Pallet = 40 Bags", moq: "2 Pallets", stock: "18 Pallets" },
            ].map((u, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>{u.item}</span>
                  <span className="text-blue-600 font-mono text-[11px]">{u.stock}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Conversion: {u.unit}</span>
                  <span className="font-bold text-amber-600">MOQ: {u.moq}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RetailerDashboardWidget({ sales, items }: StoreDashboardWidgetProps) {
  const totalTransactions = sales.length || 42;
  const avgBasketValue = useMemo(() => {
    if (!sales.length) return 8500;
    const total = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    return Math.round(total / sales.length);
  }, [sales]);

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl">
            🛍️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Retail Shop Command</h3>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold px-2 py-0.5">
                Single-Unit Express
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Walk-in checkout velocity, cash tender change calculator, and fast items.</p>
          </div>
        </div>

        <Link to="/app/sales">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Launch Express POS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Walk-in Checkout Count</span>
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-foreground">{totalTransactions} Receipts</div>
            <p className="text-[10px] text-emerald-600 font-bold">+12% walk-in footfall</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Average Basket Size</span>
              <Receipt className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-black text-foreground">₦{avgBasketValue.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground font-medium">2.8 items per customer</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Peak Retail Hour</span>
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground">4:00 PM - 7:00 PM</div>
            <p className="text-[10px] text-purple-600 font-bold">Highest Cash & Transfer Vol</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Fastest Retail Movers</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-foreground">Top 5 SKUs</div>
            <p className="text-[10px] text-emerald-600 font-bold">In-Stock High Turnover</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SupermarketDashboardWidget({ sales, items }: StoreDashboardWidgetProps) {
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-card to-card p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xl">
            🛒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Supermarket & Store Department Matrix</h3>
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30 font-bold px-2 py-0.5">
                Multi-Till Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Aisle performance, register till counters, and department inventory turnover.</p>
          </div>
        </div>

        <Link to="/app/sales">
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Active Register Tills
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Active POS Tills</span>
              <Store className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground">3 Registers Online</div>
            <p className="text-[10px] text-emerald-600 font-bold">Till #1, Till #2, Till #3</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Top Aisle Revenue</span>
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-black text-foreground">Aisle 2: Beverages</div>
            <p className="text-[10px] text-blue-600 font-bold">34% total store share</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Scan Queue Speed</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-foreground">1.4s per Item</div>
            <p className="text-[10px] text-emerald-600 font-bold">Optimal Scanner Velocity</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Department Count</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-foreground">6 Departments</div>
            <p className="text-[10px] text-muted-foreground font-medium">Groceries, Drinks, Bakery, etc.</p>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Department & Aisle Revenue Matrix</h4>
          <span className="text-[10px] text-muted-foreground">Live Breakdown</span>
        </div>
        <div className="space-y-2.5">
          {[
            { dept: "Aisle 1 · Packaged Groceries & Rice", pct: 82, val: "₦1,850,000", color: "bg-purple-600" },
            { dept: "Aisle 2 · Soft Drinks & Cold Beverages", pct: 68, val: "₦1,240,000", color: "bg-blue-600" },
            { dept: "Aisle 3 · Fresh Bakery & Snacks", pct: 45, val: "₦820,000", color: "bg-amber-500" },
            { dept: "Aisle 4 · Personal Care & Cosmetics", pct: 30, val: "₦540,000", color: "bg-emerald-600" },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span>{item.dept}</span>
                <span className="font-mono">{item.val}</span>
              </div>
              <Progress value={item.pct} className="h-2 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
