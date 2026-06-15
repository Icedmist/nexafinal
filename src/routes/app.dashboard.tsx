import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Package, PackagePlus, CheckCircle2, AlertTriangle, XCircle, ChevronDown, Banknote, Users, TrendingUp, ShoppingCart, TrendingDown, Receipt, Clock, Store, Settings, Plus as PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StockStatusDonut, CategoryDonut } from "@/components/dashboard/StockDonutChart";
import { DashboardReorderSection } from "@/components/insights/DashboardReorderSection";
import { DashboardAnomalySection } from "@/components/insights/DashboardAnomalySection";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { cn, normalizePhone } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { useStockSummary, useItems, useMovements, useSuppliers } from "@/hooks/useInventoryData";
import { useAlertGenerator } from "@/hooks/useStockAlertGenerator";
import { useRole } from "@/hooks/useRole";
import { useSales, useDebtPayments, useSalesMutations } from "@/hooks/useSalesData";
import { useExpenses } from "@/hooks/useExpensesData";
import { useRefunds } from "@/hooks/useRefundsData";
import { useOnboarding, type TourStep } from "@/hooks/useOnboarding";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { OfflineStatusIndicator } from "@/components/shared/OfflineStatusIndicator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAIRA = "₦";

const TOUR_STEPS: TourStep[] = [
  { title: "Welcome to NEXA Store OS!", description: "Let's take a quick tour of all the key features. This will only take a minute." },
  { target: "sidebar", title: "Navigation", description: "Use the sidebar to switch between sections — sales, catalog, customers, analytics, and more." },
  { target: "metrics", title: "Business overview", description: "Your key metrics at a glance — revenue, profit, expenses, and customer counts." },
  { target: "needs-attention", title: "Alerts & activity", description: "Items that need action appear here — low stock, overdue Restocking, and pending requests." },
  { target: "search", title: "Quick search", description: "Press CMD+K (or Ctrl+K) to search anything — items, suppliers, orders, and more." },
  { target: "sales", title: "Sales & POS", description: "Head to Sales to ring up orders, apply discounts, accept multiple payment methods, and send receipts via WhatsApp." },
  { target: "customers", title: "Customers", description: "The Customers page shows purchase history, debt tracking, and lets you message customers directly via WhatsApp." },
  { target: "settings", title: "Settings", description: "Admins can configure store branding, smart features, staff roles, and launch this tour again from Settings > Help." },
  { title: "You're all set!", description: "Explore freely! You can restart this tour anytime from Settings > Help." },
];

interface AccordionSectionProps {
  id: string;
  title: string;
  openSection: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  dataTour?: string;
}

function AccordionSection({ id, title, openSection, onToggle, children, dataTour }: AccordionSectionProps) {
  const isOpen = openSection === id;
  return (
    <div data-tour={dataTour} className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardPage;

function DashboardPage() {
  const navigate = useNavigate();
  const { data: summary } = useStockSummary();
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: payments, isLoading: paymentsLoading } = useDebtPayments();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const { data: refunds, isLoading: refundsLoading } = useRefunds();
  const { data: realItems } = useItems();
  const { data: realMovements } = useMovements();
  const { data: realSuppliers } = useSuppliers();
  const { isAdmin, isManager } = useRole();
  const { profile } = useBusiness();
  const { user } = useAuth();
  const { cacheData } = useOfflineMode();
  // useAlertGenerator(); // Disabled for production

  const items = realItems;
  const movements = realMovements;
  const suppliers = realSuppliers;

  const { recordDebtPayment } = useSalesMutations();
  const [paymentTarget, setPaymentTarget] = useState<{ phone: string; name: string; balance: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const isLoading = salesLoading || expensesLoading || refundsLoading || paymentsLoading;

  const tour = useOnboarding("dashboard");
  const [openSection, setOpenSection] = useState<string | null>("metrics");
  const [searchParams] = useSearchParams();

  // Cache data to offline storage when it loads
  useEffect(() => {
    if (sales.length > 0 || payments.length > 0) {
      cacheData({
        sales,
        debtPayments: payments,
        lastSync: new Date().toISOString(),
      }).catch((err) => console.warn('Offline cache update failed:', err));
    }
  }, [sales, payments, cacheData]);

  // Auto-start tour if coming from onboarding
  useEffect(() => {
    if (searchParams.get("tour") === "true") {
      tour.startTour();
    }
  }, [searchParams, tour.startTour]);

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };


  const handleTourComplete = () => {
    tour.completeTour();
    toast.success("Tour complete! Explore freely or start the walkthrough.");
  };


  // Sales metrics
  const totalRevenue = sales.reduce((s, sale) => s + sale.totalNgn, 0);
  const todaySales = sales.filter((s) => {
    const d = new Date(s.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalNgn, 0);
  const uniqueCustomers = new Set(sales.filter((s) => s.customerPhone).map((s) => s.customerPhone)).size;

  // Debt metrics
  const totalCreditSales = sales.filter(s => s.isCreditSale).reduce((s, sale) => s + sale.totalNgn, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amountNgn, 0);
  const totalOutstandingDebt = totalCreditSales - totalPayments;

  // Expense & refund metrics
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRefunds = refunds.reduce((s, r) => s + r.amountNgn, 0);
  const netProfit = totalRevenue - totalExpenses - totalRefunds;
  const todayExpenses = expenses.filter((e) => new Date(e.date).toDateString() === new Date().toDateString()).reduce((s, e) => s + e.amount, 0);


  // Debt management list
  const debtors = useMemo(() => {
    const customerDebts: Record<string, { name: string; phone?: string; balance: number }> = {};
    
    sales.filter(s => s.isCreditSale && (s.customerPhone || s.customerName)).forEach(s => {
      const phone = s.customerPhone?.trim();
      const name = s.customerName?.trim();
      const key = phone ? normalizePhone(phone) : `name:${name?.toLowerCase()}`;
      
      if (!customerDebts[key]) {
        customerDebts[key] = { name: name || "Unknown", phone: phone || undefined, balance: 0 };
      }
      customerDebts[key].balance += s.totalNgn;
    });

    payments.forEach(p => {
      const phone = p.customerPhone?.trim();
      const name = p.customerName?.trim();
      if (!phone && !name) return;
      
      const key = phone ? normalizePhone(phone) : `name:${name?.toLowerCase()}`;
      if (customerDebts[key]) {
        customerDebts[key].balance -= p.amountNgn;
      }
    });

    return Object.values(customerDebts)
      .filter(c => c.balance > 0.5)
      .sort((a, b) => b.balance - a.balance);
  }, [sales, payments]);

  const topSellingProducts = useMemo(() => {
    const productQuantities: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!productQuantities[item.itemId]) {
          productQuantities[item.itemId] = { name: item.itemName, quantity: 0, revenue: 0 };
        }
        productQuantities[item.itemId].quantity += item.quantity;
        productQuantities[item.itemId].revenue += item.unitPriceNgn * item.quantity;
      }
    }
    return Object.values(productQuantities)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales]);

  const topCustomers = useMemo(() => {
    const customerSpends: Record<string, { name: string; phone: string; totalSpent: number; count: number }> = {};
    for (const sale of sales) {
      const phone = sale.customerPhone?.trim();
      if (!phone) continue;
      const normPhone = normalizePhone(phone);
      if (!customerSpends[normPhone]) {
        customerSpends[normPhone] = { name: sale.customerName || "Customer", phone, totalSpent: 0, count: 0 };
      }
      customerSpends[normPhone].totalSpent += sale.totalNgn;
      customerSpends[normPhone].count += 1;
    }
    return Object.values(customerSpends)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [sales]);

  const handleClearDebt = async () => {
    if (!paymentTarget || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsPaying(true);
    try {
      await recordDebtPayment({
        customerPhone: paymentTarget.phone,
        customerName: paymentTarget.name,
        amountNgn: amount,
        notes: paymentNotes,
      });
      toast.success(`Recorded payment of ${NAIRA}${amount.toLocaleString()} for ${paymentTarget.name}`);
      setPaymentTarget(null);
      setPaymentAmount("");
      setPaymentNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setIsPaying(false);
    }
  };

  const storeName = profile?.storeDetails?.name || "NEXA Store OS";

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* Offline Status Indicator */}
      <OfflineStatusIndicator />

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Store className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">{storeName}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Admin Dashboard" : "Manager Dashboard"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            data-tour="settings"
            onClick={() => navigate("/app/settings")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:border-primary/30 hover:bg-muted/50 transition-all text-sm font-medium shadow-sm group"
          >
            <Settings className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            Store Settings
          </button>
        </div>
      </div>

      {/* ─── Quick Access Shortcuts ─── */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-5"
      >
        <motion.button 
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 }
          }}
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/catalog?newItem=true")}
          className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Add Product</span>
        </motion.button>

        <motion.button 
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 }
          }}
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/restocking?action=new")}
          className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-card border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
            <PackagePlus className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Restocking</span>
        </motion.button>

        <motion.button 
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 }
          }}
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/analytics")}
          className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-card border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Analytics</span>
        </motion.button>

        <motion.button 
          data-tour="sales"
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 }
          }}
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/sales")}
          className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-card border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">New Sale</span>
        </motion.button>

        <motion.button 
          data-tour="settings"
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 }
          }}
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/app/settings")}
          className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-card border border-border hover:border-orange-500/50 hover:bg-orange-500/5 transition-all shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
            <Settings className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Settings</span>
        </motion.button>
      </motion.div>


      {/* ─── Admin Dashboard ─── */}
      {isAdmin && (
        <>
          <AccordionSection id="metrics" title="Business Overview" openSection={openSection} onToggle={toggleSection} dataTour="metrics">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={() => navigate("/app/sales-analytics" )} className="text-left"><MetricCard label="Total Revenue" value={`${NAIRA}${totalRevenue.toLocaleString("en-NG")}`} accentColor="healthy" icon={Banknote} /></button>
              <button type="button" onClick={() => navigate("/app/sales-analytics" )} className="text-left"><MetricCard label="Net Profit" value={`${NAIRA}${netProfit.toLocaleString("en-NG")}`} accentColor={netProfit >= 0 ? "healthy" : "danger"} icon={netProfit >= 0 ? TrendingUp : TrendingDown} /></button>
              <button type="button" onClick={() => navigate("/app/expenses" )} className="text-left"><MetricCard label="Expenses" value={`${NAIRA}${totalExpenses.toLocaleString("en-NG")}`} accentColor="warning" icon={Receipt} /></button>
              <button type="button" data-tour="customers" onClick={() => navigate("/app/customers?tab=debtors" )} className="text-left"><MetricCard label="Outstanding Debt" value={`${NAIRA}${totalOutstandingDebt.toLocaleString("en-NG")}`} accentColor="danger" icon={AlertTriangle} /></button>
            </div>
          </AccordionSection>

          <AccordionSection id="top-performers" title="Top Sellers & Top Customers" openSection={openSection} onToggle={toggleSection}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Top Selling Products */}
              <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Package className="h-4 w-4" /> Top Selling Products
                </h3>
                {topSellingProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No product sales recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {topSellingProducts.map((p, idx) => (
                      <div key={p.name} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono",
                            idx === 0 ? "bg-amber-accent text-white" : "bg-muted text-muted-foreground"
                          )}>
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate max-w-[160px]">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black font-mono text-foreground">{p.quantity} units</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase">{NAIRA}{p.revenue.toLocaleString("en-NG")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Spending Customers */}
              <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-secondary flex items-center gap-2">
                  <Users className="h-4 w-4" /> Top Customers
                </h3>
                {topCustomers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No customer records with spend yet</p>
                ) : (
                  <div className="space-y-3">
                    {topCustomers.map((c, idx) => (
                      <div key={c.phone} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono",
                            idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            #{idx + 1}
                          </span>
                          <div className="text-left">
                            <p className="text-xs font-bold text-foreground leading-none">{c.name}</p>
                            <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{c.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black font-mono text-primary">{NAIRA}{c.totalSpent.toLocaleString("en-NG")}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase">{c.count} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>

          <AccordionSection id="debts" title="Debt Management & Collections" openSection={openSection} onToggle={toggleSection}>
            {debtors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">No outstanding debts</p>
                <p className="text-xs text-muted-foreground">All customers have cleared their balances.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Debtor List</span>
                    <Badge variant="outline" className="text-[10px] border-destructive/20 text-destructive bg-destructive/5 font-black uppercase tracking-widest">
                      {debtors.length} Customers
                    </Badge>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/app/customers?tab=debtors")}
                    className="h-auto p-0 text-xs font-bold text-primary hover:text-primary/80"
                  >
                    View Debts Page →
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
                  {debtors.map((d) => (
                    <div key={d.phone} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground leading-none mb-1">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{d.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-black font-mono text-destructive leading-none mb-1">
                            {NAIRA}{d.balance.toLocaleString("en-NG")}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-center">Balance</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 rounded-lg border-primary/20 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all"
                          onClick={() => {
                            if (d.phone) {
                              setPaymentTarget({ phone: d.phone, name: d.name, balance: d.balance });
                              setPaymentAmount(d.balance.toString());
                            }
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AccordionSection>

          <AccordionSection id="stock" title="Stock Health" openSection={openSection} onToggle={toggleSection}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total SKUs" value={summary.total} accentColor="neutral" icon={Package} />
              <MetricCard label="In stock" value={summary.inStock} accentColor="healthy" icon={CheckCircle2} />
              <MetricCard label="Low stock" value={summary.lowStock} accentColor="warning" icon={AlertTriangle} />
              <MetricCard label="Out of stock" value={summary.outOfStock} accentColor="danger" icon={XCircle} />
            </div>
          </AccordionSection>

          <AccordionSection id="charts" title="Stock Distribution" openSection={openSection} onToggle={toggleSection}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <StockStatusDonut />
              <CategoryDonut />
            </div>
          </AccordionSection>

          <AccordionSection id="attention" title="Staff Activity & Alerts" openSection={openSection} onToggle={toggleSection} dataTour="needs-attention">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="min-h-0"><NeedsAttention /></div>
              <div className="min-h-0"><RecentActivity /></div>
            </div>
          </AccordionSection>

          <AccordionSection id="anomalies" title="Anomaly Detection" openSection={openSection} onToggle={toggleSection}>
            <DashboardAnomalySection movements={movements} items={items} />
          </AccordionSection>

          <AccordionSection id="reorder" title="Reorder Suggestions" openSection={openSection} onToggle={toggleSection}>
            <DashboardReorderSection items={items} movements={movements} suppliers={suppliers} />
          </AccordionSection>
        </>
      )}

      {/* ─── Manager Dashboard ─── */}
      {isManager && (
        <>
          <AccordionSection id="metrics" title="Today's Performance" openSection={openSection} onToggle={toggleSection} dataTour="metrics">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={() => navigate("/app/sales-analytics" )} className="text-left"><MetricCard label="Today's Revenue" value={`${NAIRA}${todayRevenue.toLocaleString("en-NG")}`} accentColor="healthy" icon={Banknote} /></button>
              <button type="button" onClick={() => navigate("/app/sales-history" )} className="text-left"><MetricCard label="Today's Orders" value={todaySales.length} accentColor="neutral" icon={ShoppingCart} /></button>
              <button type="button" onClick={() => navigate("/app/expenses" )} className="text-left"><MetricCard label="Today's Expenses" value={`${NAIRA}${todayExpenses.toLocaleString("en-NG")}`} accentColor="warning" icon={Receipt} /></button>
              <button type="button" onClick={() => navigate("/app/sales-analytics" )} className="text-left"><MetricCard label="Net Today" value={`${NAIRA}${(todayRevenue - todayExpenses).toLocaleString("en-NG")}`} accentColor={todayRevenue - todayExpenses >= 0 ? "healthy" : "danger"} icon={todayRevenue - todayExpenses >= 0 ? TrendingUp : TrendingDown} /></button>
            </div>
          </AccordionSection>

          <AccordionSection id="top-performers" title="Top Sellers & Top Customers" openSection={openSection} onToggle={toggleSection}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Top Selling Products */}
              <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Package className="h-4 w-4" /> Top Selling Products
                </h3>
                {topSellingProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No product sales recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {topSellingProducts.map((p, idx) => (
                      <div key={p.name} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono",
                            idx === 0 ? "bg-amber-accent text-white" : "bg-muted text-muted-foreground"
                          )}>
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate max-w-[160px]">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black font-mono text-foreground">{p.quantity} units</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase">{NAIRA}{p.revenue.toLocaleString("en-NG")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Spending Customers */}
              <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-secondary flex items-center gap-2">
                  <Users className="h-4 w-4" /> Top Customers
                </h3>
                {topCustomers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No customer records with spend yet</p>
                ) : (
                  <div className="space-y-3">
                    {topCustomers.map((c, idx) => (
                      <div key={c.phone} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono",
                            idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            #{idx + 1}
                          </span>
                          <div className="text-left">
                            <p className="text-xs font-bold text-foreground leading-none">{c.name}</p>
                            <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{c.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black font-mono text-primary">{NAIRA}{c.totalSpent.toLocaleString("en-NG")}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase">{c.count} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>

          <AccordionSection id="charts" title="Inventory Overview" openSection={openSection} onToggle={toggleSection}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <StockStatusDonut />
              <CategoryDonut />
            </div>
          </AccordionSection>

          <AccordionSection id="attention" title="Needs Attention" openSection={openSection} onToggle={toggleSection} dataTour="needs-attention">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="min-h-0"><NeedsAttention /></div>
              <div className="min-h-0"><RecentActivity /></div>
            </div>
          </AccordionSection>

          <AccordionSection id="reorder" title="Reorder Suggestions" openSection={openSection} onToggle={toggleSection}>
            <DashboardReorderSection items={items} movements={movements} suppliers={suppliers} />
          </AccordionSection>
        </>
      )}

      {/* ─── Requestor fallback ─── */}
      {!isAdmin && !isManager && (
        <>
          <AccordionSection id="metrics" title="Stock Overview" openSection={openSection} onToggle={toggleSection} dataTour="metrics">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total SKUs" value={summary.total} accentColor="neutral" icon={Package} />
              <MetricCard label="In stock" value={summary.inStock} accentColor="healthy" icon={CheckCircle2} />
              <MetricCard label="Low stock" value={summary.lowStock} accentColor="warning" icon={AlertTriangle} />
              <MetricCard label="Out of stock" value={summary.outOfStock} accentColor="danger" icon={XCircle} />
            </div>
          </AccordionSection>
        </>
      )}

      <OnboardingTour
        steps={TOUR_STEPS}
        currentStep={tour.currentStep}
        isActive={tour.isActive}
        onNext={tour.next}
        onBack={tour.back}
        onSkip={tour.skipTour}
        onComplete={handleTourComplete}
      />

      <Dialog open={!!paymentTarget} onOpenChange={(v) => !v && setPaymentTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear Debt</DialogTitle>
            <DialogDescription>
              Record a payment for {paymentTarget?.name}. This will update their outstanding balance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Amount ({NAIRA})</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-11 rounded-xl border-2 font-bold pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">{NAIRA}</span>
              </div>
              {paymentTarget && (
                <p className="text-[10px] text-muted-foreground ml-1 font-medium">
                  Full balance: {NAIRA}{paymentTarget.balance.toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Notes (Optional)</label>
              <Textarea
                placeholder="Reference number, payment method, etc."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="rounded-xl border-2 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="rounded-xl font-bold">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleClearDebt} 
              disabled={isPaying || !paymentAmount}
              className="rounded-xl font-bold px-8"
            >
              {isPaying ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
