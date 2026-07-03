import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, User, Phone, ShoppingBag, MessageCircle, Send,
  TrendingUp, AlertTriangle, Clock, Filter, CheckSquare, X,
} from "lucide-react";
import { useSales, useDebtPayments, useSalesMutations } from "@/hooks/useSalesData";
import { useTenant } from "@/hooks/useTenant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { CreditCard, DollarSign } from "lucide-react";
import { normalizePhone } from "@/lib/utils";
import { DebtClearingHistory } from "@/components/sales/DebtClearingHistory";
import { ListSkeleton } from "@/components/shared/skeletons";

const NAIRA = "₦";

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default CustomersPage;

interface CustomerRecord {
  name: string;
  phone: string;
  email?: string;
  totalSpent: number;
  transactionCount: number;
  lastPurchase: string;
  debtBalance: number;
}

type CustomerTab = "all" | "frequent" | "high-spenders" | "debtors" | "inactive" | "cleared-debts";

const MESSAGE_TEMPLATES = [
  { id: "receipt", label: "Receipt / Thank You", text: "Hi {name}, thank you for shopping with us! Your total was {amount}. We appreciate your business. 🙏" },
  { id: "followup", label: "Follow-Up", text: "Hi {name}, hope you're enjoying your recent purchase! We have new arrivals you might like. Visit us today! 🛍️" },
  { id: "debt", label: "Debt Reminder", text: "Hi {name}, this is a friendly reminder that you have an outstanding balance of {debt}. Kindly settle at your earliest convenience. Thank you! 🙏" },
  { id: "promo", label: "Promotion", text: "Hi {name}, we have a special offer just for you! Use code WELCOME10 for 10% off your next purchase. Don't miss out! 🎉" },
];

function CustomersPage() {
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: payments, isLoading: paymentsLoading } = useDebtPayments();
  const { recordDebtPayment } = useSalesMutations();
  
  const [search, setSearch] = useState("");
  const { store } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as CustomerTab;
  const tab = (tabParam && ["all", "frequent", "high-spenders", "debtors", "inactive", "cleared-debts"].includes(tabParam)) ? tabParam : "all";

  const setTab = (newTab: CustomerTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab === "all") {
        next.delete("tab");
      } else {
        next.set("tab", newTab);
      }
      return next;
    });
  };
  
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageTarget, setMessageTarget] = useState<CustomerRecord | null>(null);
  
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customers = useMemo(() => {
    const map = new Map<string, CustomerRecord>();
    
    // Process Sales
    for (const sale of sales) {
      const phone = sale.customerPhone?.trim();
      const name = sale.customerName?.trim();
      
      if (!phone && !name) continue;
      
      const key = phone ? normalizePhone(phone) : `name:${name?.toLowerCase()}`;
      const existing = map.get(key);
      
      if (existing) {
        existing.totalSpent += sale.totalNgn;
        existing.transactionCount++;
        if (sale.isCreditSale) {
          existing.debtBalance += sale.totalNgn;
        }
        if (sale.createdAt > existing.lastPurchase) {
          existing.lastPurchase = sale.createdAt;
          if (name) existing.name = name;
          if (phone) existing.phone = phone; // keep the latest formatting
        }
      } else {
        map.set(key, {
          name: name || "Customer",
          phone: phone || "",
          totalSpent: sale.totalNgn,
          transactionCount: 1,
          lastPurchase: sale.createdAt,
          debtBalance: sale.isCreditSale ? sale.totalNgn : 0,
          email: sale.customerEmail || undefined,
        });
      }
    }

    // Subtract Payments
    for (const payment of payments) {
      const phone = payment.customerPhone?.trim();
      const name = payment.customerName?.trim();
      
      if (!phone && !name) continue;
      
      const key = phone ? normalizePhone(phone) : `name:${name?.toLowerCase()}`;
      const record = map.get(key);
      
      if (record) {
        record.debtBalance -= payment.amountNgn;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sales, payments]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const filtered = useMemo(() => {
    let list = customers;
    if (tab === "frequent") list = list.filter((c) => c.transactionCount >= 3);
    if (tab === "high-spenders") list = list.filter((c) => c.totalSpent >= 50_000);
    if (tab === "debtors") list = list.filter((c) => c.debtBalance > 0);
    if (tab === "inactive") list = list.filter((c) => c.lastPurchase < thirtyDaysAgo);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return list;
  }, [customers, tab, search, thirtyDaysAgo]);

  const stats = useMemo(() => ({
    total: customers.length,
    frequent: customers.filter((c) => c.transactionCount >= 3).length,
    debtors: customers.filter((c) => c.debtBalance > 0).length,
    totalDebt: customers.reduce((s, c) => s + c.debtBalance, 0),
  }), [customers]);

  const toggleSelect = (phoneOrName: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(phoneOrName)) next.delete(phoneOrName);
      else next.add(phoneOrName);
      return next;
    });
  };

  const openWhatsApp = (phone: string, text: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const intlPhone = cleaned.startsWith("0") ? `234${cleaned.slice(1)}` : cleaned;
    const encoded = encodeURIComponent(text);
    const appUrl = `whatsapp://send?phone=${intlPhone}&text=${encoded}`;
    const webUrl = `https://wa.me/${intlPhone}?text=${encoded}`;

    // Try app deep link first (mobile). If it fails (e.g., WhatsApp not installed), fallback to web URL.
    try {
      // On mobile browsers, setting location will attempt to open the app.
      window.location.href = appUrl;
      // Fallback: open web link after a short delay
      setTimeout(() => {
        window.open(webUrl, "_blank");
      }, 700);
    } catch (e) {
      window.open(webUrl, "_blank");
    }
  };

  const handleSendMessage = (customer: CustomerRecord) => {
    setMessageTarget(customer);
    const tpl = MESSAGE_TEMPLATES[0];
    setMessageText(tpl.text.replace("{name}", customer.name).replace("{amount}", `${NAIRA}${customer.totalSpent.toLocaleString("en-NG")}`).replace("{debt}", `${NAIRA}${customer.debtBalance.toLocaleString("en-NG")}`));
    setMessageOpen(true);
  };

  const handleBulkMessage = () => {
    if (selectedCustomers.size === 0) { toast.error("Select customers first"); return; }
    setMessageTarget(null);
    setMessageText(MESSAGE_TEMPLATES[1].text);
    setMessageOpen(true);
  };

  const handleSendWhatsApp = () => {
    if (messageTarget) {
      if (!messageTarget.phone) {
        toast.error(`No phone number recorded for ${messageTarget.name}`);
        return;
      }
      openWhatsApp(messageTarget.phone, messageText);
    } else {
      const targets = customers.filter((c) => selectedCustomers.has(c.phone || c.name));
      let sentCount = 0;
      for (const c of targets) {
        if (!c.phone) continue;
        const text = messageText.replace("{name}", c.name).replace("{amount}", `${NAIRA}${c.totalSpent.toLocaleString("en-NG")}`).replace("{debt}", `${NAIRA}${c.debtBalance.toLocaleString("en-NG")}`);
        openWhatsApp(c.phone, text);
        sentCount++;
      }
      if (sentCount === 0) {
        toast.error("No selected customers have a phone number");
        return;
      }
    }
    setMessageOpen(false);
    toast.success("WhatsApp opened — send manually");
  };

  const handleSendEmail = async () => {
    if (!messageTarget || !messageTarget.email) {
      toast.error("Customer email is missing");
      return;
    }

    try {
      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("@/lib/firebase");
      const sendEmail = httpsCallable(functions, 'sendcustomemail');
      
      const result = await sendEmail({
        to: messageTarget.email,
        subject: `Message from ${store?.name || "the Store"}`,
        text: messageText,
        fromName: store?.name || "Nexa Store"
      });

      if ((result.data as any).success) {
        toast.success("Email sent successfully via Zoho!");
      }
    } catch (err) {
      console.error("Email send error:", err);
      toast.error("Failed to send email. Check Zoho configuration.");
    }
    setMessageOpen(false);
  };

  const handleClearDebt = (customer: CustomerRecord) => {
    setMessageTarget(customer);
    setPaymentAmount("");
    setPaymentNote("");
    setPaymentOpen(true);
  };

  const submitPayment = async () => {
    if (!messageTarget) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordDebtPayment({
        customerPhone: messageTarget.phone,
        customerName: messageTarget.name,
        amountNgn: amount,
        notes: paymentNote,
      });
      toast.success(`Payment of ${NAIRA}${amount.toLocaleString()} recorded for ${messageTarget.name}`);
      setPaymentOpen(false);
      setMessageTarget(null);
      setPaymentAmount("");
      setPaymentNote("");
    } catch (err) {
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (salesLoading || paymentsLoading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 p-4">
        <ListSkeleton items={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your customer directory and send messages</p>
        </div>
        {selectedCustomers.size > 0 && (
          <Button onClick={handleBulkMessage} className="gap-2">
            <Send className="h-4 w-4" />
            Message {selectedCustomers.size} selected
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Customers</p>
          <p className="text-xl font-bold font-mono">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Frequent Buyers</p>
          <p className="text-xl font-bold font-mono text-primary">{stats.frequent}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Debtors</p>
          <p className="text-xl font-bold font-mono text-destructive">{stats.debtors}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Debt</p>
          <p className="text-xl font-bold font-mono text-destructive">{NAIRA}{stats.totalDebt.toLocaleString("en-NG")}</p>
        </Card>
      </div>

      {/* Tabs and search */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as CustomerTab)}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 sm:w-auto">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="frequent" className="text-xs">Frequent</TabsTrigger>
            <TabsTrigger value="high-spenders" className="text-xs">Top</TabsTrigger>
            <TabsTrigger value="debtors" className="text-xs">Debtors</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">Inactive</TabsTrigger>
            <TabsTrigger value="cleared-debts" className="text-xs">Cleared Debts</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…" className="pl-9" />
          </div>
        </div>

        <TabsContent value={tab} className="mt-3">
          {tab === "cleared-debts" ? (
            <DebtClearingHistory payments={payments} sales={sales} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={User} title="No customers found" description="Complete sales with customer phone numbers to build your directory." />
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <div
                  key={c.phone || c.name}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                >
                  <button type="button" onClick={() => toggleSelect(c.phone || c.name)} className="shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${selectedCustomers.has(c.phone || c.name) ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                      {selectedCustomers.has(c.phone || c.name) ? <CheckSquare className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {c.phone ? (
                        <p className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{c.phone}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground opacity-70">
                          <User className="h-3 w-3" /> No phone number
                        </p>
                      )}
                      {c.email && (
                        <Badge variant="outline" className="text-[10px] h-4 py-0 font-normal opacity-70">
                          {c.email}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ShoppingBag className="h-3 w-3" />{c.transactionCount} sales
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />{daysSince(c.lastPurchase)}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold font-mono">{NAIRA}{c.totalSpent.toLocaleString("en-NG")}</p>
                    {c.debtBalance > 0 && (
                      <p className="text-xs text-destructive font-mono">Owes {NAIRA}{c.debtBalance.toLocaleString("en-NG")}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {c.debtBalance > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleClearDebt(c)}
                        className="h-9 px-3 gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden xs:inline text-[10px] font-medium uppercase tracking-wider">Clear</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleSendMessage(c)} className="h-9 w-9 text-primary">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* WhatsApp Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Send WhatsApp Message
            </DialogTitle>
            <DialogDescription>
              {messageTarget ? `To: ${messageTarget.name} (${messageTarget.phone})` : `To: ${selectedCustomers.size} customers`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.id}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    let text = tpl.text;
                    if (messageTarget) {
                      text = text.replace("{name}", messageTarget.name)
                        .replace("{amount}", `${NAIRA}${messageTarget.totalSpent.toLocaleString("en-NG")}`)
                        .replace("{debt}", `${NAIRA}${messageTarget.debtBalance.toLocaleString("en-NG")}`);
                    }
                    setMessageText(text);
                  }}
                >
                  {tpl.label}
                </Button>
              ))}
            </div>

            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
              placeholder="Type your message…"
            />

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <div className="flex gap-2">
                  <Button onClick={handleSendWhatsApp} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                    <Send className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  {messageTarget?.email && (
                    <Button onClick={handleSendEmail} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700">
                      <MessageCircle className="h-4 w-4" />
                      Email (Zoho)
                    </Button>
                  )}
                </div>
              </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Clear Debt Dialog */}
      <Dialog open={paymentOpen} onOpenChange={(open) => {
        setPaymentOpen(open);
        if (!open) {
          setMessageTarget(null);
          setPaymentAmount("");
          setPaymentNote("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Clear Customer Debt
            </DialogTitle>
            <DialogDescription>
              Record a payment for {messageTarget?.name}. Current balance: <span className="font-mono text-destructive font-bold">{NAIRA}{messageTarget?.debtBalance.toLocaleString()}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Payment Amount ({NAIRA})</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="font-mono text-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Note (Optional)</label>
              <Textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Reference info, partial payment details, etc."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={submitPayment} 
              disabled={isSubmitting || !paymentAmount}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              {isSubmitting ? "Confirming..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
