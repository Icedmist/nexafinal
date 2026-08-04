import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Minus, Trash2, FileDown, Save, Search, User, Phone, Users,
  Wallet, AlertTriangle, Printer, Copy, FileText, ShoppingCart, X, CheckCircle2, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useItems } from "@/hooks/useInventoryData";
import { useCustomerBalance, useSales, useDebtPayments, useImportedDebts, useSalesMutations } from "@/hooks/useSalesData";
import { useSalesForms, useSalesFormMutations, nextFormNumber } from "@/hooks/useSalesForms";
import { useStoreBranches } from "@/hooks/useStaffData";
import { useEffectiveBranch } from "@/hooks/useEffectiveBranch";
import { getSaleOutstanding } from "@/lib/credit-sale";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useRole } from "@/hooks/useRole";
import type { Item, SaleLineItem, SalesForm, FormTransactionType, SaleTransaction } from "@/types/inventory";

const NAIRA = "₦";
const PAGE_SIZE = 50;

const FORM_TYPES: { id: FormTransactionType; label: string; hint: string }[] = [
  { id: "receipt", label: "Receipt", hint: "Proof of payment issued to a customer" },
  { id: "proforma", label: "Proforma Invoice", hint: "Quotation before goods are delivered" },
  { id: "delivery_note", label: "Delivery Note", hint: "Goods handed over with the order" },
  { id: "credit_note", label: "Credit Note", hint: "Amount owed back to the customer" },
];

interface FormRow {
  key: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPriceNgn: number;
}

interface CustomerBalanceInfo {
  credit: number;
  debit: number;
}

function toRows(form: SalesForm | null, fallback: FormRow[]): FormRow[] {
  if (!form || form.items.length === 0) return fallback;
  return form.items.map((li) => ({
    key: `${li.itemId}-${li.sku}-${Date.now()}-${Math.random()}`,
    itemId: li.itemId,
    itemName: li.itemName,
    sku: li.sku,
    quantity: li.quantity,
    unitPriceNgn: li.unitPriceNgn,
  }));
}

/** Stable "clean" signature of a saved form, used to detect unsaved edits. */
const signatureFrom = (form: SalesForm | null, defaultTaxRate: number) =>
  JSON.stringify({
    formType: form?.formType ?? "receipt",
    customerName: form?.customerName ?? "",
    customerPhone: form?.customerPhone ?? "",
    customerEmail: form?.customerEmail ?? "",
    notes: form?.notes ?? "",
    discount: form?.discountAmountNgn ? String(form.discountAmountNgn) : "",
    taxRate: form?.taxRate !== undefined ? String(form.taxRate) : String(defaultTaxRate ?? 0),
    status: form?.status ?? "draft",
    total: form?.totalNgn ?? 0,
    rows: (form?.items || []).map((li) => [li.itemId, li.itemName, li.sku, li.quantity, li.unitPriceNgn]),
  });

export function SalesFormBuilder({
  editingForm,
  onSaved,
  onExit,
}: {
  editingForm: SalesForm | null;
  onSaved: (form: SalesForm) => void;
  onExit: () => void;
}) {
  const { data: items } = useItems();
  const { profile } = useBusiness();
  const { user } = useAuth();
  const { isAdmin, isManager } = useRole();
  const businessType = profile?.businessType || "retail";
  const { data: branches } = useStoreBranches();
  const { effectiveBranchId } = useEffectiveBranch();

  const branchNameFor = (branchId?: string | null) =>
    branchId && branchId !== "none"
      ? (branches.find((b) => b.id === branchId)?.name || "Main Branch")
      : "Admin";

  const { data: forms } = useSalesForms();
  const { saveForm, updateForm, logFormActivity } = useSalesFormMutations();
  const { addSale, adjustCustomerCredit } = useSalesMutations();

  const [formType, setFormType] = useState<FormTransactionType>(editingForm?.formType ?? "receipt");
  const [customerName, setCustomerName] = useState(editingForm?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(editingForm?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(editingForm?.customerEmail ?? "");
  const [notes, setNotes] = useState(editingForm?.notes ?? "");
  const [discount, setDiscount] = useState<string>(editingForm?.discountAmountNgn ? String(editingForm.discountAmountNgn) : "");
  const [taxRate, setTaxRate] = useState<string>(
    editingForm?.taxRate !== undefined ? String(editingForm.taxRate) : String(profile?.storeDetails?.taxRate ?? 0)
  );
  const [status, setStatus] = useState<"draft" | "finalized">(editingForm?.status ?? "draft");
  const [rows, setRows] = useState<FormRow[]>(() => toRows(editingForm, []));
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  // Optional manual override for the final total (e.g. rounding, a set price).
  const [totalOverride, setTotalOverride] = useState<string | null>(null);
  // Payment capture at finalize time (not persisted to the form, only to the sale).
  const [paymentMethod, setPaymentMethod] = useState<NonNullable<SaleTransaction["paymentMethod"]>>("cash");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [isPriceEditingLocked] = useState(profile?.settings?.lockPriceAtCheckout ?? profile?.storeDetails?.lockPriceAtCheckout ?? true);
  const canEditPrice = !isPriceEditingLocked || isAdmin || isManager;
  const isFinalized = status === "finalized";

  // The form currently being edited (allows switching between saved forms).
  const [activeForm, setActiveForm] = useState<SalesForm | null>(editingForm);

  const defaultTaxRate = profile?.storeDetails?.taxRate ?? 0;

  const subtotal = useMemo(() => rows.reduce((s, r) => s + (r.unitPriceNgn || 0) * (r.quantity || 0), 0), [rows]);
  const discountAmount = useMemo(() => {
    const amt = parseFloat(discount) || 0;
    return Math.min(Math.max(0, amt), subtotal);
  }, [discount, subtotal]);
  const taxRateNum = useMemo(() => {
    const parsed = parseFloat(taxRate);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [taxRate]);
  const taxAmount = (subtotal - discountAmount) * (taxRateNum / 100);
  const total = subtotal - discountAmount + taxAmount;
  // Manual total override (the cashier can set the printed total directly).
  const effectiveTotal = (() => {
    if (totalOverride !== null) {
      const n = parseFloat(totalOverride);
      if (!isNaN(n) && n >= 0) return n;
    }
    return total;
  })();

  // Payment helpers. Cash change is never handed back — an overpayment against a
  // known customer is parked into their store credit, matching the POS checkout.
  // "Overpay" is measured against the COMPUTED total so that extra money which
  // actually pays down an override-created debt is never parked as credit.
  const received = (() => {
    const n = parseFloat(amountReceived);
    if (!isNaN(n) && n >= 0) return n;
    return 0;
  })();
  const cashierOverallPaid = received > 0 ? received : 0;
  const overpayToCredit = customerPhone.trim() && cashierOverallPaid > total ? cashierOverallPaid - total : 0;
  const cashChange = Math.max(0, cashierOverallPaid - effectiveTotal);

  const currentSignature = (statusOverride?: "draft" | "finalized") =>
    JSON.stringify({
      formType,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      discount,
      taxRate,
      status: statusOverride ?? status,
      total: effectiveTotal,
      rows: rows.map((r) => [r.itemId, r.itemName, r.sku, r.quantity, r.unitPriceNgn]),
    });
  const savedSignatureRef = useRef<string>(signatureFrom(editingForm, defaultTaxRate));
  const dirty = currentSignature() !== savedSignatureRef.current;

  // Live per-row product autocomplete
  const [rowSearch, setRowSearch] = useState<Record<string, string>>({});
  const [openSuggestions, setOpenSuggestions] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  // The suggestions render through a portal (the table sits inside overflow
  // containers that would otherwise clip the dropdown), so we track the input's
  // position in the viewport and follow it while scrolling.
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Existing-customer recognition in the customer fields
  const [customerOpen, setCustomerOpen] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  const { balance: customerCredit } = useCustomerBalance(customerPhone?.trim() || null);
  const { data: sales = [] } = useSales();
  const { data: payments = [] } = useDebtPayments();
  const { data: importedDebts = [] } = useImportedDebts();

  const customerBalanceInfo: CustomerBalanceInfo = useMemo(() => {
    const qPhone = customerPhone.trim();
    const debit = (() => {
      if (!qPhone || qPhone.length < 8) return 0;
      const creditSales = sales
        .filter((s) => s.isCreditSale && s.customerPhone === qPhone)
        .reduce((sum, s) => sum + getSaleOutstanding(s), 0);
      const cleared = payments
        .filter((p) => p.customerPhone === qPhone)
        .reduce((sum, p) => sum + p.amountNgn, 0);
      return Math.max(0, creditSales - cleared);
    })();
    return { credit: customerCredit, debit };
  }, [customerPhone, customerCredit, sales, payments]);

  // Every known customer (from sales, debt payments, and imported debtors),
  // keyed by phone so a returning customer is recognised when typing a name.
  const customersList = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; email?: string; createdAt?: string }>();
    const add = (phone: string | null | undefined, name: string | null | undefined, email?: string | null | undefined, createdAt?: string) => {
      const p = phone?.trim();
      if (!p) return;
      const n = name?.trim() || "Customer";
      const existing = map.get(p);
      if (!existing || (createdAt && (!existing.createdAt || createdAt > existing.createdAt))) {
        map.set(p, { name: n, phone: p, email: email || undefined, createdAt });
      }
    };
    for (const s of sales) add(s.customerPhone, s.customerName, s.customerEmail, s.createdAt);
    for (const p of payments) add(p.customerPhone, p.customerName, undefined, p.createdAt);
    for (const d of importedDebts) add(d.customerPhone, d.customerName, undefined, d.createdAt);
    return Array.from(map.values());
  }, [sales, payments, importedDebts]);

  const customerSuggestions = useMemo(() => {
    const qPhone = customerPhone.trim().toLowerCase();
    const qName = customerName.trim().toLowerCase();
    if (!qPhone && !qName) return [];
    const exact = customersList.find(
      (c) => c.phone === customerPhone.trim() && c.name === customerName.trim()
    );
    return customersList
      .filter((c) => {
        const matchPhone = qPhone && c.phone.toLowerCase().includes(qPhone);
        const matchName = qName && c.name.toLowerCase().includes(qName);
        return (matchPhone || matchName) && c !== exact;
      })
      .slice(0, 8);
  }, [customersList, customerPhone, customerName]);

  const handleCustomerPick = (c: { name: string; phone: string; email?: string }) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerEmail(c.email || "");
    setCustomerOpen(false);
  };

  const handleCustomerPhoneInput = (value: string) => {
    setCustomerPhone(value);
    const match = value.trim().length >= 8 ? customersList.find((c) => c.phone === value.trim()) : undefined;
    if (match) {
      setCustomerName(match.name);
      setCustomerEmail(match.email || "");
    }
    setCustomerOpen(true);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: `row-${Date.now()}-${Math.random()}`,
        itemId: "",
        itemName: "",
        sku: "",
        quantity: 1,
        unitPriceNgn: 0,
      },
    ]);
    setPage(Math.floor(rows.length / PAGE_SIZE));
  };

  const removeRow = (key: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      const maxPage = Math.max(0, Math.floor((next.length - 1) / PAGE_SIZE));
      if (page > maxPage) setPage(maxPage);
      return next;
    });
  };

  const updateRow = (key: string, patch: Partial<FormRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const pickItem = (key: string, item: Item) => {
    updateRow(key, {
      itemId: item.id,
      itemName: item.name,
      sku: item.sku || "",
      unitPriceNgn: item.sellingPrice || 0,
    });
    setOpenSuggestions(null);
    setRowSearch((prev) => ({ ...prev, [key]: "" }));
  };

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const suggestionsFor = (key: string): Item[] => {
    const q = (rowSearch[key] || "").trim().toLowerCase();
    if (!q) return [];
    return (items || [])
      .filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku && i.sku.toLowerCase().includes(q)) ||
        (i.barcode && i.barcode.toLowerCase().includes(q))
      )
      .slice(0, 8);
  };

  const openSuggs = openSuggestions ? suggestionsFor(openSuggestions) : [];

  // Close suggestions when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const inSearch = searchRef.current && searchRef.current.contains(e.target as Node);
      const inSuggestions = suggestionListRef.current && suggestionListRef.current.contains(e.target as Node);
      if (!inSearch && !inSuggestions) {
        setOpenSuggestions(null);
      }
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setCustomerOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Track the active row's input position so the portal dropdown follows it.
  useEffect(() => {
    if (!openSuggestions) {
      setSuggestionPos(null);
      return;
    }
    const update = () => {
      const el = searchRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSuggestionPos({ top: rect.bottom, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [openSuggestions]);

  const validate = (): string | null => {
    if (rows.length === 0) return "Add at least one line item.";
    for (const r of rows) {
      if (!r.itemName.trim()) return "Every line needs a product name.";
      if (!(r.quantity > 0)) return "Every line needs a quantity greater than zero.";
      if (!(r.unitPriceNgn >= 0)) return "Every line needs a valid unit price.";
    }
    if (customerPhone && customerPhone.trim().length < 8) return "Enter a valid customer phone number.";
    return null;
  };

  const buildBase = (formNumber: string, formStatus: "draft" | "finalized" = status) => {
    const itemsList: SaleLineItem[] = rows.map((r) => ({
      itemId: r.itemId,
      itemName: r.itemName,
      sku: r.sku,
      quantity: r.quantity,
      unitPriceNgn: r.unitPriceNgn,
    }));
    return {
      formNumber,
      formType,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      items: itemsList,
      subtotalNgn: subtotal,
      discountAmountNgn: discountAmount > 0 ? discountAmount : undefined,
      taxRate: taxRateNum > 0 ? taxRateNum : undefined,
      taxAmountNgn: taxAmount > 0 ? taxAmount : undefined,
      totalNgn: effectiveTotal,
      notes: notes.trim() || undefined,
      status: formStatus,
    };
  };

  /** Persist the current form (create if `target` is null, else update in place). */
  const persist = async (
    target: SalesForm | null,
    formStatus: "draft" | "finalized" = status
  ): Promise<SalesForm | null> => {
    const err = validate();
    if (err) {
      toast.error(err);
      return null;
    }
    setSaving(true);
    try {
      let saved: SalesForm;
      if (target) {
        const base = buildBase(target.formNumber, formStatus);
        await updateForm(target.id, base);
        saved = { ...target, ...base, updatedAt: new Date().toISOString() };
      } else {
        const base = buildBase(nextFormNumber(forms, formType), formStatus);
        saved = await saveForm(base as Omit<SalesForm, "id" | "storeId" | "branchId" | "recordedBy" | "recordedByName" | "createdAt" | "updatedAt">);
      }
      await logFormActivity(target ? "updated" : "created", saved);
      savedSignatureRef.current = currentSignature(formStatus);
      return saved;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save form");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const loadForm = useCallback((form: SalesForm | null) => {
    setActiveForm(form);
    setFormType(form?.formType ?? "receipt");
    setCustomerName(form?.customerName ?? "");
    setCustomerPhone(form?.customerPhone ?? "");
    setCustomerEmail(form?.customerEmail ?? "");
    setNotes(form?.notes ?? "");
    setDiscount(form?.discountAmountNgn ? String(form.discountAmountNgn) : "");
    setTaxRate(form?.taxRate !== undefined ? String(form.taxRate) : String(defaultTaxRate));
    setStatus(form?.status ?? "draft");
    setRows(toRows(form, []));
    setTotalOverride(null);
    setAmountReceived("");
    setPaymentMethod("cash");
    setPage(0);
    setRowSearch({});
    setOpenSuggestions(null);
    setCustomerOpen(false);
    savedSignatureRef.current = signatureFrom(form, defaultTaxRate);
  }, [defaultTaxRate]);

  const handleSwitchForm = async (form: SalesForm | null) => {
    if (form?.id === activeForm?.id) return;
    if (dirty) {
      const shouldSave = activeForm
        ? window.confirm(`Save changes to ${activeForm.formNumber} before switching?`)
        : window.confirm("This form has unsaved changes. Discard them and switch?");
      if (!shouldSave) return;
      if (activeForm) {
        const saved = await persist(activeForm);
        if (!saved) return;
        toast.success(`Draft ${saved.formNumber} saved`);
      }
    }
    loadForm(form);
  };

  /** Build a `sales` document from a finalized form (records + deducts stock).
   *  A manual total/price override below the computed total is recorded as
   *  customer debt (credit sale); the discount stays a discount. An explicit
   *  "amount received" that is less than the total also leaves the remainder
   *  as customer debt; an overpayment is never returned as cash change for a
   *  known customer (the surplus is parked into their store credit instead). */
  const buildSaleFromForm = (
    form: SalesForm,
    payment: { method: NonNullable<SaleTransaction["paymentMethod"]>; received: number }
  ): Omit<SaleTransaction, "id"> => {
    const fullTotal = (form.subtotalNgn ?? 0) - (form.discountAmountNgn ?? 0) + (form.taxAmountNgn ?? 0);
    // `charged` is the printed total on the form. A manual override below the
    // computed total records the difference as customer debt automatically.
    const charged = form.totalNgn ?? fullTotal;
    const hasCustomer = !!form.customerPhone?.trim();
    const received = payment.received > 0 ? payment.received : charged;
    const paid = Math.min(received, fullTotal);
    const debt = hasCustomer ? Math.max(0, fullTotal - received) : 0;
    return {
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      items: form.items,
      totalNgn: debt > 0 ? fullTotal : charged,
      subtotalNgn: form.subtotalNgn,
      discountAmountNgn: form.discountAmountNgn,
      taxAmountNgn: form.taxAmountNgn,
      taxRate: form.taxRate,
      amountPaidNgn: paid,
      changeGivenNgn: hasCustomer ? 0 : Math.max(0, received - charged),
      remainingBalanceNgn: debt,
      paymentStatus: debt > 0 ? "incomplete" : "paid",
      paymentMethod: payment.method,
      isCreditSale: debt > 0,
      saleType: "retail",
      status: "completed",
      createdAt: new Date().toISOString(),
    };
  };

  const handleSave = async (finalize: boolean) => {
    if (finalize && rows.some((r) => !r.itemId?.trim())) {
      toast.error("Every line item must be selected from the catalog to finalize — stock is deducted from catalog products.");
      return;
    }
    const nextStatus = finalize ? "finalized" : status;
    const saved = await persist(activeForm, nextStatus);
    if (!saved) return;
    setStatus(nextStatus);
    if (finalize) {
      if (saved.saleId) {
        toast.info(`Form ${saved.formNumber} is already finalized and recorded.`);
        onSaved(saved);
        return;
      }
      try {
        const isReturn = saved.formType === "credit_note";
        // Credit notes are customer returns — they restock the catalog instead
        // of recording a paid sale. Proforma/delivery notes still record a sale.
        const salePayload = buildSaleFromForm(saved, {
          method: paymentMethod,
          received: cashierOverallPaid,
        });
        if (isReturn) salePayload.saleType = "return";
        const saleRef = await addSale(salePayload, { restock: isReturn });
        const saleId = saleRef?.id;
        if (saleId) {
          await updateForm(saved.id, { saleId });
          saved.saleId = saleId;
        }
        const overrideDebt = (salePayload.isCreditSale && (salePayload.remainingBalanceNgn ?? 0) > 0)
          ? (salePayload.remainingBalanceNgn ?? 0)
          : 0;
        // Park an overpayment into a known customer's store credit (no cash change).
        if (!isReturn && overpayToCredit > 0 && customerPhone.trim()) {
          await adjustCustomerCredit({
            customerPhone,
            customerName: saved.customerName || "Customer",
            deltaNgn: overpayToCredit,
            type: "overpay_credit",
            method: "overpay",
            saleId,
            notes: `Overpayment parked to credit from form ${saved.formNumber}`,
          });
        }
        if (isReturn) {
          toast.success(`Credit note ${saved.formNumber} finalized — ${NAIRA}${(saved.totalNgn ?? 0).toLocaleString("en-NG")} recorded & returned to catalog stock`);
        } else if (overrideDebt > 0) {
          toast.success(`Form ${saved.formNumber} finalized — ${NAIRA}${overrideDebt.toLocaleString("en-NG")} recorded as ${saved.customerName || "customer"}'s debt`);
        } else {
          toast.success(`Form ${saved.formNumber} finalized — recorded as sale & stock deducted`);
        }
      } catch (err) {
        toast.error(`Form saved as finalized, but recording the sale failed: ${err instanceof Error ? err.message : "unknown error"}`);
      }
      await renderPdf({
        formNumber: saved.formNumber,
        formType: saved.formType,
        customerName: saved.customerName,
        customerPhone: saved.customerPhone,
        customerEmail: saved.customerEmail,
        items: toRows(saved, []),
        subtotal: saved.subtotalNgn ?? 0,
        discount: saved.discountAmountNgn ?? 0,
        taxRate: saved.taxRate ?? 0,
        taxAmount: saved.taxAmountNgn ?? 0,
        total: saved.totalNgn ?? 0,
        paymentMethod,
        notes: saved.notes,
        status: "finalized",
        createdAt: saved.createdAt,
        balanceCredit: customerBalanceInfo.credit,
        balanceDebit: customerBalanceInfo.debit,
        branchName: branchNameFor(saved.branchId),
        recordedByName: saved.recordedByName || user?.displayName || user?.email?.split("@")[0] || "Staff",
      });
      toast.success("Receipt PDF downloaded");
      onSaved(saved);
    } else {
      setActiveForm(saved);
      toast.success(`Draft ${saved.formNumber} saved`);
    }
  };

  const renderPdf = async (src: {
    formNumber: string;
    formType: FormTransactionType;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    items: FormRow[];
    subtotal: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    paymentMethod?: NonNullable<SaleTransaction["paymentMethod"]>;
    notes?: string;
    status: "draft" | "finalized";
    createdAt?: string;
    balanceCredit?: number;
    balanceDebit?: number;
    branchName?: string;
    recordedByName?: string;
  }) => {
    const formType = src.formType;
    const customerName = src.customerName || "";
    const customerPhone = src.customerPhone || "";
    const customerEmail = src.customerEmail || "";
    const notes = src.notes || "";
    const taxRateNum = src.taxRate;
    const status = src.status;
    const rows = src.items;
    const subtotal = src.subtotal;
    const discountAmount = src.discount;
    const taxAmount = src.taxAmount;
    const effectiveTotal = src.total;
    const paymentMethodLabel = src.paymentMethod
      ? ({ cash: "Cash", transfer: "Transfer", card: "Card" } as const)[src.paymentMethod]
      : null;
    const customerBalanceInfo = { credit: src.balanceCredit || 0, debit: src.balanceDebit || 0 };
    const formNumber = src.formNumber;
    const branchName = src.branchName || "";
    const recordedByName = src.recordedByName || "";
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = w - margin * 2;
    let y = 18;

    const storeName = profile?.storeDetails?.name || "My Store";
    const storePhone = profile?.storeDetails?.phone || "";
    const storeAddress = profile?.storeDetails?.address || "";
    const taxLabel = taxRateNum > 0 ? `VAT ${taxRateNum}%` : "No VAT";

    const typeLabel = FORM_TYPES.find((t) => t.id === formType)?.label || "Form";
    const completed = status === "finalized";
    const statusLabel = completed ? "COMPLETED" : "DRAFT";

    // Header
    doc.setFillColor(13, 27, 42);
    doc.rect(0, 0, w, 30, "F");
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(storeName, margin, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text([branchName ? `Branch: ${branchName}` : "", storePhone, storeAddress].filter(Boolean).join("  •  "), margin, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(typeLabel.toUpperCase(), margin, 26);

    // Form meta on the right
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255);
    doc.text(`# ${formNumber}`, w - margin, 12, { align: "right" });
    doc.text((src.createdAt ? new Date(src.createdAt) : new Date()).toLocaleDateString("en-NG"), w - margin, 18, { align: "right" });
    doc.text(`Type: ${typeLabel} • ${statusLabel}`, w - margin, 26, { align: "right" });

    // Status banner
    doc.setFillColor(completed ? 6 : 180, completed ? 150 : 140, completed ? 84 : 30);
    doc.rect(margin, 31.5, contentWidth, 6, "F");
    doc.setTextColor(255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(completed ? "TRANSACTION COMPLETED" : "DRAFT — NOT YET COMPLETED", w / 2, 36, { align: "center" });
    doc.setTextColor(20);

    y = 43;

    // Customer block
    doc.setTextColor(20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO / CUSTOMER", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (customerName.trim() || customerPhone.trim()) {
      doc.text(customerName.trim() || "—", margin, y);
      y += 5;
      if (customerPhone.trim()) {
        doc.text(`Phone: ${customerPhone.trim()}`, margin, y);
        y += 5;
      }
      if (customerEmail.trim()) {
        doc.text(`Email: ${customerEmail.trim()}`, margin, y);
        y += 5;
      }
      doc.text(`Credit: ${NAIRA}${customerBalanceInfo.credit.toLocaleString()}   Debit: ${NAIRA}${customerBalanceInfo.debit.toLocaleString()}`, margin, y);
      y += 5;
    } else {
      doc.text("Walk-in / No customer recorded", margin, y);
      y += 5;
    }
    y += 4;

    // Items table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("#", margin + 2, y + 4.5);
    doc.text("ITEM", margin + 10, y + 4.5);
    doc.text("QTY", margin + contentWidth - 52, y + 4.5);
    doc.text("UNIT", margin + contentWidth - 34, y + 4.5);
    doc.text("AMOUNT", margin + contentWidth - 8, y + 4.5, { align: "right" });
    y += 9;

    doc.setFont("helvetica", "normal");
    rows.forEach((r, idx) => {
      if (y > 265) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(8.5);
      doc.text(String(idx + 1), margin + 2, y);
      doc.text(r.itemName.slice(0, 42), margin + 10, y);
      doc.text(String(r.quantity), margin + contentWidth - 52, y);
      doc.text(NAIRA + r.unitPriceNgn.toLocaleString("en-NG"), margin + contentWidth - 34, y);
      doc.text(NAIRA + (r.unitPriceNgn * r.quantity).toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
      y += 6;
    });

    y += 4;

    // Totals
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", margin + contentWidth - 60, y);
    doc.text(NAIRA + subtotal.toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
    y += 5;
    if (discountAmount > 0) {
      doc.text("Discount", margin + contentWidth - 60, y);
      doc.text("-" + NAIRA + discountAmount.toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
      y += 5;
    }
    if (taxRateNum > 0) {
      doc.text(`VAT (${taxRateNum}%)`, margin + contentWidth - 60, y);
      doc.text("+" + NAIRA + taxAmount.toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
      y += 5;
    }
    doc.setDrawColor(20);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL", margin + contentWidth - 60, y);
    doc.text(NAIRA + effectiveTotal.toLocaleString("en-NG"), margin + contentWidth - 8, y, { align: "right" });
    y += 6;
    if (paymentMethodLabel && !customerBalanceInfo.debit) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(`Method: ${paymentMethodLabel}`, margin + contentWidth - 60, y);
    }
    y += 2;

    if (notes.trim()) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text(`Notes: ${notes.trim()}`, margin, y);
      y += 5;
    }

    // Footer
    y = 276;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(
      `Generated by NEXA Store OS  •  ${storeName}  •  ${new Date().toLocaleString("en-NG")}  •  Transaction type: ${typeLabel}`,
      w / 2,
      y,
      { align: "center" }
    );
    doc.text(
      `Status: ${statusLabel}  •  Recorded by: ${recordedByName || user?.displayName || user?.email?.split("@")[0] || "Staff"}  •  Branch: ${branchName || "—"}  •  ${typeLabel.toLowerCase()} document. Thank you!`,
      w / 2,
      y + 4,
      { align: "center" }
    );

    doc.save(`${formNumber}-${formType.toUpperCase()}.pdf`);
  };

  const handleDownloadPdf = async () => {
    if (status !== "finalized") {
      toast.error("Only finalized receipts can be printed. Finalize the form first.");
      return;
    }
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    await renderPdf({
      formNumber: activeForm?.formNumber || nextFormNumber(forms, formType),
      formType,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      items: rows,
      subtotal,
      discount: discountAmount,
      taxRate: taxRateNum,
      taxAmount,
      total: effectiveTotal,
      notes: notes.trim() || undefined,
      status,
      balanceCredit: customerBalanceInfo.credit,
      balanceDebit: customerBalanceInfo.debit,
      branchName: branchNameFor(activeForm?.branchId ?? effectiveBranchId),
      recordedByName: activeForm?.recordedByName || user?.displayName || user?.email?.split("@")[0] || "Staff",
    });
    toast.success("PDF downloaded");
  };

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && openSuggestions) {
      const sugg = suggestionsFor(openSuggestions);
      if (sugg.length > 0) pickItem(openSuggestions, sugg[0]);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header: type + actions */}
      <div className="border-b border-border bg-card px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <FileText className={cn("h-5 w-5", businessType === "restaurant" ? "text-emerald-600" : "text-primary")} />
              {activeForm ? `Editing ${activeForm.formNumber}` : "New Sales Form / Receipt"}
              {status === "finalized" ? (
                <Badge className="gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Draft</Badge>
              )}
              {dirty && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">unsaved</Badge>}
            </h1>
            <p className="text-xs text-muted-foreground">
              Fill a line-item document (no inventory is deducted). Save it as a draft, switch between forms, or export as PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={activeForm?.id ?? "__new__"}
              onValueChange={(v) => handleSwitchForm(v === "__new__" ? null : (forms?.find((f) => f.id === v) ?? null))}
            >
              <SelectTrigger className="h-9 w-56 text-xs">
                <SelectValue placeholder={activeForm ? activeForm.formNumber : "New form"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">+ New form / receipt</SelectItem>
                {forms?.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.formNumber} — {f.customerName || "Walk-in"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onExit} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={status !== "finalized"}
              title={status === "finalized" ? "Download PDF" : "Only finalized receipts can be printed. Finalize the form first."}
              className="gap-1.5"
            >
              <FileDown className="h-3.5 w-3.5" /> Download PDF
            </Button>
            {!isFinalized && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" /> Save Draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className={cn("gap-1.5", businessType === "restaurant" && "bg-emerald-600 hover:bg-emerald-700")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Finalize & Save"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Transaction type selector */}
        <div className="flex flex-wrap gap-2">
          {FORM_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormType(t.id)}
              disabled={isFinalized}
              title={t.hint}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                isFinalized && "cursor-not-allowed opacity-50",
                formType === t.id
                  ? (businessType === "restaurant" ? "border-emerald-600 bg-emerald-500/10 text-emerald-600" : "border-primary bg-primary/10 text-primary")
                  : "border-border text-muted-foreground hover:border-border/70"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {isFinalized && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-xs text-emerald-700">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            This form is completed and locked — it can no longer be edited. You can still download the PDF receipt.
          </div>
        )}
        {/* Customer details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Customer Details</h3>
            </div>
            <div ref={customerRef} className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setCustomerOpen(true);
                      }}
                      onFocus={() => {
                        if (customerName.trim() || customerPhone.trim()) setCustomerOpen(true);
                      }}
                      disabled={isFinalized}
                      placeholder="e.g. Chidi Okonkwo"
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerPhone}
                      onChange={(e) => handleCustomerPhoneInput(e.target.value)}
                      onFocus={() => {
                        if (customerName.trim() || customerPhone.trim()) setCustomerOpen(true);
                      }}
                      disabled={isFinalized}
                      placeholder="08012345678"
                      className="pl-9 h-9 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email (optional)</Label>
                  <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} disabled={isFinalized} placeholder="customer@example.com" className="h-9" />
                </div>
              </div>
              {customerOpen && customerSuggestions.length > 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg p-1 max-h-56 overflow-y-auto">
                  <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Returning customers</p>
                  {customerSuggestions.map((c) => (
                    <button
                      key={c.phone}
                      type="button"
                      onClick={() => handleCustomerPick(c)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                    >
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium truncate flex-1">{c.name}</span>
                      <span className="font-mono text-muted-foreground shrink-0">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {customerPhone.trim().length >= 8 && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1 text-emerald-700 bg-emerald-500/10 border-emerald-500/30">
                  <Wallet className="h-3 w-3" /> Credit: {NAIRA}{customerBalanceInfo.credit.toLocaleString("en-NG")}
                </Badge>
                <Badge variant="outline" className={cn("gap-1", customerBalanceInfo.debit > 0 ? "text-destructive bg-destructive/10 border-destructive/30" : "text-muted-foreground")}>
                  <AlertTriangle className="h-3 w-3" /> Debit: {NAIRA}{customerBalanceInfo.debit.toLocaleString("en-NG")}
                </Badge>
              </div>
            )}
          </div>

          {/* Totals summary */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-semibold">{NAIRA}{subtotal.toLocaleString("en-NG")}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Discount ({NAIRA})</Label>
              <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={isFinalized} placeholder="0" className="h-8 font-mono text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">VAT rate (%)</Label>
              <Input type="number" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={isFinalized} placeholder="0" className="h-8 font-mono text-xs" />
            </div>
            <Separator />
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Total ({NAIRA}) — overrides calculation</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={totalOverride !== null ? totalOverride : String(Math.round(effectiveTotal))}
                onChange={(e) => setTotalOverride(e.target.value)}
                disabled={isFinalized}
                placeholder={String(Math.round(effectiveTotal))}
                className="h-9 font-mono text-right font-bold text-sm"
              />
              {totalOverride !== null && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Auto: {NAIRA}{total.toLocaleString("en-NG")}</span>
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" disabled={isFinalized} onClick={() => setTotalOverride(null)}>
                    Reset to auto
                  </Button>
                </div>
              )}
            </div>
            <Separator />
            {formType !== "credit_note" && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground">Payment method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as NonNullable<SaleTransaction["paymentMethod"]>)}
                    disabled={isFinalized}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Amount received ({NAIRA}) — leave empty to charge the full total</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    disabled={isFinalized}
                    placeholder={String(Math.round(effectiveTotal))}
                    className="h-8 font-mono text-xs"
                  />
                  {cashChange > 0 && (
                    <p className="text-[10px] text-emerald-600">
                      Change: {NAIRA}{cashChange.toLocaleString("en-NG")}
                      {customerPhone.trim()
                        ? " → parked to customer store credit"
                        : " (add a customer to park overpayment as store credit)"}
                    </p>
                  )}
                  {received > 0 && received < effectiveTotal && customerPhone.trim() && (
                    <p className="text-[10px] text-amber-600">
                      Balance {NAIRA}{(effectiveTotal - received).toLocaleString("en-NG")} recorded as customer debt
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground italic">
              VAT: +{NAIRA}{taxAmount.toLocaleString("en-NG")} • {rows.length} line item{rows.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Line item grid */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Line Items</h3>
              <Badge variant="secondary" className="font-mono text-[10px]">{rows.length} rows</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={addRow} disabled={isFinalized} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2 min-w-[260px]">Product</th>
                  <th className="px-3 py-2 w-28">Qty</th>
                  <th className="px-3 py-2 w-36">Unit Price ({NAIRA})</th>
                  <th className="px-3 py-2 w-32 text-right">Amount</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-xs text-muted-foreground">
                      No line items yet. Add a product to get started.
                    </td>
                  </tr>
                )}
                {pageRows.map((r, idx) => {
                  const globalIdx = page * PAGE_SIZE + idx;
                  return (
                    <tr key={r.key} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{globalIdx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="relative" ref={r.key === openSuggestions ? searchRef : undefined}>
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            value={rowSearch[r.key]?.trim() ? rowSearch[r.key] : r.itemName}
                            disabled={isFinalized}
                            onChange={(e) => {
                              setRowSearch((prev) => ({ ...prev, [r.key]: e.target.value }));
                              if (r.itemId && e.target.value === r.itemName) return;
                              if (e.target.value !== r.itemName || !r.itemId) {
                                setOpenSuggestions(r.key);
                                if (r.itemId) {
                                  updateRow(r.key, { itemId: "", itemName: e.target.value, sku: "" });
                                }
                              }
                            }}
                            onFocus={() => {
                              if ((rowSearch[r.key] ?? "").trim()) setOpenSuggestions(r.key);
                            }}
                            onKeyDown={handleRowKeyDown}
                            placeholder="Search product by name / SKU…"
                            className="pl-8 h-9 text-xs"
                          />
                          {openSuggestions === r.key && openSuggs.length > 0 && (
                            <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg p-1 max-h-56 overflow-y-auto">
                              {openSuggs.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => pickItem(r.key, s)}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60"
                                >
                                  <span className="font-medium truncate flex-1">{s.name}</span>
                                  <span className="font-mono text-muted-foreground shrink-0">{NAIRA}{s.sellingPrice?.toLocaleString("en-NG")}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7" disabled={isFinalized} onClick={() => updateRow(r.key, { quantity: Math.max(1, (r.quantity || 1) - 1) })}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={r.quantity}
                            disabled={isFinalized}
                            onChange={(e) => updateRow(r.key, { quantity: parseInt(e.target.value, 10) || 0 })}
                            className="h-7 w-14 text-center font-mono text-xs px-1"
                          />
                          <Button variant="outline" size="icon" className="h-7 w-7" disabled={isFinalized} onClick={() => updateRow(r.key, { quantity: (r.quantity || 1) + 1 })}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={r.unitPriceNgn}
                          disabled={!canEditPrice || isFinalized}
                          onChange={(e) => updateRow(r.key, { unitPriceNgn: parseFloat(e.target.value) || 0 })}
                          className="h-7 font-mono text-xs text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-bold">
                        {NAIRA}{((r.unitPriceNgn || 0) * (r.quantity || 0)).toLocaleString("en-NG")}
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={isFinalized} onClick={() => removeRow(r.key)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination for >50 items */}
          {rows.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              <span className="text-xs text-muted-foreground font-mono">
                Page {page + 1} of {pageCount}
              </span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs">Notes (printed on the form)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isFinalized} placeholder="e.g. Payment terms, delivery instructions…" className="h-9" />
        </div>
      </div>

      {/* Product suggestions render through a portal so the overflow containers
          around the line-item table can't clip the dropdown. */}
      {openSuggs.length > 0 && suggestionPos && createPortal(
        <div
          ref={suggestionListRef}
          className="fixed z-50 mt-1 rounded-lg border border-border bg-card shadow-lg p-1 max-h-56 overflow-y-auto"
          style={{ top: suggestionPos.top, left: suggestionPos.left, width: suggestionPos.width }}
        >
          {openSuggs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => (openSuggestions ? pickItem(openSuggestions, s) : undefined)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/60"
            >
              <span className="font-medium truncate flex-1">{s.name}</span>
              <span className="font-mono text-muted-foreground shrink-0">{NAIRA}{s.sellingPrice?.toLocaleString("en-NG")}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
