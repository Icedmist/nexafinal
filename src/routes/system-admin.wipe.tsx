import { useState } from "react";
import {
  collection, query, where, orderBy, limit, getDocs, startAfter, writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { AlertTriangle, Database, RefreshCw, Trash2, KeyRound, ShieldCheck, Store } from "lucide-react";
import { Link } from "react-router-dom";

const BATCH = 400;

/** Data categories a system admin may wipe. Never includes stores/users/staff (account integrity). */
interface WipeTarget {
  id: string;
  label: string;
  description: string;
  collections: string[];
  /** Whether records carry a branchId and can be wiped per-branch. */
  hasBranchId: boolean;
}

const WIPE_TARGETS: WipeTarget[] = [
  { id: "sales", label: "Sales & Receipts", description: "All recorded sale transactions", collections: ["sales"], hasBranchId: true },
  { id: "products", label: "Products / Catalog", description: "Catalog items and inventory counts", collections: ["products"], hasBranchId: true },
  { id: "movements", label: "Stock Movements", description: "Inventory movement history", collections: ["movements"], hasBranchId: true },
  { id: "categories", label: "Categories", description: "Product categories", collections: ["categories"], hasBranchId: true },
  { id: "customers", label: "Customers", description: "Saved customer directory", collections: ["customers"], hasBranchId: true },
  { id: "debt_payments", label: "Debt Payments", description: "Payments made toward debts", collections: ["debt_payments"], hasBranchId: true },
  { id: "imported_debts", label: "Imported Debts", description: "Opening debtors imported or entered manually", collections: ["debt_records"], hasBranchId: true },
  { id: "refunds", label: "Refunds", description: "Refund records", collections: ["refunds"], hasBranchId: true },
  { id: "expenses", label: "Expenses", description: "Recorded business expenses", collections: ["expenses"], hasBranchId: true },
  { id: "suppliers", label: "Suppliers", description: "Supplier records", collections: ["suppliers"], hasBranchId: true },
  { id: "purchase_orders", label: "Purchase Orders", description: "Purchase order documents", collections: ["purchase_orders"], hasBranchId: true },
  { id: "sales_forms", label: "Sales Forms / Receipts", description: "Saved line-item documents (receipts, proformas, notes)", collections: ["sales_forms"], hasBranchId: true },
  { id: "notifications", label: "Notifications", description: "In-app notification records", collections: ["notifications"], hasBranchId: true },
  { id: "activity_logs", label: "Activity Logs", description: "Store activity audit trail", collections: ["activity_logs"], hasBranchId: true },
  { id: "requests", label: "Requests", description: "In-store requests", collections: ["requests"], hasBranchId: true },
  { id: "manager_collections", label: "Manager Collections", description: "Branch manager collection records", collections: ["managerCollections"], hasBranchId: true },
  { id: "custom_fields", label: "Custom Fields", description: "Store custom field definitions", collections: ["customFields"], hasBranchId: true },
  { id: "store_credit", label: "Store Credit", description: "Prepaid balances + credit ledger (store-wide only)", collections: ["customer_credits", "credit_topups"], hasBranchId: false },
];

interface StoreOption { id: string; name: string; }
interface BranchOption { id: string; name: string; }

export default function SystemAdminWipe() {
  const { user } = useAuth();

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [storeName, setStoreName] = useState("");

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [scope, setScope] = useState<"store" | "branch">("store");
  const [branchId, setBranchId] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [counting, setCounting] = useState(false);

  const [typedName, setTypedName] = useState("");
  const [password, setPassword] = useState("");
  const [wiping, setWiping] = useState(false);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, number>>({});

  const loadStores = async () => {
    setStoresLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "stores"), orderBy("name")));
      const list: StoreOption[] = [];
      snap.forEach((d) => {
        const name = d.data().name || d.id;
        list.push({ id: d.id, name });
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setStores(list);
    } catch (err) {
      console.error("Failed to load stores:", err);
      toast.error("Failed to load stores.");
    } finally {
      setStoresLoading(false);
    }
  };

  const onSelectStore = async (id: string) => {
    setStoreId(id);
    setBranchId("");
    setBranches([]);
    setCounts({});
    setDone({});
    setProgress({});
    const found = stores.find((s) => s.id === id);
    setStoreName(found?.name || "");
    if (!id) return;
    setBranchesLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "locations"), where("storeId", "==", id)));
      const list: BranchOption[] = [];
      snap.forEach((d) => {
        const name = d.data().name || d.id;
        list.push({ id: d.id, name });
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setBranches(list);
    } catch (err) {
      console.error("Failed to load branches:", err);
      toast.error("Failed to load branches for this store.");
    } finally {
      setBranchesLoading(false);
    }
  };

  const toggleTarget = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTargets = WIPE_TARGETS.filter((t) => selected.has(t.id));
  const branchFilter = scope === "branch" ? branchId : null;

  /** Paginate a store's collection (by storeId), optionally narrowing to a branch in-memory. */
  const forEachDoc = async (
    colName: string,
    targetBranchId: string | null,
    fn: (docs: QueryDocumentSnapshot[]) => Promise<void>
  ) => {
    const colRef = collection(db, colName);
    let lastDoc: QueryDocumentSnapshot | null = null;
    for (;;) {
      let q = query(colRef, where("storeId", "==", storeId), limit(BATCH));
      if (lastDoc) q = query(q, startAfter(lastDoc));
      const snap = await getDocs(q);
      if (snap.empty) break;
      const rows = targetBranchId ? snap.docs.filter((d) => d.data().branchId === targetBranchId) : snap.docs;
      if (rows.length > 0) await fn(rows);
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < BATCH) break;
    }
  };

  const countTarget = async (t: WipeTarget): Promise<number> => {
    if (branchFilter && !t.hasBranchId) return 0;
    let total = 0;
    for (const col of t.collections) {
      await forEachDoc(col, branchFilter, async (rows) => { total += rows.length; });
    }
    return total;
  };

  const previewCounts = async () => {
    if (!storeId) { toast.error("Select a store first."); return; }
    if (selectedTargets.length === 0) { toast.error("Select at least one data type to wipe."); return; }
    if (branchFilter && !branchFilter.trim()) { toast.error("Select a branch."); return; }
    setCounting(true);
    setCounts({});
    try {
      for (const t of selectedTargets) {
        if (!branchFilter || t.hasBranchId) {
          setCounts((prev) => ({ ...prev, [t.id]: null }));
          const n = await countTarget(t);
          setCounts((prev) => ({ ...prev, [t.id]: n }));
        } else {
          setCounts((prev) => ({ ...prev, [t.id]: 0 }));
        }
      }
      toast.success("Preview counts refreshed.");
    } catch (err) {
      console.error("Count failed:", err);
      toast.error("Failed to count some collections.");
    } finally {
      setCounting(false);
    }
  };

  const wipeTarget = async (t: WipeTarget): Promise<number> => {
    if (branchFilter && !t.hasBranchId) return 0;
    let deleted = 0;
    for (const col of t.collections) {
      await forEachDoc(col, branchFilter, async (rows) => {
        const batch = writeBatch(db);
        rows.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deleted += rows.length;
        setProgress((prev) => ({ ...prev, [t.id]: `Deleting… ${deleted.toLocaleString()} deleted` }));
      });
    }
    return deleted;
  };

  const handleWipe = async () => {
    if (!user) { toast.error("Not authenticated."); return; }
    if (!storeId || !storeName) { toast.error("Select a store first."); return; }
    if (selectedTargets.length === 0) { toast.error("Select at least one data type to wipe."); return; }
    if (branchFilter && !branchFilter.trim()) { toast.error("Select a branch."); return; }
    if (typedName.trim().toLowerCase() !== storeName.trim().toLowerCase()) {
      toast.error("Store name does not match. Type the store's exact name to confirm.");
      return;
    }
    if (!password) { toast.error("Enter your password to confirm."); return; }
    if (!user.email) { toast.error("Re-authentication requires an account with email/password sign-in."); return; }

    setWiping(true);
    setProgress({});
    setDone({});
    try {
      // Confirm identity with the admin's password (prevents accidental wipes).
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser!, cred);

      let grandTotal = 0;
      const failures: string[] = [];
      for (const t of selectedTargets) {
        try {
          const n = await wipeTarget(t);
          setDone((prev) => ({ ...prev, [t.id]: n }));
          grandTotal += n;
        } catch (err) {
          console.error(`Wipe failed for ${t.label}:`, err);
          failures.push(t.label);
        }
      }
      if (failures.length > 0) {
        toast.warning(`Wipe finished but these could not be cleared: ${failures.join(", ")}. Check your rules/permissions.`);
      } else {
        toast.success(`Data wipe complete — ${grandTotal.toLocaleString()} document(s) deleted.`);
      }
      setCounts({});
      setPassword("");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Incorrect password. Re-authentication failed.");
      } else {
        console.error("Wipe failed:", err);
        toast.error(`Wipe failed: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    } finally {
      setWiping(false);
    }
  };

  const allEnabled = !wiping && storeId && selectedTargets.length > 0 && (!branchFilter || branchId) &&
    typedName.trim().toLowerCase() === storeName.trim().toLowerCase() && password.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-sans flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-destructive" /> Data Wipe
        </h1>
        <p className="text-sm text-muted-foreground">
          Permanently delete business data for a store. Choose what to delete and whether to wipe the entire store or a single branch. This cannot be undone.
        </p>
      </div>

      <Card className="shadow-none border border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" /> 1 · Target store
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Store</Label>
            <Select value={storeId} onValueChange={onSelectStore}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Select a store…" />
              </SelectTrigger>
              <SelectContent>
                {storesLoading ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Loading…</div>
                ) : stores.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Load stores to continue</div>
                ) : (
                  stores.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={loadStores}>
            <RefreshCw className="h-3 w-3" /> Load stores
          </Button>

          <div className="space-y-1.5">
            <Label className="text-xs">Scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => { setScope(v as "store" | "branch"); setCounts({}); setDone({}); }} className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <RadioGroupItem value="store" id="scope-store" />
                <Label htmlFor="scope-store" className="text-xs font-normal cursor-pointer">
                  Entire store <span className="text-muted-foreground">(all branches + store-wide)</span>
                </Label>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <RadioGroupItem value="branch" id="scope-branch" />
                <Label htmlFor="scope-branch" className="text-xs font-normal cursor-pointer">
                  Single branch
                </Label>
              </div>
            </RadioGroup>
          </div>

          {scope === "branch" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={(v) => { setBranchId(v); setCounts({}); setDone({}); }}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder={branchesLoading ? "Loading branches…" : "Select a branch…"} />
                </SelectTrigger>
                <SelectContent>
                  {branches.length === 0 && !branchesLoading && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">No branches found for this store</div>
                  )}
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none border border-destructive/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> 2 · What to delete
            </CardTitle>
            <CardDescription className="text-xs">
              Store accounts (users, staff, the store itself) are never deleted.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={previewCounts} disabled={counting || !storeId}>
            <RefreshCw className={counting ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            {counting ? "Counting…" : "Preview counts"}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WIPE_TARGETS.map((t) => {
            const skipped = !!(branchFilter && !t.hasBranchId);
            const count = counts[t.id];
            return (
              <label
                key={t.id}
                className={`flex items-start gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer transition-colors hover:bg-muted/30 ${skipped ? "opacity-50" : ""}`}
              >
                <Checkbox
                  checked={selected.has(t.id)}
                  onCheckedChange={() => toggleTarget(t.id)}
                  disabled={skipped}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">{t.label}</p>
                    {count !== undefined && (
                      <Badge variant={count !== null && count > 0 ? "destructive" : "outline"} className="text-[10px] h-4 py-0 font-mono">
                        {count === null ? "…" : count.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {skipped ? "Store-wide only — not available for branch scope." : t.description}
                  </p>
                </div>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-none border border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> 3 · Confirm & wipe
          </CardTitle>
          <CardDescription className="text-xs">
            This permanently deletes the selected data and cannot be undone. Consider running a database backup from the{" "}
            <Link to="/system-admin/operations" className="underline text-destructive hover:opacity-80">Operations page</Link>{" "}
            first. Type the store's exact name and your password to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Type store name <span className="font-mono text-muted-foreground">({storeName || "—"})</span>
              </Label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={storeName || "Type the store name"}
                className="h-9 text-xs font-mono"
              />
              {storeName && (
                <p className="text-[10px] text-muted-foreground">
                  {typedName.trim().toLowerCase() === storeName.trim().toLowerCase()
                    ? "✓ Name matches"
                    : "Name does not match yet"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> Your password
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Re-authenticate with your password"
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Used only to confirm this action, then discarded.</p>
            </div>
          </div>

          {Object.keys(progress).length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
              {Object.entries(progress).map(([id, msg]) => (
                <p key={id} className="text-[11px] font-mono text-muted-foreground">
                  {WIPE_TARGETS.find((t) => t.id === id)?.label}: {msg}
                </p>
              ))}
            </div>
          )}

          {Object.keys(done).length > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
              {Object.entries(done).map(([id, n]) => (
                <p key={id} className="text-[11px] font-mono text-emerald-600">
                  {WIPE_TARGETS.find((t) => t.id === id)?.label}: {n.toLocaleString()} deleted
                </p>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-destructive/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>
              Target: <span className="font-semibold text-foreground">{storeName || "no store"}</span>
              {scope === "branch" && branchId && (
                <span> · branch: <span className="font-semibold text-foreground">{branches.find((b) => b.id === branchId)?.name || branchId}</span></span>
              )}
              · {selectedTargets.length} data type(s)
            </span>
          </div>
          <Button
            variant="destructive"
            className="gap-2 font-bold"
            disabled={!allEnabled}
            onClick={handleWipe}
          >
            {wiping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {wiping ? "Wiping data…" : "Wipe selected data"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
