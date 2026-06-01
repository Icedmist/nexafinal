import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Activity, ArrowUpRight, Search, Filter, ShieldCheck, HelpCircle, 
  Terminal, Landmark, AlertTriangle, CreditCard, ChevronRight, RefreshCw, 
  Download, Eye, Play, Sliders, Layers, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useRole } from "@/hooks/useRole";
import { useSales } from "@/hooks/useSalesData";
import { getApp } from "firebase/app";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, orderBy, limit, onSnapshot, doc, getDoc
} from "firebase/firestore";

const NAIRA = "₦";
function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function MoniepointPage() {
  const { claims } = useAuth();
  const { store } = useTenant();
  const { role, isManager } = useRole();
  const isOwner = role === "owner" || role === "system_admin" || role === "admin";

  const { data: sales = [] } = useSales();

  const [loading, setLoading] = useState(true);
  const [accountLinked, setAccountLinked] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const findMatchingSale = (tx: any) => {
    if (!sales || sales.length === 0) return null;
    const txAmount = (tx.amountInKobo || 0) / 100;
    const txTime = new Date(tx.settledAt).getTime();

    return sales.find((sale: any) => {
      const saleAmount = sale.totalNgn;
      const saleTime = new Date(sale.createdAt).getTime();
      
      const isAmountMatch = Math.abs(saleAmount - txAmount) < 0.1;
      const isTimeMatch = Math.abs(saleTime - txTime) <= 10 * 60 * 1000; // 10 minute drift window

      return isAmountMatch && isTimeMatch;
    });
  };
  
  // Scopes & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [terminalFilter, setTerminalFilter] = useState("");
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Sandbox Webhook Simulator states
  const [showSimulator, setShowSimulator] = useState(false);
  const [simAmount, setSimAmount] = useState("12500");
  const [simMethod, setSimMethod] = useState("CARD");
  const [simStatus, setSimStatus] = useState("SUCCESSFUL");
  const [simTerminal, setSimTerminal] = useState("MP-TERM-4091");
  const [simulating, setSimulating] = useState(false);

  // 1. Authorize: Only Owners and Managers are allowed
  const hasAccess = claims?.role === "owner" || claims?.role === "admin" || claims?.role === "system_admin" || claims?.role === "manager";

  // 2. Fetch Moniepoint linking state
  useEffect(() => {
    if (!store?.id || !hasAccess) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, "moniepoint_accounts", store.id);
    const unsubAccount = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.isLinked) {
        setAccountLinked(docSnap.data());
      } else {
        setAccountLinked(null);
      }
    });

    return () => unsubAccount();
  }, [store?.id, hasAccess, db]);

  // 3. Fetch Transaction Stream in real-time using Firestore onSnapshot
  useEffect(() => {
    if (!store?.id || !hasAccess) {
      setLoading(false);
      return;
    }

    const txQuery = query(
      collection(db, "moniepoint_transactions"),
      where("storeTenantId", "==", store.id),
      orderBy("settledAt", "desc"),
      limit(100)
    );

    const unsubTx = onSnapshot(txQuery, (querySnap) => {
      const list: any[] = [];
      querySnap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(list);
      setLoading(false);
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
      setLoading(false);
    });

    return () => unsubTx();
  }, [store?.id, hasAccess, db]);

  // 4. Compute Financial Metrics dynamically from live mirrored transactions
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayTxs = transactions.filter(t => t.settledAt?.startsWith(todayStr));
    const successfulTxs = todayTxs.filter(t => t.status === "SUCCESSFUL");
    const failedCount = todayTxs.filter(t => t.status === "FAILED").length;

    const todayVolumeKobo = successfulTxs.reduce((sum, t) => sum + (t.amountInKobo || 0), 0);
    const todayVolume = todayVolumeKobo / 100;
    
    // Get count of unique terminals
    const terminals = new Set(transactions.map(t => t.terminalId).filter(Boolean));

    const totalCount = todayTxs.length;
    const successRate = totalCount > 0 
      ? Math.round((successfulTxs.length / totalCount) * 100) 
      : 100;

    return {
      todayVolume,
      successfulCount: successfulTxs.length,
      failedCount,
      successRate,
      activeTerminals: terminals.size || 1
    };
  }, [transactions]);

  // 5. Apply Client Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        tx.moniepointRef?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;
      const matchesMethod = methodFilter === "ALL" || tx.paymentMethod === methodFilter;
      const matchesTerminal = !terminalFilter.trim() || tx.terminalId?.toLowerCase().includes(terminalFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesMethod && matchesTerminal;
    });
  }, [transactions, searchTerm, statusFilter, methodFilter, terminalFilter]);

  // 6. Trigger Simulated Webhook POST call to standard ingest function
  const handleSimulateWebhook = async () => {
    if (!store?.id || !accountLinked) {
      toast.error("Account linking is required to simulate mirroring.");
      return;
    }

    setSimulating(true);
    try {
      const app = getApp();
      const projectId = (app.options as any).projectId || "nexa-storeos";
      
      // Target the public cloud function webhook route
      const webhookUrl = `https://us-central1-${projectId}.cloudfunctions.net/moniepointwebhook`;
      const txRef = "SIM-REF-" + Math.floor(100000 + Math.random() * 900000);

      const payload = {
        eventType: simStatus === "SUCCESSFUL" ? "transaction.success" : simStatus === "FAILED" ? "transaction.failed" : "transaction.reversed",
        data: {
          transactionReference: txRef,
          merchantReference: accountLinked.merchantReference,
          amount: simAmount,
          currency: "NGN",
          status: simStatus,
          paymentMethod: simMethod,
          terminalId: simTerminal,
          settledTime: new Date().toISOString()
        }
      };

      console.log("[Simulation] Injecting payload to webhook...", payload);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-nexa-sandbox-bypass": "nexa-sandbox-2026-auth-token"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success("Simulated Moniepoint POS webhook triggered successfully!");
        setShowSimulator(false);
      } else {
        const text = await response.text();
        throw new Error(text || "Failed to inject payload.");
      }
    } catch (err: any) {
      console.error("[Simulation] Webhook direct fetch failed:", err);
      
      // Fail-safe offline fallback: Direct Firestore injection to guarantee test capability locally
      try {
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const txRef = "SIM-LOCAL-" + Math.floor(100000 + Math.random() * 900000);
        
        await setDoc(doc(db, "moniepoint_transactions", txRef), {
          id: txRef,
          storeTenantId: store.id,
          moniepointRef: txRef,
          amountInKobo: Math.round(parseFloat(simAmount) * 100),
          currency: "NGN",
          status: simStatus,
          paymentMethod: simMethod,
          terminalId: simTerminal,
          settledAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });

        toast.success("Mirrored offline sandbox transaction injected locally!");
        setShowSimulator(false);
      } catch (innerErr) {
        toast.error("Simulation failed to inject.");
      }
    } finally {
      setSimulating(false);
    }
  };

  // Block completely for suspended/cashier levels
  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-[800px] py-16 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto animate-bounce mb-4" />
        <h1 className="text-xl font-black uppercase tracking-widest text-destructive">Access Restricted</h1>
        <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest mt-2 max-w-[500px] mx-auto">
          Your current staff credentials block viewing consolidated Moniepoint transactions. Please log in as store Owner or Manager.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 animate-in fade-in duration-300">
        {/* Header Widget Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border bg-card/60 backdrop-blur-md rounded-2xl p-4 space-y-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </Card>
          ))}
        </div>

        {/* Search, Filter Scope Layout Skeleton */}
        <Card className="border-border bg-card rounded-2xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
            <Skeleton className="h-10 w-full sm:w-96 rounded-xl" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24 rounded-xl" />
              <Skeleton className="h-8 w-24 rounded-xl" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
          </div>
        </Card>

        {/* Live Ledger Table Skeleton */}
        <Card className="border-border bg-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/30 bg-muted/10">
                  <th className="p-4"><Skeleton className="h-3 w-16" /></th>
                  <th className="p-4"><Skeleton className="h-3 w-24" /></th>
                  <th className="p-4"><Skeleton className="h-3 w-20" /></th>
                  <th className="p-4"><Skeleton className="h-3 w-16" /></th>
                  <th className="p-4"><Skeleton className="h-3 w-16" /></th>
                  <th className="p-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></th>
                  <th className="p-4 text-center"><Skeleton className="h-3 w-20 mx-auto" /></th>
                  <th className="p-4 text-center"><Skeleton className="h-3 w-12 mx-auto" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-muted/5">
                    <td className="p-4"><Skeleton className="h-4 w-12 rounded" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-28 rounded" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20 rounded" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16 rounded" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20 rounded-full" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-4 w-16 rounded ml-auto" /></td>
                    <td className="p-4 text-center"><Skeleton className="h-4 w-16 rounded-full mx-auto" /></td>
                    <td className="p-4 text-center"><Skeleton className="h-8 w-8 rounded-lg mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header Widget */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" /> Live Mirroring Ledger
          </h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
            Real-time feed showing physical store Moniepoint swipes, settlements, and transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {accountLinked && (
            <Button 
              onClick={() => setShowSimulator(true)}
              className="gap-2 bg-gradient-to-r from-primary to-secondary font-black uppercase tracking-widest text-xs h-10 px-4 rounded-xl shadow-md border-0"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Webhook Sandbox Simulator
            </Button>
          )}
          <Link to="/app/settings">
            <Button variant="outline" className="h-10 font-black uppercase tracking-widest text-xs rounded-xl gap-2">
              <Sliders className="h-4 w-4" /> Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Linked State Guardian */}
      {!accountLinked ? (
        <Card className="border-primary/20 bg-primary/5 rounded-3xl overflow-hidden shadow-xl text-center p-8 py-16">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[120%] bg-primary/5 blur-[80px] pointer-events-none rounded-full" />
          <Landmark className="h-16 w-16 text-primary mx-auto opacity-70 mb-4" />
          <h2 className="text-lg font-black uppercase tracking-widest text-primary">No Moniepoint Account Linked</h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-2 max-w-[500px] mx-auto leading-relaxed">
            Link your physical POS Business account via API Token Provisioning inside the System Settings to unlock real-time transaction mirroring.
          </p>
          <div className="mt-8">
            <Link to="/app/settings">
              <Button className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 gap-2">
                Configure Token Linkage <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Active Statistics widget */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-border bg-card/60 backdrop-blur-md rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Today's POS Volume
              </p>
              <p className="mt-3 text-xl sm:text-2xl font-black font-mono text-foreground">{fmtNgn(metrics.todayVolume)}</p>
            </Card>
            <Card className="border-border bg-card/60 backdrop-blur-md rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Successful Swipes</p>
              <p className="mt-3 text-xl sm:text-2xl font-black font-mono text-emerald-400">{metrics.successfulCount} sales</p>
            </Card>
            <Card className="border-border bg-card/60 backdrop-blur-md rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verification Failures</p>
              <p className="mt-3 text-xl sm:text-2xl font-black font-mono text-red-400">{metrics.failedCount} events</p>
            </Card>
            <Card className="border-border bg-card/60 backdrop-blur-md rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pipeline Success Rate</p>
              <p className="mt-3 text-xl sm:text-2xl font-black font-mono text-primary">{metrics.successRate}%</p>
            </Card>
          </div>

          {/* Search, Filter Scope Layout */}
          <Card className="border-border bg-card rounded-2xl">
            <div className="p-4 border-b border-border/50 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Search by Transaction reference ID..." 
                  className="pl-9 h-10 rounded-xl"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="h-8 border-border rounded-xl text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-muted/20 px-3">
                    Status
                  </Badge>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 rounded-xl border border-border bg-background px-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="ALL">ALL</option>
                    <option value="SUCCESSFUL">SUCCESSFUL</option>
                    <option value="FAILED">FAILED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REVERSED">REVERSED</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="h-8 border-border rounded-xl text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-muted/20 px-3">
                    Method
                  </Badge>
                  <select 
                    value={methodFilter} 
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="h-8 rounded-xl border border-border bg-background px-2.5 text-[10px] font-bold uppercase tracking-wider text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="ALL">ALL</option>
                    <option value="CARD">CARD SWIPE</option>
                    <option value="TRANSFER">BANK TRANSFER</option>
                    <option value="POS_TERMINAL">POS TERMINAL</option>
                  </select>
                </div>

                <Input 
                  value={terminalFilter} 
                  onChange={(e) => setTerminalFilter(e.target.value)} 
                  placeholder="Terminal ID..." 
                  className="h-8 w-28 text-[10px] font-mono font-bold rounded-xl bg-background"
                />
              </div>
            </div>

            {/* Live Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/10">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Settle Date</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reference Ref</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Terminal</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Method</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Auto-Reconcile</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-medium">
                  {filteredTransactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-muted/10 transition-colors duration-150 animate-fade-in"
                    >
                      <td className="p-4 text-xs font-bold text-muted-foreground font-mono">
                        {new Date(tx.settledAt).toLocaleTimeString()}
                      </td>
                      <td className="p-4 text-xs font-mono font-bold text-foreground">
                        {tx.moniepointRef}
                      </td>
                      <td className="p-4 text-xs font-mono font-bold text-muted-foreground">
                        {tx.terminalId || "MP-SYSTEM"}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground font-semibold">
                          <CreditCard className="h-3 w-3 text-primary" />
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                          tx.status === "SUCCESSFUL" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : tx.status === "FAILED"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : tx.status === "REVERSED"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            tx.status === "SUCCESSFUL" ? "bg-emerald-500 animate-pulse" : tx.status === "FAILED" ? "bg-red-500" : "bg-orange-500"
                          }`} />
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-black font-mono text-right text-foreground">
                        {fmtNgn((tx.amountInKobo || 0) / 100)}
                      </td>
                      <td className="p-4 text-center">
                        {(() => {
                          const isMatched = !!findMatchingSale(tx);
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                              isMatched 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {isMatched ? "🟢 Matched" : "🟡 Unreconciled"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-center">
                        <Button 
                          onClick={() => setSelectedTx(tx)}
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-primary/10 rounded-lg text-primary"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-xs font-bold text-muted-foreground uppercase tracking-widest italic border-t border-dashed">
                        No mirrored physical POS payments matched your filter bounds.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Sandbox Webhook Ingestion Simulator Popup */}
      <Dialog open={showSimulator} onOpenChange={setShowSimulator}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-[#0b0f19] border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Terminal className="h-5 w-5" /> B2B Webhook Ingest Sandbox
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Synthesize incoming POS card swipes to validate database synchronization & UI updates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-foreground">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider">Amount (Decimal NGN)</Label>
                <Input 
                  type="number" 
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="font-mono text-sm h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider">Terminal Scoping ID</Label>
                <Input 
                  value={simTerminal}
                  onChange={(e) => setSimTerminal(e.target.value)}
                  className="font-mono text-sm h-9 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider">Payment Method</Label>
                <select 
                  value={simMethod} 
                  onChange={(e) => setSimMethod(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-wider focus:outline-none"
                >
                  <option value="CARD">CARD SWIPE</option>
                  <option value="TRANSFER">BANK TRANSFER</option>
                  <option value="POS_TERMINAL">POS TERMINAL</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider">Transaction Status</Label>
                <select 
                  value={simStatus} 
                  onChange={(e) => setSimStatus(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-wider focus:outline-none"
                >
                  <option value="SUCCESSFUL">SUCCESSFUL</option>
                  <option value="FAILED">FAILED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REVERSED">REVERSED</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl bg-black p-4 text-[10px] font-mono text-primary flex gap-2">
              <Terminal className="h-4 w-4 shrink-0" />
              <div>
                [SANDBOX]: Enters the public endpoint `onRequest` handler bypassing secret validations.
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border/20 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowSimulator(false)}
              className="rounded-xl font-black uppercase tracking-widest text-xs h-10 px-5"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSimulateWebhook}
              disabled={simulating}
              className="rounded-xl font-black uppercase tracking-widest text-xs h-10 px-5 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${simulating ? "animate-spin" : ""}`} />
              Inject Simulated Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Receipt / Raw Audit Overlay */}
      {selectedTx && (
        <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl bg-[#090d16] border-border shadow-2xl">
            <DialogHeader className="border-b border-border/30 pb-4">
              <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Landmark className="h-5 w-5" /> Moniepoint Settlement Receipt
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Mirroring Transaction Audit Record
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs font-bold text-foreground">
              {/* Receipt Structure */}
              <div className="rounded-3xl border border-dashed border-border p-5 space-y-4 bg-background/50">
                <div className="text-center border-b border-border/30 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{store?.name || "NEXA Store"}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">Terminal: {selectedTx.terminalId || "MP-POS-SYSTEM"}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Reference ID</span>
                    <span className="font-mono text-foreground select-all">{selectedTx.moniepointRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payment Route</span>
                    <span className="uppercase text-primary">{selectedTx.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pipeline Status</span>
                    <span className={selectedTx.status === "SUCCESSFUL" ? "text-emerald-400" : "text-red-400"}>{selectedTx.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Settled Time</span>
                    <span className="text-muted-foreground font-mono">{new Date(selectedTx.settledAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-border pt-4 flex justify-between items-baseline">
                  <span className="text-xs font-black uppercase tracking-widest text-foreground">Symmetric Total</span>
                  <span className="text-xl font-black font-mono text-foreground">{fmtNgn((selectedTx.amountInKobo || 0) / 100)}</span>
                </div>
              </div>

              {/* Reconciliation Status Card */}
              {(() => {
                const match = findMatchingSale(selectedTx);
                if (match) {
                  const timeDriftMs = new Date(match.createdAt).getTime() - new Date(selectedTx.settledAt).getTime();
                  const timeDriftSecs = Math.abs(Math.round(timeDriftMs / 1000));
                  const driftText = timeDriftSecs < 60 
                    ? `${timeDriftSecs}s drift` 
                    : `${Math.round(timeDriftSecs / 60)}m drift`;

                  return (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2.5 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Reconciliation Matched
                        </span>
                        <Badge variant="outline" className="h-5 text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase font-black tracking-widest">
                          100% Synced
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold leading-normal">
                        Matched automatically to store sale order <span className="font-mono text-white">#{match.id.slice(-8).toUpperCase()}</span>.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-emerald-500/10 pt-2 text-muted-foreground font-bold">
                        <div>
                          CUSTOMER: <span className="text-foreground">{match.customerName || "Walk-in"}</span>
                        </div>
                        <div>
                          TIME DRIFT: <span className="text-foreground font-mono">{driftText}</span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                          ⚠️ Unreconciled Sale
                        </span>
                        <Badge variant="outline" className="h-5 text-[8px] bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase font-black tracking-widest">
                          Manual Audit
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold leading-relaxed">
                        No store sales matched this transaction's amount (₦{((selectedTx.amountInKobo || 0)/100).toLocaleString()}) and timestamp within 10 minutes.
                      </p>
                    </div>
                  );
                }
              })()}

              {/* Raw JSON Payload (Strictly OWNER access check) */}
              {isOwner && selectedTx.rawPayload && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                    <Terminal className="h-3.5 w-3.5" /> Raw Ingest Webhook Payload (Owners Only)
                  </h4>
                  <pre className="bg-[#030712] border border-border/30 rounded-2xl p-4 text-[9px] font-mono text-emerald-400 overflow-x-auto max-h-40 break-all whitespace-pre-wrap select-all">
                    {JSON.stringify(selectedTx.rawPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-border/30">
              <Button 
                onClick={() => setSelectedTx(null)}
                className="w-full rounded-xl font-black uppercase tracking-widest text-xs h-10"
              >
                Close Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
