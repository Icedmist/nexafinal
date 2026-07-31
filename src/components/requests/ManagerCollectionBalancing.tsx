import { useState, useMemo } from "react";
import { 
  PackageCheck, 
  Plus, 
  Calculator, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  Calendar, 
  UserCheck, 
  Receipt,
  RotateCcw,
  ShieldAlert,
  Search,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useManagerCollections } from "@/hooks/useManagerCollections";
import { useItems } from "@/hooks/useInventoryData";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useStaff } from "@/hooks/useStaffData";
import type { ManagerCollection, ManagerCollectionItem } from "@/types/inventory";
import { toast } from "sonner";

export function ManagerCollectionBalancing() {
  const { collections, loading, createCollection, balanceUpCollection, settleDebt } = useManagerCollections();
  const { data: catalogItems } = useItems();
  const { data: staffMembers } = useStaff();
  const { storeId: currentStoreId, profile } = useBusiness();
  const { user } = useAuth();
  const { format } = useCurrency();
  const formatCurrency = format;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [stagedItems, setStagedItems] = useState<{ itemId: string; quantityCollected: number }[]>([]);

  // Balance Up Modal State
  const [balanceTarget, setBalanceTarget] = useState<ManagerCollection | null>(null);
  const [itemBalancingInputs, setItemBalancingInputs] = useState<
    Record<string, { quantitySold: number; quantityReturned: number }>
  >({});
  const [cashRemittedInput, setCashRemittedInput] = useState<string>("");
  const [balancingNote, setBalancingNote] = useState("");

  // Settle Debt Modal State
  const [debtTarget, setDebtTarget] = useState<ManagerCollection | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  // Filtered collections
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      const matchSearch =
        c.managerName.toLowerCase().includes(search.toLowerCase()) ||
        c.collectionNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.items.some((i) => i.itemName.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;
      if (statusFilter === "has_debt") return c.status === "has_debt" || c.remainingDebtValueNgn > 0;
      if (statusFilter === "fully_balanced") return c.status === "fully_balanced" || c.status === "debt_cleared";
      if (statusFilter === "collected") return c.status === "collected";
      return true;
    });
  }, [collections, search, statusFilter]);

  // Overall metrics
  const totalCollectedValue = useMemo(
    () => collections.reduce((acc, c) => acc + c.totalValueNgn, 0),
    [collections]
  );
  const totalCashRemitted = useMemo(
    () => collections.reduce((acc, c) => acc + c.cashRemittedNgn, 0),
    [collections]
  );
  const totalReturnedStock = useMemo(
    () => collections.reduce((acc, c) => acc + c.returnedStockValueNgn, 0),
    [collections]
  );
  const totalOutstandingDebts = useMemo(
    () => collections.reduce((acc, c) => acc + c.remainingDebtValueNgn, 0),
    [collections]
  );

  // Available store members / managers
  const availableManagers = useMemo(() => {
    if (staffMembers && staffMembers.length > 0) {
      return staffMembers.map((m) => ({
        id: m.uid,
        name: m.displayName || m.email,
        role: m.role,
      }));
    }
    return [
      { id: "u2", name: "Sarah Manager", role: "manager" as const },
      { id: "u5", name: "Alice Clerk", role: "manager" as const },
      { id: "u3", name: "Dave Staff", role: "manager" as const },
    ];
  }, [staffMembers]);

  const handleOpenCreateModal = () => {
    setStagedItems([]);
    setSelectedManagerId(availableManagers[0]?.id || "u2");
    setSelectedManagerName(availableManagers[0]?.name || "Sarah Manager");
    setCollectionNotes("");
    setCreateOpen(true);
  };

  const handleAddStagedItem = (itemId: string) => {
    if (!itemId) return;
    if (stagedItems.some((i) => i.itemId === itemId)) {
      toast.info("Item already selected");
      return;
    }
    setStagedItems((prev) => [...prev, { itemId, quantityCollected: 1 }]);
  };

  const handleUpdateStagedQty = (itemId: string, qty: number) => {
    setStagedItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, quantityCollected: Math.max(1, qty) } : i))
    );
  };

  const handleRemoveStagedItem = (itemId: string) => {
    setStagedItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleConfirmCreateCollection = async () => {
    if (stagedItems.length === 0) {
      toast.error("Please select at least one product collected by the manager.");
      return;
    }

    const itemsPayload: ManagerCollectionItem[] = stagedItems.map((st) => {
      const catItem = catalogItems.find((ci) => ci.id === st.itemId);
      const unitPrice = catItem?.sellingPrice || catItem?.costPrice || 1000;
      return {
        itemId: st.itemId,
        itemName: catItem?.name || "Inventory Product",
        sku: catItem?.sku || "SKU-PROD",
        quantityCollected: st.quantityCollected,
        unitPriceNgn: unitPrice,
        quantitySold: 0,
        quantityReturned: 0,
        remainingDebtQty: st.quantityCollected,
        remainingDebtValueNgn: st.quantityCollected * unitPrice,
      };
    });

    const currentStoreName = profile?.storeDetails?.name;

    await createCollection({
      managerId: selectedManagerId,
      managerName: selectedManagerName,
      storeId: currentStoreId || "store-1",
      storeName: currentStoreName || "Main Store",
      items: itemsPayload,
      collectionDate: new Date().toISOString(),
      notes: collectionNotes.trim() || undefined,
    });

    setCreateOpen(false);
  };

  // Open Balance Up Modal
  const handleOpenBalanceModal = (col: ManagerCollection) => {
    setBalanceTarget(col);
    const initialInputs: Record<string, { quantitySold: number; quantityReturned: number }> = {};
    let calculatedSoldCash = 0;

    col.items.forEach((item) => {
      const sold = item.quantitySold || item.quantityCollected;
      const returned = item.quantityReturned || 0;
      initialInputs[item.itemId] = { quantitySold: sold, quantityReturned: returned };
      calculatedSoldCash += sold * item.unitPriceNgn;
    });

    setItemBalancingInputs(initialInputs);
    setCashRemittedInput(calculatedSoldCash.toString());
    setBalancingNote("");
  };

  // Calculate projected balance live
  const projectedBalance = useMemo(() => {
    if (!balanceTarget) return null;

    let totalReturned = 0;
    let totalSoldValue = 0;

    balanceTarget.items.forEach((item) => {
      const input = itemBalancingInputs[item.itemId] || { quantitySold: 0, quantityReturned: 0 };
      totalSoldValue += (input.quantitySold || 0) * item.unitPriceNgn;
      totalReturned += (input.quantityReturned || 0) * item.unitPriceNgn;
    });

    const numCashRemitted = parseFloat(cashRemittedInput) || 0;
    const remainingDebt = Math.max(0, balanceTarget.totalValueNgn - numCashRemitted - totalReturned);

    return {
      totalValue: balanceTarget.totalValueNgn,
      totalSoldValue,
      totalReturned,
      cashRemitted: numCashRemitted,
      remainingDebt,
    };
  }, [balanceTarget, itemBalancingInputs, cashRemittedInput]);

  const handleConfirmBalanceUp = async () => {
    if (!balanceTarget) return;

    const itemsBalancing = balanceTarget.items.map((item) => ({
      itemId: item.itemId,
      quantitySold: itemBalancingInputs[item.itemId]?.quantitySold || 0,
      quantityReturned: itemBalancingInputs[item.itemId]?.quantityReturned || 0,
    }));

    const cashRemittedNgn = parseFloat(cashRemittedInput) || 0;

    await balanceUpCollection(balanceTarget.id, {
      itemsBalancing,
      cashRemittedNgn,
      balancedBy: profile?.storeDetails?.name || user?.email || "Store Admin",
      notes: balancingNote.trim() || undefined,
    });

    setBalanceTarget(null);
  };

  // Open Settle Debt Modal
  const handleOpenDebtModal = (col: ManagerCollection) => {
    setDebtTarget(col);
    setPaymentAmountInput(col.remainingDebtValueNgn.toString());
    setPaymentNote("");
  };

  const handleConfirmSettleDebt = async () => {
    if (!debtTarget) return;
    const amt = parseFloat(paymentAmountInput);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    await settleDebt(
      debtTarget.id,
      amt,
      paymentNote.trim() || "Manager debt repayment",
      profile?.storeDetails?.name || "Store Admin"
    );

    setDebtTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Context Note */}
      <div className="bg-gradient-to-r from-purple-900/10 via-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-lg text-foreground">Manager Product Collection & Debt Balancing</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When store managers collect products from inventory, track sales remittances, returned unsold stock, and automatically record any un-balanced remaining items as <strong>Manager Debt</strong>.
            </p>
          </div>
          <Button onClick={handleOpenCreateModal} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-1.5 shadow-md self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            <span>Log Product Collection</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Collections Value
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">
              {formatCurrency(totalCollectedValue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Products issued to managers</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Cash Remitted
            </CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalCashRemitted)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Total sales revenue balanced</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Returned Stock Value
            </CardDescription>
            <CardTitle className="text-xl font-bold text-sky-600 dark:text-sky-400">
              {formatCurrency(totalReturnedStock)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Restored back to inventory</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Outstanding Manager Debts
            </CardDescription>
            <CardTitle className="text-xl font-extrabold text-amber-700 dark:text-amber-300">
              {formatCurrency(totalOutstandingDebts)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Unbalanced remaining stock value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search manager, collection #, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="text-xs h-8"
          >
            All Collections
          </Button>
          <Button
            variant={statusFilter === "has_debt" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("has_debt")}
            className="text-xs h-8 border-amber-500/40 text-amber-700 dark:text-amber-300"
          >
            Manager Debts
          </Button>
          <Button
            variant={statusFilter === "collected" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("collected")}
            className="text-xs h-8"
          >
            Pending Balancing
          </Button>
          <Button
            variant={statusFilter === "fully_balanced" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("fully_balanced")}
            className="text-xs h-8"
          >
            Fully Balanced
          </Button>
        </div>
      </div>

      {/* Collections Ledger */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Loading collection records...</div>
      ) : filteredCollections.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <PackageCheck className="h-10 w-10 text-muted-foreground mx-auto stroke-1" />
          <h4 className="font-semibold text-sm text-foreground">No manager collections found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Log products issued to managers when they collect inventory for sales or distribution to track sales remittances and remaining debts.
          </p>
          <Button onClick={handleOpenCreateModal} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs mt-2">
            Log First Collection
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCollections.map((col) => {
            const hasDebt = col.remainingDebtValueNgn > 0;
            return (
              <Card key={col.id} className={`border transition-all ${hasDebt ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/10" : "border-border bg-card"}`}>
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-muted text-foreground">
                          {col.collectionNumber}
                        </span>
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <UserCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          {col.managerName}
                        </h4>
                        {col.storeName && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Building2 className="h-3 w-3" />
                            {col.storeName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Collected: {new Date(col.collectionDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {col.balancedAt && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            • Balanced by {col.balancedBy} on {new Date(col.balancedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {col.status === "has_debt" || hasDebt ? (
                        <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 text-xs gap-1 font-bold">
                          <AlertTriangle className="h-3 w-3" />
                          Debt: {formatCurrency(col.remainingDebtValueNgn)}
                        </Badge>
                      ) : col.status === "debt_cleared" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-xs gap-1 font-bold">
                          <CheckCircle2 className="h-3 w-3" />
                          Debt Cleared
                        </Badge>
                      ) : col.status === "fully_balanced" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 text-xs gap-1 font-bold">
                          <CheckCircle2 className="h-3 w-3" />
                          Fully Balanced
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Pending Balancing
                        </Badge>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenBalanceModal(col)}
                          className="h-8 text-xs gap-1 border-purple-500/30 hover:border-purple-500 text-purple-700 dark:text-purple-300 font-semibold"
                        >
                          <Calculator className="h-3.5 w-3.5" />
                          <span>Balance Up</span>
                        </Button>

                        {hasDebt && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenDebtModal(col)}
                            className="h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            <span>Settle Debt</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-3 space-y-3">
                  {/* Items List */}
                  <div className="overflow-x-auto rounded-lg border border-border/50 bg-background/50">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-2">Product Name</th>
                          <th className="p-2 text-center">Collected Qty</th>
                          <th className="p-2 text-right">Unit Price</th>
                          <th className="p-2 text-center">Qty Sold</th>
                          <th className="p-2 text-center">Qty Returned</th>
                          <th className="p-2 text-center">Debt Qty</th>
                          <th className="p-2 text-right">Debt Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {col.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="p-2 font-medium">
                              <div>{it.itemName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{it.sku}</div>
                            </td>
                            <td className="p-2 text-center font-bold">{it.quantityCollected}</td>
                            <td className="p-2 text-right">{formatCurrency(it.unitPriceNgn)}</td>
                            <td className="p-2 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
                              {it.quantitySold || 0}
                            </td>
                            <td className="p-2 text-center text-sky-600 dark:text-sky-400 font-semibold">
                              {it.quantityReturned || 0}
                            </td>
                            <td className="p-2 text-center font-bold text-amber-600 dark:text-amber-400">
                              {it.remainingDebtQty || 0}
                            </td>
                            <td className="p-2 text-right font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(it.remainingDebtValueNgn || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/40">
                    <div className="flex items-center gap-4">
                      <span>Total Value: <strong>{formatCurrency(col.totalValueNgn)}</strong></span>
                      <span>Cash Paid: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(col.cashRemittedNgn)}</strong></span>
                      <span>Returned Stock: <strong className="text-sky-600 dark:text-sky-400">{formatCurrency(col.returnedStockValueNgn)}</strong></span>
                    </div>

                    <div className="font-bold flex items-center gap-1.5">
                      <span>Remaining Debt:</span>
                      <span className={col.remainingDebtValueNgn > 0 ? "text-amber-600 dark:text-amber-400 text-sm font-extrabold" : "text-emerald-600 dark:text-emerald-400 text-sm font-bold"}>
                        {formatCurrency(col.remainingDebtValueNgn)}
                      </span>
                    </div>
                  </div>

                  {col.notes && (
                    <p className="text-[11px] text-muted-foreground italic">
                      Note: {col.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Log Product Collection Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-purple-600" />
              Log Manager Product Collection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record inventory issued or collected by a manager for branch sales or distribution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold">Select Manager / Staff Member</Label>
              <select
                value={selectedManagerId}
                onChange={(e) => {
                  setSelectedManagerId(e.target.value);
                  const m = availableManagers.find((x) => x.id === e.target.value);
                  if (m) setSelectedManagerName(m.name);
                }}
                className="w-full mt-1 text-xs p-2 rounded-md border border-input bg-background"
              >
                {availableManagers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold">Add Products Collected</Label>
              <select
                onChange={(e) => {
                  handleAddStagedItem(e.target.value);
                  e.target.value = "";
                }}
                className="w-full mt-1 text-xs p-2 rounded-md border border-input bg-background"
              >
                <option value="">-- Choose catalog item to collect --</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — Stock: {item.currentStock} | Price: {formatCurrency(item.sellingPrice || item.costPrice || 0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Items List */}
            {stagedItems.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                  Collected Items List
                </Label>
                {stagedItems.map((st) => {
                  const catItem = catalogItems.find((ci) => ci.id === st.itemId);
                  const unitPrice = catItem?.sellingPrice || catItem?.costPrice || 0;
                  return (
                    <div key={st.itemId} className="flex items-center justify-between gap-2 p-2 bg-card rounded border text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{catItem?.name}</div>
                        <div className="text-[10px] text-muted-foreground">{formatCurrency(unitPrice)} / unit</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={st.quantityCollected}
                          onChange={(e) => handleUpdateStagedQty(st.itemId, parseInt(e.target.value) || 1)}
                          className="w-20 h-7 text-xs text-center"
                        />
                        <span className="font-bold w-24 text-right">
                          {formatCurrency(st.quantityCollected * unitPrice)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStagedItem(st.itemId)}
                          className="h-7 w-7 text-destructive"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <Label className="text-xs font-bold">Purpose / Collection Notes</Label>
              <Textarea
                placeholder="e.g., Off-site market sales, consignment distribution..."
                value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
                className="text-xs mt-1"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleConfirmCreateCollection} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
              Log Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Up Modal */}
      <Dialog open={!!balanceTarget} onOpenChange={() => setBalanceTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-purple-600" />
              Balance Up & Calculate Manager Debt
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reconcile products sold, stock returned to inventory, and cash remitted for collection{" "}
              <strong>{balanceTarget?.collectionNumber}</strong> ({balanceTarget?.managerName}).
            </DialogDescription>
          </DialogHeader>

          {balanceTarget && projectedBalance && (
            <div className="space-y-4 py-2">
              {/* Product Reconcile Inputs */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Input Sold & Returned Quantities
                </Label>
                {balanceTarget.items.map((it) => {
                  const currentInput = itemBalancingInputs[it.itemId] || { quantitySold: 0, quantityReturned: 0 };
                  const remQty = Math.max(0, it.quantityCollected - (currentInput.quantitySold || 0) - (currentInput.quantityReturned || 0));
                  const remVal = remQty * it.unitPriceNgn;

                  return (
                    <div key={it.itemId} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{it.itemName}</span>
                        <Badge variant="outline">Collected: {it.quantityCollected} units @ {formatCurrency(it.unitPriceNgn)}</Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Qty Sold</Label>
                          <Input
                            type="number"
                            min="0"
                            max={it.quantityCollected}
                            value={currentInput.quantitySold}
                            onChange={(e) => {
                              const v = parseInt(e.target.value) || 0;
                              setItemBalancingInputs((prev) => ({
                                ...prev,
                                [it.itemId]: { ...prev[it.itemId], quantitySold: v },
                              }));
                            }}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Qty Returned to Stock</Label>
                          <Input
                            type="number"
                            min="0"
                            max={it.quantityCollected - currentInput.quantitySold}
                            value={currentInput.quantityReturned}
                            onChange={(e) => {
                              const v = parseInt(e.target.value) || 0;
                              setItemBalancingInputs((prev) => ({
                                ...prev,
                                [it.itemId]: { ...prev[it.itemId], quantityReturned: v },
                              }));
                            }}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Unbalanced Debt Qty</Label>
                          <div className="h-8 flex items-center px-2 rounded bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300">
                            {remQty} units ({formatCurrency(remVal)})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cash Remitted Input */}
              <div>
                <Label className="text-xs font-bold">Cash / Payments Remitted to Store (₦)</Label>
                <Input
                  type="number"
                  value={cashRemittedInput}
                  onChange={(e) => setCashRemittedInput(e.target.value)}
                  className="mt-1 text-sm font-bold"
                  placeholder="e.g., 250000"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Balancing Note</Label>
                <Input
                  placeholder="e.g., Manager paid cash for 7 units, returned 2 units to warehouse"
                  value={balancingNote}
                  onChange={(e) => setBalancingNote(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              {/* Calculated Debt Breakdown Card */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  Balancing Calculation Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Total Collection</span>
                    <span className="font-bold">{formatCurrency(projectedBalance.totalValue)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Cash Remitted</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(projectedBalance.cashRemitted)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Returned Stock</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">{formatCurrency(projectedBalance.totalReturned)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">Remaining Manager Debt</span>
                    <span className="font-extrabold text-sm text-amber-700 dark:text-amber-300">
                      {formatCurrency(projectedBalance.remainingDebt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceTarget(null)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleConfirmBalanceUp} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold">
              Save & Record Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Debt Modal */}
      <Dialog open={!!debtTarget} onOpenChange={() => setDebtTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-600" />
              Settle Manager Debt
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record cash debt repayment from <strong>{debtTarget?.managerName}</strong> for collection{" "}
              <strong>{debtTarget?.collectionNumber}</strong>.
            </DialogDescription>
          </DialogHeader>

          {debtTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1">
                <div className="text-muted-foreground">Current Outstanding Debt:</div>
                <div className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
                  {formatCurrency(debtTarget.remainingDebtValueNgn)}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Repayment Amount (₦)</Label>
                <Input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="mt-1 text-sm font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Payment Notes / Reference</Label>
                <Input
                  placeholder="e.g., Bank transfer, cash payment to vault..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDebtTarget(null)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleConfirmSettleDebt} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
              Record Debt Repayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
