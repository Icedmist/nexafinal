import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import {
  Receipt,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Package,
  ArrowLeftRight,
  Sparkles,
  Plus,
  AlertTriangle,
  Search,
  Filter,
  Check,
  Edit2,
  X,
  Printer,
  MessageSquare,
  Bookmark,
  Percent,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItems, useCustomers, useMovements } from "@/hooks/useInventoryData";
import { useSales } from "@/hooks/useSalesData";
import { useExpenses } from "@/hooks/useExpensesData";
import { useRefunds } from "@/hooks/useRefundsData";
import { useUpdateItem, useCreateRefund, useCreateMovement } from "@/hooks/useInventoryMutations";
import { toast } from "sonner";
import { getWhatsAppUrl, buildPersonalizedReceiptText } from "@/lib/whatsapp";
import { useRole } from "@/hooks/useRole";
import { useDemo } from "@/hooks/useDemo";
import { useUsers } from "@/hooks/useUsers";
import { useStoreBranches } from "@/hooks/useStaffData";
import type { SaleTransaction, Item, StockMovement } from "@/types/inventory";
import { MovementType } from "@/types/inventory";
import type { Expense, Refund } from "@/types/finance";
import type { Customer } from "@/types/crm";

const NAIRA = "₦";
function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function AdminTrackerPage() {
  const { isDemo, onboarding } = useDemo();
  const { role } = useRole();

  // Data queries
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: refunds = [], isLoading: refundsLoading } = useRefunds();
  const { data: movements = [], isLoading: movementsLoading } = useMovements();
  const { staff: users = [], loading: usersLoading } = useUsers();
  const { data: branches = [] } = useStoreBranches();

  // Mutations
  const { mutate: updateItem, isLoading: priceUpdating } = useUpdateItem();
  const { mutate: recordRefund, isLoading: refundRecording } = useCreateRefund();
  const { mutate: recordMovement, isLoading: movementRecording } = useCreateMovement();

  // Selected state for details dialogs
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Global filter states
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("all");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");

  // Filter/Search states
  const [salesSearch, setSalesSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [expenseFilter, setExpenseFilter] = useState("all");
  const [returnSearch, setReturnSearch] = useState("");

  // Editing state for inline price adjustments
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedSellingPrice, setEditedSellingPrice] = useState<string>("");
  const [editedCostPrice, setEditedCostPrice] = useState<string>("");

  // Dialog state for adding a return
  const [addReturnOpen, setAddReturnOpen] = useState(false);
  const [returnItemId, setReturnItemId] = useState("");
  const [returnQty, setReturnQty] = useState("1");
  const [returnAmount, setReturnAmount] = useState("");
  const [returnReason, setReturnReason] = useState("defective");
  const [returnCustomerPhone, setReturnCustomerPhone] = useState("");

  // Dialog state for stock transfer
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferItemId, setTransferItemId] = useState("");
  const [transferQty, setTransferQty] = useState("5");
  const [transferNotes, setTransferNotes] = useState("");

  // --- Helper functions for rendering & matching ---
  const isDateMatch = (dateStr: string | undefined | null, filter: string) => {
    if (!dateStr) return false;
    if (filter === "all") return true;

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (filter === "today") {
        return date >= todayStart;
      }
      if (filter === "yesterday") {
        const yesterdayStart = subDays(todayStart, 1);
        return date >= yesterdayStart && date < todayStart;
      }
      if (filter === "7days") {
        const sevenDaysAgo = subDays(todayStart, 7);
        return date >= sevenDaysAgo;
      }
      if (filter === "30days") {
        const thirtyDaysAgo = subDays(todayStart, 30);
        return date >= thirtyDaysAgo;
      }
      if (filter === "thismonth") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= monthStart;
      }
    } catch (e) {
      console.error(e);
    }
    return true;
  };

  const getStoreName = (storeId?: string) => {
    if (!storeId) return "Main Store";
    return storeId;
  };

  // Branch matching helper for the "Store / Branch" filter
  const isBranchMatch = (recordBranchId?: string | null): boolean => {
    if (selectedStoreFilter === "all") return true;
    if (!recordBranchId) return selectedStoreFilter === "unassigned";
    return recordBranchId === selectedStoreFilter;
  };

  const getUserName = (userIdOrName?: string) => {
    if (!userIdOrName) return "System/Unknown";
    const matchedUser = users.find(
      (u) => u.id === userIdOrName || u.email?.toLowerCase() === userIdOrName.toLowerCase() || u.name?.toLowerCase() === userIdOrName.toLowerCase()
    );
    return matchedUser ? matchedUser.name : userIdOrName;
  };

  // --- Filtering computations ---
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const query = salesSearch.trim().toLowerCase();
      const receiptLikeId = [s.id, s.collectionCode, s.customerPhone, s.customerEmail]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");
      const matchesSearch = !query ||
        receiptLikeId.includes(query) ||
        (s.customerName && s.customerName.toLowerCase().includes(query)) ||
        (s.customerPhone && s.customerPhone.includes(query));

      const matchesUser = selectedUserFilter === "all" || s.recordedBy === selectedUserFilter;
      const matchesDate = isDateMatch(s.createdAt, selectedDateFilter);
      const matchesStore = isBranchMatch(s.branchId);
      return matchesSearch && matchesUser && matchesDate && matchesStore;
    });
  }, [sales, salesSearch, selectedStoreFilter, selectedUserFilter, selectedDateFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const query = customerSearch.toLowerCase();
      if (!query) return true;
      return (
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
      );
    });
  }, [customers, customerSearch]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const query = itemSearch.toLowerCase();
      const matchesSearch = !query || i.name.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [items, itemSearch]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCategory = expenseFilter === "all" || e.category === expenseFilter;
      const matchesUser = selectedUserFilter === "all" || e.recordedBy === selectedUserFilter;
      const matchesDate = isDateMatch(e.date || e.createdAt, selectedDateFilter);
      const matchesStore = isBranchMatch(e.branchId);
      return matchesCategory && matchesUser && matchesDate && matchesStore;
    });
  }, [expenses, expenseFilter, selectedStoreFilter, selectedUserFilter, selectedDateFilter]);

  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      const query = returnSearch.toLowerCase();
      const matchesSearch = !query || 
        r.reason.toLowerCase().includes(query) ||
        (r.itemId && r.itemId.toLowerCase().includes(query));

      const matchesUser = selectedUserFilter === "all" || r.recordedBy === selectedUserFilter;
      const matchesDate = isDateMatch(r.createdAt, selectedDateFilter);
      const matchesStore = isBranchMatch(r.branchId);
      return matchesSearch && matchesUser && matchesDate && matchesStore;
    });
  }, [refunds, returnSearch, selectedStoreFilter, selectedUserFilter, selectedDateFilter]);

  const filteredMovements = useMemo(() => {
    return movements.filter((move) => {
      const matchesUser = selectedUserFilter === "all" || move.performedBy === selectedUserFilter;
      const matchesDate = isDateMatch(move.createdAt, selectedDateFilter);
      const matchesStore = isBranchMatch(move.branchId);

      return matchesUser && matchesDate && matchesStore;
    });
  }, [movements, selectedStoreFilter, selectedUserFilter, selectedDateFilter]);

  // Out of stock items
  const outOfStockItems = useMemo(() => {
    return items.filter((i) => {
      const isOutOfStock = i.currentStock <= i.reorderPoint;
      return isOutOfStock;
    });
  }, [items]);

  // --- Actions handlers ---
  const handleStartPriceEdit = (item: Item) => {
    setEditingItemId(item.id);
    setEditedSellingPrice(item.sellingPrice.toString());
    setEditedCostPrice(item.costPrice ? item.costPrice.toString() : "0");
  };

  const handleSavePriceEdit = (itemId: string) => {
    const sp = parseFloat(editedSellingPrice);
    const cp = parseFloat(editedCostPrice);
    if (isNaN(sp) || sp < 0) {
      toast.error("Please enter a valid selling price");
      return;
    }
    if (isNaN(cp) || cp < 0) {
      toast.error("Please enter a valid cost price");
      return;
    }

    updateItem(
      {
        id: itemId,
        updates: {
          sellingPrice: sp,
          costPrice: cp,
        },
      },
      {
        onSuccess: () => {
          toast.success("Product margins & prices updated successfully");
          setEditingItemId(null);
        },
        onError: () => {
          toast.error("Failed to update item pricing");
        },
      }
    );
  };

  const handleMarkupCalculator = (itemId: string, percentage: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const baseCost = item.costPrice || (item.sellingPrice * 0.7); // fall back if no cost price
    const newPrice = Math.round(baseCost * (1 + percentage / 100));
    
    updateItem(
      {
        id: itemId,
        updates: {
          sellingPrice: newPrice,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Applied +${percentage}% markup to ${item.name}!`);
        }
      }
    );
  };

  const handleSendWhatsAppReceipt = (sale: SaleTransaction) => {
    if (!sale.customerPhone) {
      toast.error("This sale transaction doesn't have a linked customer phone number.");
      return;
    }
    const storeName = onboarding.storeName || "NEXA StoreOS";
    const text = buildPersonalizedReceiptText(sale, storeName);
    const url = getWhatsAppUrl(sale.customerPhone, text);
    window.open(url, "_blank");
    toast.success("WhatsApp receipt dispatch triggered!");
  };

  const handleAddReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnItemId) {
      toast.error("Please select a product");
      return;
    }
    const qty = parseInt(returnQty);
    const amt = parseFloat(returnAmount);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please specify a valid quantity");
      return;
    }
    if (isNaN(amt) || amt < 0) {
      toast.error("Please specify a refund amount");
      return;
    }

    const selectedProd = items.find((i) => i.id === returnItemId);
    
    recordRefund(
      {
        saleId: "",
        itemId: returnItemId,
        itemName: selectedProd?.name || "Unknown Item",
        quantity: qty,
        amountNgn: amt,
        reason: returnReason as any,
        notes: returnCustomerPhone || "",
        createdAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Customer return & refund logged successfully");
          // Also adjust stock upwards because item was returned
          if (selectedProd) {
            recordMovement({
              itemId: returnItemId,
              type: MovementType.Received,
              quantity: qty,
              fromLocationId: null,
              toLocationId: selectedProd.locationId || null,
              reference: "Customer Return Log",
              notes: `Refund claim recorded. Condition: ${returnReason}`,
              performedBy: "Store Admin",
              createdAt: new Date().toISOString()
            });
          }
          setAddReturnOpen(false);
          setReturnItemId("");
          setReturnQty("1");
          setReturnAmount("");
          setReturnReason("defective");
          setReturnCustomerPhone("");
        },
        onError: () => {
          toast.error("Failed to log refund");
        }
      }
    );
  };

  const handleTransferStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItemId) {
      toast.error("Please select a product to transfer");
      return;
    }
    const qty = parseInt(transferQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please specify valid quantity");
      return;
    }

    const selectedProd = items.find((i) => i.id === transferItemId);
    if (!selectedProd) return;

    if (selectedProd.currentStock < qty) {
      toast.error(`Insufficient stock! Only ${selectedProd.currentStock} units available.`);
      return;
    }

    recordMovement(
      {
        itemId: transferItemId,
        type: MovementType.Shipped,
        quantity: qty,
        fromLocationId: selectedProd.locationId || null,
        toLocationId: null,
        reference: "Goods Transfer",
        notes: transferNotes || "Transfer of goods out of this section",
        performedBy: "Store Admin",
        createdAt: new Date().toISOString()
      },
      {
        onSuccess: () => {
          toast.success(`Transferred ${qty} units of ${selectedProd.name} successfully`);
          setTransferOpen(false);
          setTransferItemId("");
          setTransferQty("5");
          setTransferNotes("");
        },
        onError: () => {
          toast.error("Failed to transfer goods");
        }
      }
    );
  };

  // Helper stats for headers
  const summaryStats = useMemo(() => {
    const totalRev = sales.reduce((acc, s) => acc + s.totalNgn, 0);
    const lowStockCount = items.filter((i) => i.currentStock <= i.reorderPoint).length;
    const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    return { totalRev, lowStockCount, totalExpense };
  }, [sales, items, expenses]);

  return (
    <div className="space-y-6">
      {/* Top Banner/Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans flex items-center gap-2">
            <Bookmark className="h-7 w-7 text-emerald-600 dark:text-emerald-500" />
            Store Admin Audit Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete administrative command center. Oversee details for sales, receipts, CRM logs, cost-price margins, and stock movements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Dialog open={addReturnOpen} onOpenChange={setAddReturnOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs bg-card hover:bg-muted border">
                <RotateCcw className="h-3.5 w-3.5 mr-1 text-red-500" /> Log Customer Return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card">
              <DialogHeader>
                <DialogTitle>Log Returned Goods</DialogTitle>
                <DialogDescription>
                  Record products brought back by customers to adjust revenue & restock.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddReturn} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Select Product</label>
                  <Select value={returnItemId} onValueChange={setReturnItemId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} (Stock: {i.currentStock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Quantity Returned</label>
                    <Input
                      type="number"
                      min="1"
                      className="bg-background"
                      value={returnQty}
                      onChange={(e) => setReturnQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Refund Value (₦)</label>
                    <Input
                      type="number"
                      min="0"
                      className="bg-background"
                      placeholder="e.g. 5000"
                      value={returnAmount}
                      onChange={(e) => setReturnAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Reason for Return</label>
                  <Select value={returnReason} onValueChange={setReturnReason}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Condition reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="defective">Defective / Damaged</SelectItem>
                      <SelectItem value="size-mismatch">Size/Specification Mismatch</SelectItem>
                      <SelectItem value="wrong-item">Wrong product delivered</SelectItem>
                      <SelectItem value="expired">Expired batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Customer Phone (Optional)</label>
                  <Input
                    className="bg-background"
                    placeholder="e.g. 08012345678"
                    value={returnCustomerPhone}
                    onChange={(e) => setReturnCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAddReturnOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-red-700 hover:bg-red-800 text-white" disabled={refundRecording}>
                    {refundRecording ? "Logging..." : "Confirm Return"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white">
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Transfer / Correct Goods
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card">
              <DialogHeader>
                <DialogTitle>Transfer Goods & Section Correction</DialogTitle>
                <DialogDescription>
                  Log stock shipments, section transfers, or general adjustments.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransferStock} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Select Product</label>
                  <Select value={transferItemId} onValueChange={setTransferItemId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} (Stock: {i.currentStock} {i.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Quantity to Ship/Transfer</label>
                  <Input
                    type="number"
                    min="1"
                    className="bg-background"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Section / Warehouse / Reason</label>
                  <Input
                    className="bg-background"
                    placeholder="e.g. Transferred to Branch B shelf 2"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setTransferOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white" disabled={movementRecording}>
                    {movementRecording ? "Processing..." : "Process Transfer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Global Audit & Filtering Toolbar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Store & Auditor Filters</h3>
          </div>
          {(selectedStoreFilter !== "all" || selectedUserFilter !== "all" || selectedDateFilter !== "all") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-red-500 hover:text-red-600 h-7 px-2"
              onClick={() => {
                setSelectedStoreFilter("all");
                setSelectedUserFilter("all");
                setSelectedDateFilter("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* 1. Store Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Store / Branch</label>
            <Select value={selectedStoreFilter} onValueChange={setSelectedStoreFilter}>
              <SelectTrigger className="bg-background text-xs h-9 border-border">
                <SelectValue placeholder="All Store Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><Building2 className="inline h-3.5 w-3.5 mr-1" /> All Store Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <Building2 className="inline h-3.5 w-3.5 mr-1" /> {b.name}
                  </SelectItem>
                ))}
                <SelectItem value="unassigned"><Building2 className="inline h-3.5 w-3.5 mr-1" /> Unassigned / Main</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Staff/User Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Staff / Performed By</label>
            <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
              <SelectTrigger className="bg-background text-xs h-9 border-border">
                <SelectValue placeholder="All Staff Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><Users className="inline h-3.5 w-3.5 mr-1" /> All Staff / Users</SelectItem>
                {users.map((usr) => (
                  <SelectItem key={usr.id} value={usr.id}>
                    <User className="inline h-3.5 w-3.5 mr-1" /> {usr.name || usr.email} ({usr.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Date & Time Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Time & Date Period</label>
            <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
              <SelectTrigger className="bg-background text-xs h-9 border-border">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><Calendar className="inline h-3.5 w-3.5 mr-1" /> All Time Records</SelectItem>
                <SelectItem value="today"><Calendar className="inline h-3.5 w-3.5 mr-1" /> Today</SelectItem>
                <SelectItem value="yesterday"><Calendar className="inline h-3.5 w-3.5 mr-1" /> Yesterday</SelectItem>
                <SelectItem value="7days"><Calendar className="inline h-3.5 w-3.5 mr-1" /> Last 7 Days</SelectItem>
                <SelectItem value="30days"><Calendar className="inline h-3.5 w-3.5 mr-1" /> Last 30 Days</SelectItem>
                <SelectItem value="thismonth"><Calendar className="inline h-3.5 w-3.5 mr-1" /> This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Mini Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Sales Audited</span>
            <p className="mt-1 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{fmtNgn(summaryStats.totalRev)}</p>
          </div>
          <div className="bg-emerald-100 dark:bg-emerald-950 p-2.5 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Customers Logs</span>
            <p className="mt-1 text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{customers.length} Accounts</p>
          </div>
          <div className="bg-blue-100 dark:bg-blue-950 p-2.5 rounded-lg">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Out of Stock Alerts</span>
            <p className="mt-1 text-2xl font-black font-mono text-red-600 dark:text-red-400">{summaryStats.lowStockCount} Items</p>
          </div>
          <div className="bg-red-100 dark:bg-red-950 p-2.5 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Manager Expenses</span>
            <p className="mt-1 text-2xl font-black font-mono text-yellow-600 dark:text-yellow-400">{fmtNgn(summaryStats.totalExpense)}</p>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-950 p-2.5 rounded-lg">
            <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Main Tabs interface */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid grid-cols-4 md:flex md:w-auto overflow-x-auto gap-1 border bg-muted p-1 rounded-xl">
          <TabsTrigger value="sales" className="text-xs md:text-sm font-semibold rounded-lg flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Sales & Receipts
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs md:text-sm font-semibold rounded-lg flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Customers
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs md:text-sm font-semibold rounded-lg flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5" /> Margins & Prices
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs md:text-sm font-semibold rounded-lg flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Expenses Audit
          </TabsTrigger>
          <TabsTrigger value="returns" className="text-xs md:text-sm font-semibold rounded-lg flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Returns Logs
          </TabsTrigger>
          <TabsTrigger value="outstock" className="text-xs md:text-sm font-semibold rounded-lg flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Out-of-Stocks
          </TabsTrigger>
          <TabsTrigger value="movements" className="text-xs md:text-sm font-semibold rounded-lg flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" /> Goods Transfers
          </TabsTrigger>
        </TabsList>

        {/* 1. SALES & RECEIPTS TAB */}
        <TabsContent value="sales" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Transaction Ledger & Receipts</CardTitle>
                <CardDescription>Track every individual POS or online sell, verify item details and customer notes.</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by receipt ID, transaction ID, or customer..."
                  className="pl-8 bg-background text-sm h-9"
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading sales transactions...</div>
              ) : filteredSales.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No matching sales records found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction Code</TableHead>
                      <TableHead>Store Branch</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Purchased Items</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Total Net (₦)</TableHead>
                      <TableHead className="text-center">Receipt Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-muted/40 cursor-pointer">
                        <TableCell className="font-mono text-xs text-primary font-bold">{sale.id.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-sans font-medium">
                            {"Main Store"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sale.createdAt ? format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm") : "N/A"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">
                          {getUserName(sale.recordedBy)}
                        </TableCell>
                        <TableCell>
                          {sale.customerName ? (
                            <div className="text-sm font-semibold">
                              {sale.customerName}
                              {sale.customerPhone && <div className="text-[10px] text-muted-foreground font-mono">{sale.customerPhone}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Walk-in Customer</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {sale.items?.map((li: { itemName: string; quantity: number }) => `${li.itemName} (x${li.quantity})`).join(", ")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                            POS
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          {fmtNgn(sale.totalNgn)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedSale(sale)}>
                                  <Receipt className="h-3 w-3 mr-1 text-emerald-600" /> Digital Receipt
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md bg-card">
                                <DialogHeader>
                                  <DialogTitle className="text-center border-b pb-2">TAX RECEIPT</DialogTitle>
                                </DialogHeader>
                                {selectedSale && (
                                  <div className="space-y-4 pt-2">
                                    <div className="text-center space-y-1">
                                      <h3 className="text-lg font-black tracking-tight">{onboarding.storeName || "NEXA StoreOS"}</h3>
                                      <p className="text-xs text-muted-foreground font-mono">ID: {selectedSale.id}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Date: {selectedSale.createdAt ? format(new Date(selectedSale.createdAt), "dd MMM yyyy, HH:mm") : "N/A"}
                                      </p>
                                    </div>
                                    <hr className="border-t border-border my-3" />
                                    <div className="space-y-2">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Items Ordered</h4>
                                      {selectedSale.items?.map((item: { itemName: string; quantity: number; unitPriceNgn: number }, idx: number) => (
                                        <div key={idx} className="flex justify-between text-sm font-mono">
                                          <span>{item.itemName} x{item.quantity}</span>
                                          <span>{fmtNgn(item.unitPriceNgn * item.quantity)}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <hr className="border-t border-border my-3" />
                                    <div className="space-y-1 text-right">
                                      <div className="text-sm flex justify-between font-bold">
                                        <span>Total:</span>
                                        <span className="text-base text-emerald-600 font-black">{fmtNgn(selectedSale.totalNgn)}</span>
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground text-center bg-muted/40 p-2.5 rounded-lg border">
                                      <span className="font-semibold block">Customer Details:</span>
                                      {selectedSale.customerName || "Walk-in"} {selectedSale.customerPhone ? `(${selectedSale.customerPhone})` : ""}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={() => handleSendWhatsAppReceipt(selectedSale)}>
                                        <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp Dispatch
                                      </Button>
                                      <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                                        <Printer className="h-3.5 w-3.5 mr-1" /> Print Receipt
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Customer CRM Ledger</CardTitle>
                <CardDescription>Track customer phone numbers, transactions count, and contact logs.</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Name, Phone..."
                  className="pl-8 bg-background text-sm h-9"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading customer CRM files...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No customer profiles discovered.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Phone Contact</TableHead>
                      <TableHead>Email Address</TableHead>
                      <TableHead>Customer Type</TableHead>
                      <TableHead>Registered At</TableHead>
                      <TableHead className="text-right">Outstanding Debt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/40">
                        <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" /> {c.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.phone || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {c.notes?.split(",")[0] || "Standard"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.createdAt ? format(new Date(c.createdAt), "dd MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-500">
                          {c.debtBalance ? fmtNgn(c.debtBalance) : fmtNgn(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. MARGINS & PRICE REVISIONS */}
        <TabsContent value="pricing" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold">Price Revisions & Markup Audits</CardTitle>
              <CardDescription>
                Compare item Cost Prices against Selling Prices. Optimize margins directly with inline updates or instant markups.
              </CardDescription>
              <div className="relative w-full md:w-72 mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Product name, SKU..."
                  className="pl-8 bg-background text-sm h-9"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading catalog items...</div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No products found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Cost Price (₦)</TableHead>
                      <TableHead className="text-right">Selling Price (₦)</TableHead>
                      <TableHead className="text-right">Gross Profit Margin</TableHead>
                      <TableHead className="text-center">Quick Markup Adjuster</TableHead>
                      <TableHead className="text-center">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const cost = item.costPrice || 0;
                      const sell = item.sellingPrice || 0;
                      const profit = sell - cost;
                      const marginPercentage = sell > 0 ? Math.round((profit / sell) * 100) : 0;

                      const isEditing = editingItemId === item.id;

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/40">
                          <TableCell className="font-semibold text-foreground">
                            {item.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                          <TableCell className="text-right font-mono">
                            {isEditing ? (
                              <Input
                                type="number"
                                className="w-24 text-right h-8 bg-background inline-block font-mono"
                                value={editedCostPrice}
                                onChange={(e) => setEditedCostPrice(e.target.value)}
                              />
                            ) : (
                              fmtNgn(cost)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground">
                            {isEditing ? (
                              <Input
                                type="number"
                                className="w-24 text-right h-8 bg-background inline-block font-mono"
                                value={editedSellingPrice}
                                onChange={(e) => setEditedSellingPrice(e.target.value)}
                              />
                            ) : (
                              fmtNgn(sell)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-xs font-bold font-mono px-2 py-1 rounded-full ${
                              marginPercentage >= 30 
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700" 
                                : marginPercentage > 10 
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-700" 
                                : "bg-red-100 dark:bg-red-950 text-red-700"
                            }`}>
                              {marginPercentage}% margin
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button size="sm" variant="outline" className="text-[10px] py-1 px-1.5 h-6" onClick={() => handleMarkupCalculator(item.id, 15)}>
                                +15%
                              </Button>
                              <Button size="sm" variant="outline" className="text-[10px] py-1 px-1.5 h-6" onClick={() => handleMarkupCalculator(item.id, 25)}>
                                +25%
                              </Button>
                              <Button size="sm" variant="outline" className="text-[10px] py-1 px-1.5 h-6" onClick={() => handleMarkupCalculator(item.id, 35)}>
                                +35%
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing ? (
                              <div className="flex justify-center gap-1">
                                <Button size="sm" className="bg-emerald-700 text-white h-7 w-7 p-0 rounded-md" onClick={() => handleSavePriceEdit(item.id)} disabled={priceUpdating}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-md" onClick={() => setEditingItemId(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-md" onClick={() => handleStartPriceEdit(item)}>
                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. EXPENSES AUDIT */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Manager Expenses Register</CardTitle>
                <CardDescription>Track logged expenditure from the section manager or floor supervisors.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={expenseFilter} onValueChange={setExpenseFilter}>
                  <SelectTrigger className="w-44 bg-background text-xs h-9">
                    <SelectValue placeholder="Filter Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="inventory">Inventory Procurement</SelectItem>
                    <SelectItem value="rent">Rent & Facility</SelectItem>
                    <SelectItem value="logistics">Logistics & Freight</SelectItem>
                    <SelectItem value="salary">Salary & Staffing</SelectItem>
                    <SelectItem value="utilities">Utilities & Energy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading expenses ledger...</div>
              ) : filteredExpenses.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No expenses registered under this filter.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense Description</TableHead>
                      <TableHead>Store Branch</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date Logged</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead className="text-right">Amount (₦)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((exp) => (
                      <TableRow key={exp.id} className="hover:bg-muted/40">
                        <TableCell className="font-semibold text-foreground">
                          {exp.notes}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-sans">
                            Main Store
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {exp.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {exp.date ? (exp.date.includes('T') ? format(new Date(exp.date), "dd MMM yyyy, HH:mm") : format(new Date(exp.date), "dd MMM yyyy")) : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono uppercase">Cash</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">{getUserName(exp.recordedBy)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-yellow-600 dark:text-yellow-400">
                          {fmtNgn(exp.amount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. RETURNS LOGS */}
        <TabsContent value="returns" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Returns & Defective Goods History</CardTitle>
                <CardDescription>Track claims, customers returning items, and product conditions.</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Reason, Customer..."
                  className="pl-8 bg-background text-sm h-9"
                  value={returnSearch}
                  onChange={(e) => setReturnSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {refundsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading returns register...</div>
              ) : filteredRefunds.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No customer returns logged.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return Code</TableHead>
                      <TableHead>Store Branch</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Qty Returned</TableHead>
                      <TableHead>Reason / Status</TableHead>
                      <TableHead>Customer Phone</TableHead>
                      <TableHead>Logged By</TableHead>
                      <TableHead>Date Registered</TableHead>
                      <TableHead className="text-right">Refund Amount (₦)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRefunds.map((refund) => (
                      <TableRow key={refund.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs font-bold text-red-500">{refund.id.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-sans">
                            Main Store
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{refund.itemName}</TableCell>
                        <TableCell className="font-mono font-bold text-center">{refund.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="capitalize text-[10px]">
                            {refund.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">—</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">
                          {getUserName(refund.recordedBy)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {refund.createdAt ? format(new Date(refund.createdAt), "dd MMM yyyy, HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-500">
                          {fmtNgn(refund.amountNgn)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. OUT OF STOCKS TAB */}
        <TabsContent value="outstock" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Low Stock & Out-of-Stocks Alert Dashboard</CardTitle>
              <CardDescription>
                Urgent catalog check. These items require fast procurement reorders to satisfy store customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading products...</div>
              ) : outOfStockItems.length === 0 ? (
                <div className="py-12 text-center text-sm text-emerald-600 font-semibold">
                  Fantastic! No items are currently out of stock or below their reorder points.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU Code</TableHead>
                      <TableHead className="text-center">Current Stock</TableHead>
                      <TableHead className="text-center">Min Reorder Point</TableHead>
                      <TableHead>Alert Status</TableHead>
                      <TableHead className="text-right">Recommended Reorder Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outOfStockItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell className="font-semibold text-foreground flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-red-500" /> {item.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="font-mono font-bold text-center text-red-600">{item.currentStock} {item.unit}</TableCell>
                        <TableCell className="font-mono text-center text-muted-foreground">{item.reorderPoint} {item.unit}</TableCell>
                        <TableCell>
                          <Badge variant={item.currentStock === 0 ? "destructive" : "secondary"} className="text-[10px] font-mono">
                            {item.currentStock === 0 ? "OUT OF STOCK" : "LOW STOCK"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {item.reorderQuantity || 20} {item.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. GOODS TRANSFERS & MOVEMENTS */}
        <TabsContent value="movements" className="space-y-4 mt-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Section Movements & Goods Transfers</CardTitle>
              <CardDescription>
                Auditable logs recording when products are received, shipped out, or adjusted by floor staff.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {movementsLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading stock movements...</div>
              ) : filteredMovements.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No stock movements found under current filters.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference / Log ID</TableHead>
                      <TableHead>Store Branch</TableHead>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Movement Type</TableHead>
                      <TableHead className="text-center">Quantity Traded</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Reference Description</TableHead>
                      <TableHead>Date Audited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((move) => {
                      const item = items.find((i) => i.id === move.itemId);
                      return (
                        <TableRow key={move.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs font-bold">{move.id.slice(0, 10)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-sans">
                              Main Store
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {item ? item.name : "Unknown Product"}
                          </TableCell>
                          <TableCell>
                            <Badge className="text-[10px] uppercase font-mono" variant={
                              move.type === "received" 
                                ? "secondary" 
                                : move.type === "shipped" 
                                ? "destructive" 
                                : "outline"
                            }>
                              {move.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-center">
                            {move.type === "shipped" ? `-${move.quantity}` : `+${move.quantity}`}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-semibold">{getUserName(move.performedBy)}</TableCell>
                          <TableCell className="text-xs truncate max-w-xs">{move.reference || "Inventory Adjustment"} ({move.notes || "No extra notes"})</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {move.createdAt ? format(new Date(move.createdAt), "dd MMM yyyy, HH:mm") : "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminTrackerPage;
