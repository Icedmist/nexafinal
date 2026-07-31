import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Building2,
  Activity,
  CreditCard,
  Plus,
  Search,
  Filter,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  TrendingUp,
  Coins,
  Layers,
  Settings2,
  Mail,
  Phone,
  Trash2,
  Edit2,
  ArrowUpRight,
  ChevronRight,
  Check,
  Ban
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, updateDoc, addDoc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import type { SubscriptionPlan, SubscriptionEvent, SubscriptionStatus, SubscriptionEventType, FeatureFlags } from "@/types/subscription";
import { DEFAULT_PLANS } from "@/utils/subscriptionUtils";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from "recharts";

export interface AdminStore {
  id: string;
  storeName?: string;
  subscriptionTier?: string;
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  paymentMethodOnFile?: boolean;
  ownerId?: string;
  storePhone?: string;
  dunningContactedAt?: string | null;
  featureFlagsOverride?: Partial<FeatureFlags>;
  [key: string]: unknown;
}

export interface SubscriptionRequest {
  id: string;
  storeId: string;
  storeName: string;
  targetTier: string;
  planName: string;
  amountNgn: number;
  payerName: string;
  payerPhone: string;
  transactionRef: string;
  notes: string;
  bankReference: string;
  status: "pending_verification" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

// Seed data fallback
const MOCK_STORES = [
  { id: "store-1", storeName: "Main Warehouse", subscriptionTier: "starter", subscriptionStatus: "active" as SubscriptionStatus, currentPeriodEnd: "2026-08-12T00:00:00Z", trialEndsAt: null, paymentMethodOnFile: true, ownerId: "user-01", storePhone: "+234 801 234 5678" },
  { id: "store-2", storeName: "Ikeja Branch", subscriptionTier: "professional", subscriptionStatus: "active" as SubscriptionStatus, currentPeriodEnd: "2026-07-20T00:00:00Z", trialEndsAt: null, paymentMethodOnFile: true, ownerId: "user-02", storePhone: "+234 802 345 6789" },
  { id: "store-3", storeName: "Lekki Outlet", subscriptionTier: "enterprise", subscriptionStatus: "active" as SubscriptionStatus, currentPeriodEnd: "2026-08-01T00:00:00Z", trialEndsAt: null, paymentMethodOnFile: true, ownerId: "user-03", storePhone: "+234 803 456 7890" },
  { id: "store-4", storeName: "Abuja Distribution Hub", subscriptionTier: "professional", subscriptionStatus: "past_due" as SubscriptionStatus, currentPeriodEnd: "2026-06-25T00:00:00Z", trialEndsAt: null, paymentMethodOnFile: false, ownerId: "user-07", storePhone: "+234 804 567 8901", dunningContactedAt: "2026-07-01T10:00:00Z" },
  { id: "store-5", storeName: "Kano Retail Store", subscriptionTier: "starter", subscriptionStatus: "cancelled" as SubscriptionStatus, currentPeriodEnd: "2026-05-15T00:00:00Z", trialEndsAt: null, paymentMethodOnFile: false, ownerId: "user-05", storePhone: "+234 805 678 9012" },
  { id: "store-6", storeName: "Enugu Depot", subscriptionTier: "professional", subscriptionStatus: "trialing" as SubscriptionStatus, currentPeriodEnd: "2026-07-25T00:00:00Z", trialEndsAt: "2026-07-25T00:00:00Z", paymentMethodOnFile: false, ownerId: "user-04", storePhone: "+234 806 789 0123" },
];

const MOCK_EVENTS: SubscriptionEvent[] = [
  { id: "evt-1", storeId: "store-1", eventType: "upgrade", fromPlan: "starter", toPlan: "starter", actorId: "nexatechnologies.dev@gmail.com", timestamp: "2026-06-12T10:00:00Z", reason: "Initial setup" },
  { id: "evt-2", storeId: "store-4", eventType: "failed_payment", fromPlan: "professional", toPlan: "professional", actorId: "system", timestamp: "2026-06-25T02:00:00Z", reason: "Card declined by gate" },
  { id: "evt-3", storeId: "store-4", eventType: "dunning_contact", fromPlan: "professional", toPlan: "professional", actorId: "nexatechnologies.dev@gmail.com", timestamp: "2026-07-01T10:00:00Z", reason: "Phoned merchant, they promised to update card by tomorrow" },
];

export default function SystemAdminSubscriptions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "plans" | "stores" | "dunning" | "logs">("overview");
  
  // Database States
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Search/Filters
  const [storeSearch, setStoreSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");

  // Selected Store Sheet Detail
  const [selectedStore, setSelectedStore] = useState<AdminStore | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [overridePlan, setOverridePlan] = useState("");
  const [trialExtensionDays, setTrialExtensionDays] = useState("7");

  // Plan CRUD Dialog
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  
  // Plan CRUD inputs
  const [planId, setPlanId] = useState("");
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("0");
  const [planCycle, setPlanCycle] = useState<"monthly" | "yearly">("monthly");
  const [planIsActive, setPlanIsActive] = useState(true);
  const [planSortOrder, setPlanSortOrder] = useState("1");
  const [flagPricingMode, setFlagPricingMode] = useState(false);
  const [flagCrossBranch, setFlagCrossBranch] = useState(false);
  const [flagB2B, setFlagB2B] = useState(false);
  const [flagMaxBranches, setFlagMaxBranches] = useState("1");

  // Store custom feature overrides states
  const [overridePricingMode, setOverridePricingMode] = useState<"inherit" | "force_true" | "force_false">("inherit");
  const [overrideCrossBranch, setOverrideCrossBranch] = useState<"inherit" | "force_true" | "force_false">("inherit");
  const [overrideB2B, setOverrideB2B] = useState<"inherit" | "force_true" | "force_false">("inherit");
  const [overrideMaxBranches, setOverrideMaxBranches] = useState<"inherit" | "custom">("inherit");
  const [customMaxBranches, setCustomMaxBranches] = useState<number>(1);

  useEffect(() => {
    if (selectedStore) {
      const overrides = (selectedStore.featureFlagsOverride || {}) as Partial<FeatureFlags>;
      
      if (overrides.pricingMode === true) {
        setOverridePricingMode("force_true");
      } else if (overrides.pricingMode === false) {
        setOverridePricingMode("force_false");
      } else {
        setOverridePricingMode("inherit");
      }

      if (overrides.crossBranchVisibility === true) {
        setOverrideCrossBranch("force_true");
      } else if (overrides.crossBranchVisibility === false) {
        setOverrideCrossBranch("force_false");
      } else {
        setOverrideCrossBranch("inherit");
      }

      if (overrides.b2bMarketplace === true) {
        setOverrideB2B("force_true");
      } else if (overrides.b2bMarketplace === false) {
        setOverrideB2B("force_false");
      } else {
        setOverrideB2B("inherit");
      }

      if (typeof overrides.maxBranches === "number") {
        setOverrideMaxBranches("custom");
        setCustomMaxBranches(overrides.maxBranches);
      } else {
        setOverrideMaxBranches("inherit");
        setCustomMaxBranches(1);
      }
    }
  }, [selectedStore]);

  const handleSaveStoreOverrides = async () => {
    if (!selectedStore) return;
    
    const overrides: Record<string, unknown> = {};
    
    if (overridePricingMode === "force_true") overrides.pricingMode = true;
    if (overridePricingMode === "force_false") overrides.pricingMode = false;
    
    if (overrideCrossBranch === "force_true") overrides.crossBranchVisibility = true;
    if (overrideCrossBranch === "force_false") overrides.crossBranchVisibility = false;
    
    if (overrideB2B === "force_true") overrides.b2bMarketplace = true;
    if (overrideB2B === "force_false") overrides.b2bMarketplace = false;
    
    if (overrideMaxBranches === "custom") {
      overrides.maxBranches = customMaxBranches;
    }

    try {
      if (isDemoMode) {
        const updatedStore = {
          ...selectedStore,
          featureFlagsOverride: overrides
        };
        setStores(stores.map(s => s.id === selectedStore.id ? updatedStore : s));
        setSelectedStore(updatedStore);
        toast.success("Feature overrides updated locally (Sandbox)!");
      } else {
        await updateDoc(doc(db, "stores", selectedStore.id), {
          featureFlagsOverride: overrides
        });
        const updatedStore = {
          ...selectedStore,
          featureFlagsOverride: overrides
        };
        setStores(stores.map(s => s.id === selectedStore.id ? updatedStore : s));
        setSelectedStore(updatedStore);
        toast.success("Feature overrides saved successfully!");
      }
    } catch (err) {
      toast.error(`Failed to save overrides: ${(err as Error).message}`);
    }
  };

  // Dunning dialog
  const [isDunningDialogOpen, setIsDunningDialogOpen] = useState(false);
  const [dunningStore, setDunningStore] = useState<AdminStore | null>(null);
  const [dunningMethod, setDunningMethod] = useState<"email" | "whatsapp" | "phone">("email");
  const [dunningNotes, setDunningNotes] = useState("");

  // Load Data
  const loadDatabase = async () => {
    setLoading(true);
    try {
      // 1. Fetch plans
      const plansSnap = await getDocs(collection(db, "subscriptionPlans"));
      let loadedPlans: SubscriptionPlan[] = [];
      plansSnap.forEach(doc => {
        loadedPlans.push(doc.data() as SubscriptionPlan);
      });
      if (loadedPlans.length === 0) {
        loadedPlans = DEFAULT_PLANS;
      }
      setPlans(loadedPlans.sort((a, b) => a.sortOrder - b.sortOrder));

      // 2. Fetch stores
      const storesSnap = await getDocs(collection(db, "stores"));
      const loadedStores: AdminStore[] = [];
      storesSnap.forEach(doc => {
        loadedStores.push({ id: doc.id, ...(doc.data() as Omit<AdminStore, "id">) });
      });

      // 3. Fetch events
      const eventsSnap = await getDocs(collection(db, "subscriptionEvents"));
      const loadedEvents: SubscriptionEvent[] = [];
      eventsSnap.forEach(doc => {
        loadedEvents.push({ id: doc.id, ...doc.data() } as SubscriptionEvent);
      });

      // 4. Fetch Monnify upgrade requests
      const reqSnap = await getDocs(collection(db, "subscriptionRequests"));
      const loadedReqs: SubscriptionRequest[] = [];
      reqSnap.forEach(doc => {
        loadedReqs.push({ id: doc.id, ...(doc.data() as Omit<SubscriptionRequest, "id">) });
      });
      setSubscriptionRequests(loadedReqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      // Handle Fallbacks
      if (loadedStores.length === 0) {
        console.warn("Firestore returned 0 stores. Activating sandboxed templates.");
        setStores(MOCK_STORES);
        setEvents(MOCK_EVENTS);
        setPlans(DEFAULT_PLANS);
        setIsDemoMode(true);
      } else {
        setStores(loadedStores);
        setEvents(loadedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setIsDemoMode(false);
      }
    } catch (err) {
      console.warn("Firestore fetch error, fallback to mock sandbox dataset:", err);
      setStores(MOCK_STORES);
      setPlans(DEFAULT_PLANS);
      setEvents(MOCK_EVENTS);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Quick seed button to populate Firebase with initial schemas
  const handleSeedFirebase = async () => {
    try {
      const batch = writeBatch(db);
      
      // Seed default plans
      for (const p of DEFAULT_PLANS) {
        const ref = doc(db, "subscriptionPlans", p.planId);
        batch.set(ref, p);
      }

      // Seed dummy subscription history events
      for (const evt of MOCK_EVENTS) {
        const ref = doc(collection(db, "subscriptionEvents"), evt.id);
        batch.set(ref, evt);
      }

      // Sync active store objects with billing fields
      for (const st of stores) {
        const ref = doc(db, "stores", st.id);
        const billingFields = {
          subscriptionTier: st.subscriptionTier || "starter",
          subscriptionStatus: st.subscriptionStatus || "trialing",
          currentPeriodEnd: st.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          trialEndsAt: st.trialEndsAt || null,
          paymentMethodOnFile: st.paymentMethodOnFile !== undefined ? st.paymentMethodOnFile : false
        };
        batch.update(ref, billingFields);
      }

      await batch.commit();
      toast.success("Firestore database successfully bootstrapped with standard subscription schemas!");
      loadDatabase();
    } catch (err) {
      const error = err as Error;
      console.error("Bootstrapping failed:", error);
      toast.error(`Bootstrap Error: ${error.message}`);
    }
  };

  // Helper stats
  const metrics = useMemo(() => {
    const plansMap = new Map(plans.map(p => [p.planId, p]));
    let totalMRR = 0;
    let activeSubs = 0;
    let pastDueCount = 0;
    let trialingCount = 0;
    let cancelledCount = 0;

    stores.forEach(s => {
      const tier = s.subscriptionTier || "starter";
      const plan = plansMap.get(tier) || DEFAULT_PLANS.find(p => p.planId === tier) || DEFAULT_PLANS[0];
      const price = plan.price || 0;
      
      if (s.subscriptionStatus === "active") {
        activeSubs++;
        totalMRR += tier === "yearly" ? Math.round(price / 12) : price;
      } else if (s.subscriptionStatus === "past_due") {
        pastDueCount++;
      } else if (s.subscriptionStatus === "trialing") {
        trialingCount++;
      } else if (s.subscriptionStatus === "cancelled") {
        cancelledCount++;
      }
    });

    const conversionRate = activeSubs + trialingCount > 0 
      ? Math.round((activeSubs / (activeSubs + trialingCount + cancelledCount)) * 100) 
      : 80;

    return {
      mrr: totalMRR,
      arr: totalMRR * 12,
      activeSubs,
      pastDueCount,
      trialingCount,
      cancelledCount,
      conversionRate
    };
  }, [stores, plans]);

  // Chart trend data
  const trendData = [
    { name: "Jan", MRR: Math.round(metrics.mrr * 0.7), Active: Math.max(1, metrics.activeSubs - 3), Cancelled: 1 },
    { name: "Feb", MRR: Math.round(metrics.mrr * 0.8), Active: Math.max(1, metrics.activeSubs - 2), Cancelled: 1 },
    { name: "Mar", MRR: Math.round(metrics.mrr * 0.85), Active: Math.max(1, metrics.activeSubs - 1), Cancelled: 2 },
    { name: "Apr", MRR: Math.round(metrics.mrr * 0.95), Active: metrics.activeSubs, Cancelled: 2 },
    { name: "May", MRR: metrics.mrr, Active: metrics.activeSubs, Cancelled: metrics.cancelledCount }
  ];

  // Plan Distribution Pie Chart
  const planDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    stores.forEach(s => {
      const tier = s.subscriptionTier || "starter";
      dist[tier] = (dist[tier] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    }));
  }, [stores]);

  const PIE_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ec4899"];

  // Stores filter
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      const matchesSearch = s.storeName?.toLowerCase().includes(storeSearch.toLowerCase()) ||
                            s.id?.toLowerCase().includes(storeSearch.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.subscriptionStatus === statusFilter;
      const matchesTier = tierFilter === "all" || s.subscriptionTier === tierFilter;
      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [stores, storeSearch, statusFilter, tierFilter]);

  // Handle plan edit initialization
  const startEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanId(plan.planId);
    setPlanName(plan.name);
    setPlanPrice(String(plan.price));
    setPlanCycle(plan.billingCycle);
    setPlanIsActive(plan.isActive);
    setPlanSortOrder(String(plan.sortOrder));
    setFlagPricingMode(plan.featureFlags.pricingMode);
    setFlagCrossBranch(plan.featureFlags.crossBranchVisibility);
    setFlagB2B(plan.featureFlags.b2bMarketplace);
    setFlagMaxBranches(String(plan.featureFlags.maxBranches));
    setIsPlanFormOpen(true);
  };

  // Handle plan create initialization
  const startCreatePlan = () => {
    setEditingPlan(null);
    setPlanId("");
    setPlanName("");
    setPlanPrice("0");
    setPlanCycle("monthly");
    setPlanIsActive(true);
    setPlanSortOrder("1");
    setFlagPricingMode(false);
    setFlagCrossBranch(false);
    setFlagB2B(false);
    setFlagMaxBranches("1");
    setIsPlanFormOpen(true);
  };

  // Plan CRUD save
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId || !planName) {
      toast.error("Plan ID and Plan Name are required.");
      return;
    }

    const payload: SubscriptionPlan = {
      planId,
      name: planName,
      price: parseFloat(planPrice) || 0,
      billingCycle: planCycle,
      isActive: planIsActive,
      sortOrder: parseInt(planSortOrder) || 1,
      featureFlags: {
        pricingMode: flagPricingMode,
        crossBranchVisibility: flagCrossBranch,
        b2bMarketplace: flagB2B,
        maxBranches: parseInt(flagMaxBranches) || 1
      }
    };

    try {
      if (isDemoMode) {
        // Sandboxed update
        if (editingPlan) {
          setPlans(plans.map(p => p.planId === editingPlan.planId ? payload : p));
        } else {
          setPlans([...plans, payload]);
        }
        toast.success("Plan changes updated locally (Sandbox)!");
      } else {
        // Live firestore write
        await setDoc(doc(db, "subscriptionPlans", planId), payload);
        toast.success(`Plan '${planName}' successfully saved to Firestore.`);
        await loadDatabase();
      }
      setIsPlanFormOpen(false);
    } catch (err) {
      const error = err as Error;
      toast.error(`Failed to save plan: ${error.message}`);
    }
  };

  // Delete plan
  const handleDeletePlan = async (pId: string) => {
    if (["starter", "professional", "enterprise"].includes(pId)) {
      toast.error("System core tiers (starter, professional, enterprise) cannot be deleted.");
      return;
    }

    if (!confirm("Are you sure you want to delete this subscription plan?")) return;

    try {
      if (isDemoMode) {
        setPlans(plans.filter(p => p.planId !== pId));
        toast.success("Plan deleted locally (Sandbox)!");
      } else {
        await deleteDoc(doc(db, "subscriptionPlans", pId));
        toast.success("Subscription plan deleted from Firestore.");
        await loadDatabase();
      }
    } catch (err) {
      const error = err as Error;
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  // Store action updates (manual override, extend trial, cancellation, toggle billing)
  const handleStoreBillingAction = async (actionType: SubscriptionEventType) => {
    if (!selectedStore) return;
    if (!actionReason) {
      toast.error("A reason/audit comment is required to record this change.");
      return;
    }

    const previousTier = selectedStore.subscriptionTier || "starter";
    let updatedFields: Partial<AdminStore> = {};
    let targetTier = previousTier;

    if (actionType === "manual_override") {
      if (!overridePlan) {
        toast.error("Please select a target subscription plan.");
        return;
      }
      targetTier = overridePlan;
      updatedFields = {
        subscriptionTier: overridePlan,
        subscriptionStatus: (overridePlan === "starter" ? "cancelled" : "active") as SubscriptionStatus
      };
    } else if (actionType === "trial_extension") {
      const days = parseInt(trialExtensionDays) || 7;
      const originalTrialEnd = selectedStore.trialEndsAt ? new Date(selectedStore.trialEndsAt) : new Date();
      const newTrialEnd = new Date(originalTrialEnd.getTime() + days * 24 * 60 * 60 * 1000);
      updatedFields = {
        trialEndsAt: newTrialEnd.toISOString(),
        subscriptionStatus: "trialing" as SubscriptionStatus
      };
    } else if (actionType === "cancellation") {
      updatedFields = {
        subscriptionStatus: "cancelled" as SubscriptionStatus,
        subscriptionTier: "starter" // down to free starter tier on cancelled
      };
      targetTier = "starter";
    } else if (actionType === "reactivation") {
      updatedFields = {
        subscriptionStatus: "active" as SubscriptionStatus
      };
    } else if (actionType === "discount_apply") {
      // Dummy demo/sandbox trigger
      updatedFields = {
        discountApplied: true
      };
    }

    const eventId = `evt-${Date.now()}`;
    const newEvent: SubscriptionEvent = {
      id: eventId,
      storeId: selectedStore.id,
      eventType: actionType,
      fromPlan: previousTier,
      toPlan: targetTier,
      actorId: user?.email || "nexatechnologies.dev@gmail.com",
      timestamp: new Date().toISOString(),
      reason: actionReason
    };

    try {
      if (isDemoMode) {
        // Sandboxed state modification
        const updatedStore = { ...selectedStore, ...updatedFields };
        setStores(stores.map(s => s.id === selectedStore.id ? updatedStore : s));
        setEvents([newEvent, ...events]);
        setSelectedStore(updatedStore);
        toast.success(`Action '${actionType}' completed locally in Sandbox!`);
      } else {
        // Write to Firestore
        await updateDoc(doc(db, "stores", selectedStore.id), updatedFields);
        await setDoc(doc(db, "subscriptionEvents", eventId), newEvent);
        toast.success("Store subscription audit logs synchronized live on Cloud!");

        // Trigger agent commission processing on the server
        try {
          fetch("/api/subscription/process-commission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId })
          }).then(res => res.json())
            .then(data => console.log("[Commission Process Result]:", data))
            .catch(err => console.error("Failed to call commission process API:", err));
        } catch (e) {
          console.error("Failed to trigger commission calculation on server:", e);
        }

        await loadDatabase();
        
        // Refresh selectedStore detail representation
        const refreshedStoreSnap = await getDocs(collection(db, "stores"));
        refreshedStoreSnap.forEach(doc => {
          if (doc.id === selectedStore.id) {
            setSelectedStore({ id: doc.id, ...(doc.data() as Omit<AdminStore, "id">) });
          }
        });
      }
      setActionReason("");
      setOverridePlan("");
    } catch (err) {
      const error = err as Error;
      toast.error(`Failed to record action: ${error.message}`);
    }
  };

  // Toggle store payment method on file
  const handleTogglePaymentMethod = async () => {
    if (!selectedStore) return;
    const newVal = !selectedStore.paymentMethodOnFile;
    
    try {
      if (isDemoMode) {
        const updatedStore = { ...selectedStore, paymentMethodOnFile: newVal };
        setStores(stores.map(s => s.id === selectedStore.id ? updatedStore : s));
        setSelectedStore(updatedStore);
        toast.success("Payment method toggled (Sandbox).");
      } else {
        await updateDoc(doc(db, "stores", selectedStore.id), { paymentMethodOnFile: newVal });
        toast.success("Payment status updated live on Cloud.");
        await loadDatabase();
        setSelectedStore({ ...selectedStore, paymentMethodOnFile: newVal });
      }
    } catch (err) {
      const error = err as Error;
      toast.error(`Failed to toggle: ${error.message}`);
    }
  };

  // Dunning Queue outreach submission
  const handleSubmitDunningOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dunningStore) return;
    if (!dunningNotes) {
      toast.error("Please add a note outlining the conversation details.");
      return;
    }

    const eventId = `evt-${Date.now()}`;
    const outreachEvent: SubscriptionEvent = {
      id: eventId,
      storeId: dunningStore.id,
      eventType: "dunning_contact",
      fromPlan: dunningStore.subscriptionTier || "starter",
      toPlan: dunningStore.subscriptionTier || "starter",
      actorId: user?.email || "nexatechnologies.dev@gmail.com",
      timestamp: new Date().toISOString(),
      reason: `[Outreach: ${dunningMethod.toUpperCase()}] ${dunningNotes}`
    };

    try {
      if (isDemoMode) {
        const updatedStore = { ...dunningStore, dunningContactedAt: outreachEvent.timestamp };
        setStores(stores.map(s => s.id === dunningStore.id ? updatedStore : s));
        setEvents([outreachEvent, ...events]);
        toast.success("Dunning contact log compiled locally (Sandbox)!");
      } else {
        await updateDoc(doc(db, "stores", dunningStore.id), { dunningContactedAt: outreachEvent.timestamp });
        await setDoc(doc(db, "subscriptionEvents", eventId), outreachEvent);
        toast.success("Dunning contact log posted live to Firestore!");
        await loadDatabase();
      }
      setIsDunningDialogOpen(false);
      setDunningNotes("");
    } catch (err) {
      const error = err as Error;
      toast.error(`Outreach save failed: ${error.message}`);
    }
  };

  // Monnify Upgrade Request Handlers
  const handleApproveRequest = async (req: SubscriptionRequest) => {
    try {
      if (isDemoMode) {
        setSubscriptionRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "approved", approvedAt: new Date().toISOString() } : r));
        toast.success(`Request approved in sandbox mode! Store upgraded to ${req.planName}`);
        return;
      }

      // Update request status
      await updateDoc(doc(db, "subscriptionRequests", req.id), {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: user?.email || "superadmin"
      });

      // Update store tier and active status
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await updateDoc(doc(db, "stores", req.storeId), {
        subscriptionTier: req.targetTier,
        subscriptionStatus: "active",
        currentPeriodEnd: periodEnd,
        paymentMethodOnFile: true
      });

      // Add in-app notification for merchant
      await addDoc(collection(db, "notifications"), {
        type: "request_update",
        title: "Subscription Upgrade Verified!",
        message: `Your Monnify bank transfer payment of ₦${req.amountNgn.toLocaleString()} for ${req.planName} has been verified and activated. Valid until ${new Date(periodEnd).toLocaleDateString()}.`,
        isRead: false,
        storeId: req.storeId,
        branchId: null,
        createdAt: new Date().toISOString()
      });

      // Audit event
      await addDoc(collection(db, "subscriptionEvents"), {
        storeId: req.storeId,
        eventType: "upgrade",
        fromPlan: "trialing",
        toPlan: req.targetTier,
        actorId: user?.email || "superadmin",
        timestamp: new Date().toISOString(),
        reason: `Monnify bank transfer verified. Ref: ${req.bankReference}`
      });

      toast.success(`Approved! Store upgraded to ${req.planName}`);
      loadDatabase();
    } catch (err) {
      toast.error(`Approval failed: ${(err as Error).message}`);
    }
  };

  const handleRejectRequest = async (req: SubscriptionRequest, reason: string) => {
    try {
      if (isDemoMode) {
        setSubscriptionRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "rejected", rejectedAt: new Date().toISOString(), rejectionReason: reason } : r));
        toast.info("Request rejected in sandbox mode.");
        return;
      }

      await updateDoc(doc(db, "subscriptionRequests", req.id), {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || "Transfer details could not be verified"
      });

      await addDoc(collection(db, "notifications"), {
        type: "request_update",
        title: "Upgrade Request Update",
        message: `Your bank transfer request for ${req.planName} was not approved. Reason: ${reason || "Transfer details unmatched"}. Please re-check account details.`,
        isRead: false,
        storeId: req.storeId,
        branchId: null,
        createdAt: new Date().toISOString()
      });

      toast.info("Upgrade request marked as rejected.");
      loadDatabase();
    } catch (err) {
      toast.error(`Rejection failed: ${(err as Error).message}`);
    }
  };

  const handleSendTrialNotification = async (store: AdminStore) => {
    try {
      const daysLeft = store.trialEndsAt 
        ? Math.max(0, Math.ceil((new Date(store.trialEndsAt).getTime() - Date.now()) / 86400000))
        : 14;

      if (!isDemoMode) {
        // 1. In-App Notification
        await addDoc(collection(db, "notifications"), {
          type: "expiry_warning",
          title: "NexaStoreOS Free Trial Ending Soon",
          message: `Your free trial expires in ${daysLeft} day(s). Transfer to our Monnify bank account to upgrade seamlessly without interruption!`,
          isRead: false,
          storeId: store.id,
          branchId: null,
          createdAt: new Date().toISOString()
        });

        // 2. Email log entry (Gmail dispatch)
        await addDoc(collection(db, "emailLogs"), {
          to: store.storePhone || "merchant@store.com",
          storeId: store.id,
          subject: `Action Required: Your NexaStoreOS Trial Expires in ${daysLeft} Days`,
          body: `Hello ${store.storeName || "Valued Merchant"},\n\nYour 14-day free trial on NexaStoreOS is expiring in ${daysLeft} days. Upgrade now via Monnify bank transfer to retain full access to your inventory, staff accounts, and daily reports.`,
          sentAt: new Date().toISOString(),
          status: "sent"
        });
      }

      toast.success(`Gmail and In-App expiration notification sent to ${store.storeName || "store"}!`);
    } catch (err) {
      toast.error(`Failed to dispatch alert: ${(err as Error).message}`);
    }
  };

  // Selected store's custom audit logs filter
  const storeSpecificEvents = useMemo(() => {
    if (!selectedStore) return [];
    return events.filter(e => e.storeId === selectedStore.id);
  }, [events, selectedStore]);

  // Gated stores for Dunning
  const dunningStoresList = useMemo(() => {
    return stores.filter(s => s.subscriptionStatus === "past_due");
  }, [stores]);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Sandbox/Sync Notification */}
      {isDemoMode && (
        <div className="flex items-center justify-between p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 rounded-xl text-xs gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 animate-bounce text-yellow-500 flex-shrink-0" />
            <span>
              <strong>Local-First Sandbox Active:</strong> Firestore databases are currently empty or unreachable in this container frame. Everything is fully operational in mock mode. You can instantly boot structures into live Cloud storage!
            </span>
          </div>
          <Button onClick={handleSeedFirebase} variant="outline" size="sm" className="border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-700 h-7 gap-1.5 font-bold uppercase tracking-wider text-[10px]">
            <Sparkles className="h-3 w-3" /> Boot Live Schemas
          </Button>
        </div>
      )}

      {/* Subscription Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
        <Card className="shadow-none border border-border bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Monthly Recurring Rev (MRR)</span>
              <p className="text-2xl font-bold tracking-tight">₦{metrics.mrr.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-500 font-bold block flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> ₦{(metrics.mrr * 1.05).toLocaleString()} Projected Next Month
              </span>
            </div>
            <div className="bg-sky-500/10 p-3 rounded-xl text-sky-500">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-border bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Annual Recurring Rev (ARR)</span>
              <p className="text-2xl font-bold tracking-tight">₦{metrics.arr.toLocaleString()}</p>
              <span className="text-[10px] text-muted-foreground font-medium block">Current pace calculated (MRR * 12)</span>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-border bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Active Licenses</span>
              <p className="text-2xl font-bold tracking-tight">{metrics.activeSubs}</p>
              <span className="text-[10px] text-amber-500 block font-bold">
                {metrics.trialingCount} on dynamic trial | {metrics.pastDueCount} past-due
              </span>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-border bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Trial Conversion Rate</span>
              <p className="text-2xl font-bold tracking-tight">{metrics.conversionRate}%</p>
              <span className="text-[10px] text-emerald-500 block font-bold">Excellent health ratio</span>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-xl text-purple-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-border gap-2">
        <Button
          variant="ghost"
          onClick={() => setActiveTab("overview")}
          className={`h-10 px-4 text-xs font-semibold rounded-none border-b-2 -mb-px hover:bg-transparent ${activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Activity className="h-4 w-4 mr-1.5" /> Overview & Charts
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab("requests")}
          className={`h-10 px-4 text-xs font-semibold rounded-none border-b-2 -mb-px relative hover:bg-transparent ${activeTab === "requests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <CreditCard className="h-4 w-4 mr-1.5" /> Transfer Requests ({subscriptionRequests.length})
          {subscriptionRequests.filter(r => r.status === "pending_verification").length > 0 && (
            <span className="ml-1.5 bg-emerald-600 text-white font-mono text-[9px] font-bold h-4 min-w-4 px-1 rounded-full inline-flex items-center justify-center animate-pulse">
              {subscriptionRequests.filter(r => r.status === "pending_verification").length}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab("stores")}
          className={`h-10 px-4 text-xs font-semibold rounded-none border-b-2 -mb-px hover:bg-transparent ${activeTab === "stores" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Building2 className="h-4 w-4 mr-1.5" /> Stores Directory ({stores.length})
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab("plans")}
          className={`h-10 px-4 text-xs font-semibold rounded-none border-b-2 -mb-px hover:bg-transparent ${activeTab === "plans" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Layers className="h-4 w-4 mr-1.5" /> Plan Configurations ({plans.length})
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab("dunning")}
          className={`h-10 px-4 text-xs font-semibold rounded-none border-b-2 -mb-px relative hover:bg-transparent ${activeTab === "dunning" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <AlertTriangle className="h-4 w-4 mr-1.5" /> Dunning Queue
          {dunningStoresList.length > 0 && (
            <span className="absolute top-2 right-1.5 bg-red-500 text-white font-mono text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-pulse">
              {dunningStoresList.length}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab("logs")}
          className={`h-10 px-4 text-xs font-semibold rounded-none border-b-2 -mb-px hover:bg-transparent ${activeTab === "logs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Clock className="h-4 w-4 mr-1.5" /> Audit Event Trail
        </Button>
      </div>

      {/* Tab Panels */}

      {/* 1. OVERVIEW & REVENUE CHARTS */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 shadow-none border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> MRR & Subscriber Volume Trends
              </CardTitle>
              <CardDescription className="text-xs">
                Performance indicators showing active subscriptions, churn ratios, and monthly recurring valuations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-[280px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₦${(value / 1000)}k`} />
                    <Tooltip formatter={(value: unknown) => [`₦${Number(value).toLocaleString()}`, "Valuation"]} />
                    <Line type="monotone" dataKey="MRR" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Active" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-500" /> Tier Distribution
              </CardTitle>
              <CardDescription className="text-xs">
                Breakdown of current merchant accounts by active licensing plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-2">
              {planDistribution.length > 0 ? (
                <>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, "Stores"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-3 text-xs px-2">
                    {planDistribution.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="font-semibold">{item.name}:</span>
                        <span className="text-muted-foreground">{item.value} store(s)</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No active store allocations detected to map.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Core Feature Flags Reference Table */}
          <Card className="md:col-span-3 shadow-none border border-border">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Settings2 className="h-4 w-4 text-purple-500" /> Subscription Feature-Flag Mapping Matrix
              </CardTitle>
              <CardDescription className="text-xs">
                How subscription tiers automatically enable or lock active capabilities in the merchant app.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-bold">Plan Identifier</TableHead>
                    <TableHead className="text-xs font-bold text-center">Multi-Tier Pricing Mode</TableHead>
                    <TableHead className="text-xs font-bold text-center">Cross-Branch Inventory</TableHead>
                    <TableHead className="text-xs font-bold text-center">B2B Supplier Marketplace</TableHead>
                    <TableHead className="text-xs font-bold text-right">Max Allowed Branches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.planId} className="hover:bg-transparent border-b">
                      <TableCell className="font-bold text-xs py-3.5 flex items-center gap-1.5">
                        {p.name}
                        {p.price === 0 ? (
                          <Badge variant="secondary" className="text-[9px] uppercase font-mono px-1 py-0 h-4">Free</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-600 text-[9px] px-1 py-0 h-4 font-mono">
                            ₦{p.price.toLocaleString()}/{p.billingCycle === "monthly" ? "mo" : "yr"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        {p.featureFlags.pricingMode ? (
                          <span className="inline-flex items-center justify-center text-emerald-500 font-bold bg-emerald-500/10 h-5 px-1.5 rounded-full text-[10px] gap-1"><Check className="h-3 w-3" /> Enabled</span>
                        ) : (
                          <span className="inline-flex items-center justify-center text-muted-foreground bg-neutral-100 h-5 px-1.5 rounded-full text-[10px] gap-1"><Ban className="h-2.5 w-2.5" /> Locked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        {p.featureFlags.crossBranchVisibility ? (
                          <span className="inline-flex items-center justify-center text-emerald-500 font-bold bg-emerald-500/10 h-5 px-1.5 rounded-full text-[10px] gap-1"><Check className="h-3 w-3" /> Enabled</span>
                        ) : (
                          <span className="inline-flex items-center justify-center text-muted-foreground bg-neutral-100 h-5 px-1.5 rounded-full text-[10px] gap-1"><Ban className="h-2.5 w-2.5" /> Locked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        {p.featureFlags.b2bMarketplace ? (
                          <span className="inline-flex items-center justify-center text-emerald-500 font-bold bg-emerald-500/10 h-5 px-1.5 rounded-full text-[10px] gap-1"><Check className="h-3 w-3" /> Enabled</span>
                        ) : (
                          <span className="inline-flex items-center justify-center text-muted-foreground bg-neutral-100 h-5 px-1.5 rounded-full text-[10px] gap-1"><Ban className="h-2.5 w-2.5" /> Locked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs py-3.5 pr-6">
                        {p.featureFlags.maxBranches} Branch{p.featureFlags.maxBranches !== 1 && "es"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. MONNIFY BANK TRANSFER UPGRADE REQUESTS */}
      {activeTab === "requests" && (
        <Card className="shadow-none border border-border">
          <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-500" /> Monnify Bank Transfer Upgrade Requests
              </CardTitle>
              <CardDescription className="text-xs">
                Merchants who initiated manual bank transfer upgrades via custom Monnify details. Verify transfer and click Approve to upgrade the store immediately.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">Store Name & Ref</TableHead>
                  <TableHead className="text-xs font-bold">Target Tier & Price</TableHead>
                  <TableHead className="text-xs font-bold">Payer Info</TableHead>
                  <TableHead className="text-xs font-bold">Monnify / Bank Ref</TableHead>
                  <TableHead className="text-xs font-bold">Date Submitted</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold text-right pr-6">Super Admin Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionRequests.length > 0 ? (
                  subscriptionRequests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-secondary/10 border-b">
                      <TableCell className="py-3.5">
                        <div>
                          <span className="font-bold text-xs block text-foreground">{req.storeName}</span>
                          <span className="font-mono text-[9px] text-muted-foreground block uppercase">{req.storeId}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div>
                          <Badge variant="outline" className="font-bold text-xs border-emerald-500/20 bg-emerald-500/10 text-emerald-700">
                            {req.planName}
                          </Badge>
                          <span className="text-xs font-extrabold block mt-0.5 text-foreground">
                            ₦{req.amountNgn.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 text-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">{req.payerName}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-600" /> {req.payerPhone}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 font-mono text-xs">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">
                          {req.bankReference}
                        </span>
                        {req.transactionRef && req.transactionRef !== "N/A" && (
                          <p className="text-[10px] text-muted-foreground mt-1">Tx: {req.transactionRef}</p>
                        )}
                      </TableCell>

                      <TableCell className="py-3.5 text-xs font-mono text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>

                      <TableCell className="text-center py-3.5">
                        {req.status === "pending_verification" && (
                          <Badge className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 animate-pulse">
                            Pending Verification
                          </Badge>
                        )}
                        {req.status === "approved" && (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5">
                            Approved & Upgraded
                          </Badge>
                        )}
                        {req.status === "rejected" && (
                          <Badge className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5">
                            Rejected
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right py-3.5 pr-6">
                        {req.status === "pending_verification" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleApproveRequest(req)}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-[11px] gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Upgrade
                            </Button>
                            <Button
                              onClick={() => {
                                const reason = prompt("Enter rejection reason (optional):") || "Transfer details unmatched";
                                handleRejectRequest(req, reason);
                              }}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 h-7 text-[11px] gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            {req.status === "approved" ? `Approved on ${new Date(req.approvedAt || "").toLocaleDateString()}` : "Processed"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No Monnify bank transfer requests submitted yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 3. STORES DIRECTORY (Search, Filter, Actions, Sheet Details) */}
      {activeTab === "stores" && (
        <Card className="shadow-none border border-border">
          <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-sky-500" /> Active Enterprise Stores & Subscriptions
              </CardTitle>
              <CardDescription className="text-xs">
                Audit active licensing, trialing terms, override billing cycles, or extend trial expirations.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Tier Filter */}
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {plans.map(p => (
                    <SelectItem key={p.planId} value={p.planId}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <div className="p-3 bg-secondary/10 border-b flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by store name or ID..."
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              className="h-8 text-xs flex-1 max-w-sm border-neutral-200"
            />
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">Store Branch Name</TableHead>
                  <TableHead className="text-xs font-bold">Plan Allocation</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold text-center">Payment Info</TableHead>
                  <TableHead className="text-xs font-bold">Current Cycle Ends</TableHead>
                  <TableHead className="text-xs font-bold text-right pr-6">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.length > 0 ? (
                  filteredStores.map((store) => {
                    const plan = plans.find(p => p.planId === store.subscriptionTier) || DEFAULT_PLANS.find(p => p.planId === store.subscriptionTier) || DEFAULT_PLANS[0];
                    return (
                      <TableRow key={store.id} className="hover:bg-secondary/10 border-b">
                        <TableCell className="py-3.5">
                          <div>
                            <span className="font-bold text-xs block text-foreground">{store.storeName || "Unnamed Store"}</span>
                            <span className="font-mono text-[9px] text-muted-foreground block uppercase">{store.id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge variant="outline" className="font-semibold text-xs border-sky-500/15 bg-sky-500/5 text-sky-600">
                            {plan.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          {store.subscriptionStatus === "active" && (
                            <Badge className="bg-emerald-500 text-white font-semibold text-[10px] capitalize px-2 py-0.5">Active</Badge>
                          )}
                          {store.subscriptionStatus === "trialing" && (
                            <div className="flex flex-col items-center gap-1">
                              <Badge className="bg-blue-600 text-white font-semibold text-[10px] capitalize px-2 py-0.5">
                                Free Trial
                              </Badge>
                              {store.trialEndsAt && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full font-mono">
                                  {Math.max(0, Math.ceil((new Date(store.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left
                                </span>
                              )}
                            </div>
                          )}
                          {store.subscriptionStatus === "past_due" && (
                            <Badge className="bg-red-500 text-white font-semibold text-[10px] capitalize px-2 py-0.5 animate-pulse">Past Due</Badge>
                          )}
                          {store.subscriptionStatus === "cancelled" && (
                            <Badge className="bg-neutral-400 text-white font-semibold text-[10px] capitalize px-2 py-0.5">Cancelled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          {store.paymentMethodOnFile ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0 h-5 font-mono">CC Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[9px] px-1.5 py-0 h-5 font-mono">Transfer / No CC</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground py-3.5">
                          {store.currentPeriodEnd ? new Date(store.currentPeriodEnd).toLocaleDateString() : (store.trialEndsAt ? new Date(store.trialEndsAt).toLocaleDateString() : "N/A")}
                        </TableCell>
                        <TableCell className="text-right py-3.5 pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            {store.subscriptionStatus === "trialing" && (
                              <Button
                                onClick={() => handleSendTrialNotification(store)}
                                size="sm"
                                variant="outline"
                                title="Send Gmail & In-App Expiration Warning"
                                className="h-7 text-[10px] font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950 border-sky-200 gap-1"
                              >
                                <Mail className="h-3 w-3" /> Alert
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                setSelectedStore(store);
                                setIsDetailOpen(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 hover:bg-primary hover:text-white"
                            >
                              Billing Desk <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No matching stores found in directory database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 3. PLAN MANAGEMENT CONFIGURATIONS (CRUD) */}
      {activeTab === "plans" && (
        <Card className="shadow-none border border-border">
          <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-amber-500" /> Subscription Plan Definitions (CRUD)
              </CardTitle>
              <CardDescription className="text-xs">
                Configure price points, billing cycles, sorting queues, and explicit capability toggles for each plan.
              </CardDescription>
            </div>
            <Button onClick={startCreatePlan} size="sm" className="h-9 text-xs gap-1">
              <Plus className="h-4 w-4" /> Add Custom Plan
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold w-[250px]">Plan Name / ID</TableHead>
                  <TableHead className="text-xs font-bold">Billing Cycle & Price</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold text-center">Pricing Mode Flag</TableHead>
                  <TableHead className="text-xs font-bold text-center">Multi-Branch Flag</TableHead>
                  <TableHead className="text-xs font-bold text-center">B2B Marketplace</TableHead>
                  <TableHead className="text-xs font-bold text-right pr-6">Edit / Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.planId} className="hover:bg-secondary/10 border-b">
                    <TableCell className="py-4">
                      <div>
                        <span className="font-bold text-xs block text-foreground">{p.name}</span>
                        <span className="font-mono text-[9px] text-muted-foreground block">ID: {p.planId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-mono text-xs font-bold text-primary">
                      ₦{p.price.toLocaleString()} / {p.billingCycle}
                    </TableCell>
                    <TableCell className="text-center py-4">
                      {p.isActive ? (
                        <Badge className="bg-emerald-500 text-white font-semibold text-[9px] uppercase px-1.5 py-0 h-5">Active</Badge>
                      ) : (
                        <Badge className="bg-neutral-400 text-white font-semibold text-[9px] uppercase px-1.5 py-0 h-5">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-4">
                      {p.featureFlags.pricingMode ? "✅ Enabled" : "❌ Disabled"}
                    </TableCell>
                    <TableCell className="text-center py-4 font-semibold text-xs">
                      {p.featureFlags.crossBranchVisibility ? `✅ Up to ${p.featureFlags.maxBranches}` : "❌ Disabled"}
                    </TableCell>
                    <TableCell className="text-center py-4">
                      {p.featureFlags.b2bMarketplace ? "✅ Enabled" : "❌ Disabled"}
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button onClick={() => startEditPlan(p)} variant="outline" size="icon" className="h-7 w-7 border-neutral-200">
                          <Edit2 className="h-3.5 w-3.5 text-sky-600" />
                        </Button>
                        <Button onClick={() => handleDeletePlan(p.planId)} variant="outline" size="icon" className="h-7 w-7 border-neutral-200">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 4. DUNNING QUEUE PANEL */}
      {activeTab === "dunning" && (
        <Card className="shadow-none border border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" /> Delinquent Store Accounts & Dunning Queue
            </CardTitle>
            <CardDescription className="text-xs">
              List of store accounts with a status of `past_due`. Actively contact merchants, track outreach history, and record logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">Store Branch Name</TableHead>
                  <TableHead className="text-xs font-bold">Delinquent Plan</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold">Invoice Due Date</TableHead>
                  <TableHead className="text-xs font-bold">Last Contacted At</TableHead>
                  <TableHead className="text-xs font-bold text-right pr-6">Direct Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dunningStoresList.length > 0 ? (
                  dunningStoresList.map((store) => (
                    <TableRow key={store.id} className="hover:bg-red-500/5 border-b border-red-500/10">
                      <TableCell className="py-3.5">
                        <div>
                          <span className="font-bold text-xs block text-foreground">{store.storeName}</span>
                          <span className="font-mono text-[9px] text-muted-foreground block">{store.storePhone || "No Phone Registered"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className="border-red-500/20 bg-red-500/5 text-red-600 font-semibold text-xs capitalize">
                          {store.subscriptionTier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        <Badge className="bg-red-500 text-white font-bold text-[9px] px-1.5 py-0 h-5 uppercase animate-pulse">Past Due</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-red-500 py-3.5 font-semibold">
                        {store.currentPeriodEnd ? new Date(store.currentPeriodEnd).toLocaleDateString() : "Immediate"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground py-3.5">
                        {store.dunningContactedAt ? new Date(store.dunningContactedAt).toLocaleString() : "Never Contacted"}
                      </TableCell>
                      <TableCell className="text-right py-3.5 pr-6">
                        <Button
                          onClick={() => {
                            setDunningStore(store);
                            setIsDunningDialogOpen(true);
                          }}
                          size="sm"
                          className="bg-red-500 hover:bg-red-600 text-white h-7 gap-1"
                        >
                          <Mail className="h-3 w-3" /> Log Contact
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-emerald-600 font-medium">
                      All accounts currently paid up! Dunning queue is pristine.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 5. AUDIT EVENT TRAIL */}
      {activeTab === "logs" && (
        <Card className="shadow-none border border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" /> Consolidated Subscription Event Audit Trail
            </CardTitle>
            <CardDescription className="text-xs">
              A historical registry of billing operations, plan upgrades, cancellations, and administrative adjustments.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-bold">Event Type</TableHead>
                  <TableHead className="text-xs font-bold">Store</TableHead>
                  <TableHead className="text-xs font-bold text-center">Transition</TableHead>
                  <TableHead className="text-xs font-bold">Actor ID</TableHead>
                  <TableHead className="text-xs font-bold">Audit Reason / Description</TableHead>
                  <TableHead className="text-xs font-bold text-right pr-6">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length > 0 ? (
                  events.map((e) => (
                    <TableRow key={e.id} className="hover:bg-secondary/10 border-b">
                      <TableCell className="py-3.5">
                        <Badge className={`font-semibold text-[10px] capitalize px-2 py-0.5 ${
                          e.eventType === "upgrade" ? "bg-emerald-500" :
                          e.eventType === "downgrade" ? "bg-neutral-500" :
                          e.eventType === "manual_override" ? "bg-purple-500" :
                          e.eventType === "cancellation" ? "bg-red-500" :
                          e.eventType === "failed_payment" ? "bg-amber-500" : "bg-neutral-400"
                        }`}>
                          {e.eventType.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="font-bold text-xs text-foreground block">
                          {stores.find(s => s.id === e.storeId)?.storeName || e.storeId}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-3.5 font-mono text-xs text-muted-foreground">
                        {e.fromPlan.toUpperCase()} → {e.toPlan.toUpperCase()}
                      </TableCell>
                      <TableCell className="py-3.5 font-mono text-[10px] text-muted-foreground">
                        {e.actorId}
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-foreground max-w-xs truncate">
                        {e.reason || "—"}
                      </TableCell>
                      <TableCell className="text-right py-3.5 pr-6 font-mono text-[11px] text-muted-foreground">
                        {new Date(e.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No audited events in database yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* MODALS & SHEETS */}

      {/* A. PLAN CREATION/EDITING DIALOG */}
      <Dialog open={isPlanFormOpen} onOpenChange={setIsPlanFormOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSavePlan}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-sky-500" />
                {editingPlan ? `Edit Subscription Plan: ${editingPlan.name}` : "Create New Subscription Plan"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure underlying rules, sorting priorities, and specific client feature-flags.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Plan ID */}
              <div className="space-y-1">
                <Label htmlFor="p_id" className="text-xs font-semibold">Plan ID (Unique string key, e.g. "professional_tier")</Label>
                <Input
                  id="p_id"
                  disabled={!!editingPlan}
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  placeholder="starter_annual"
                  className="h-8 text-xs border-neutral-200"
                />
              </div>

              {/* Plan Name */}
              <div className="space-y-1">
                <Label htmlFor="p_name" className="text-xs font-semibold">Plan Human-Readable Display Name</Label>
                <Input
                  id="p_name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Professional Plus Plan"
                  className="h-8 text-xs border-neutral-200"
                />
              </div>

              {/* Price & Billing Cycle */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="p_price" className="text-xs font-semibold">Base Price (₦ NGN)</Label>
                  <Input
                    id="p_price"
                    type="number"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    className="h-8 text-xs border-neutral-200"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p_cycle" className="text-xs font-semibold">Billing Frequency</Label>
                  <Select value={planCycle} onValueChange={(val: "monthly" | "yearly") => setPlanCycle(val)}>
                    <SelectTrigger id="p_cycle" className="h-8 text-xs">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sort Order & Active */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="p_sort" className="text-xs font-semibold">Catalog Sort Priority</Label>
                  <Input
                    id="p_sort"
                    type="number"
                    value={planSortOrder}
                    onChange={(e) => setPlanSortOrder(e.target.value)}
                    className="h-8 text-xs border-neutral-200"
                  />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-2 bg-neutral-50 h-8 self-end">
                  <span className="font-semibold text-xs">Publish Active</span>
                  <Switch checked={planIsActive} onCheckedChange={setPlanIsActive} />
                </div>
              </div>

              {/* Feature Flags Checklist */}
              <div className="border border-neutral-200/60 rounded-xl p-3 bg-secondary/5 space-y-3">
                <span className="font-bold text-xs uppercase text-primary tracking-wider block border-b pb-1.5">Target Client Feature-Flags</span>
                
                {/* Multi-Tier Pricing Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="f_pricing" className="text-xs font-semibold block">Multi-Tier Pricing Mode</Label>
                    <span className="text-[10px] text-muted-foreground">Allows merchants to define distinct pricing tiers.</span>
                  </div>
                  <Switch checked={flagPricingMode} onCheckedChange={setFlagPricingMode} id="f_pricing" />
                </div>

                {/* Cross-Branch Visibility */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="f_cross" className="text-xs font-semibold block">Cross-Branch Visibility</Label>
                    <span className="text-[10px] text-muted-foreground">Permit stock analysis across stores.</span>
                  </div>
                  <Switch checked={flagCrossBranch} onCheckedChange={setFlagCrossBranch} id="f_cross" />
                </div>

                {/* B2B Marketplace */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="f_b2b" className="text-xs font-semibold block">B2B Supplier Marketplace</Label>
                    <span className="text-[10px] text-muted-foreground">Enable direct connection to regional wholesale suppliers.</span>
                  </div>
                  <Switch checked={flagB2B} onCheckedChange={setFlagB2B} id="f_b2b" />
                </div>

                {/* Max Allowed Branches */}
                <div className="space-y-1 border-t pt-2.5">
                  <Label htmlFor="f_max" className="text-xs font-semibold block">Maximum Branches Allowed</Label>
                  <Input
                    id="f_max"
                    type="number"
                    value={flagMaxBranches}
                    onChange={(e) => setFlagMaxBranches(e.target.value)}
                    className="h-8 text-xs border-neutral-200 mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
              </DialogClose>
              <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-white">
                Save Subscription Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* B. STORE DETAIL SHEET (OVERRIDE, TRIALS, EVENTS LIST) */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-base font-bold flex items-center gap-1.5 text-foreground">
              <Building2 className="h-5 w-5 text-sky-500" />
              {selectedStore?.storeName} — Subscription Desk
            </SheetTitle>
            <SheetDescription className="text-xs">
              System root desk for managing merchant licensing, manual tiers, and trial properties.
            </SheetDescription>
          </SheetHeader>

          {selectedStore && (
            <div className="space-y-6 py-4 text-xs">
              
              {/* Core billing overview */}
              <div className="grid grid-cols-2 gap-3.5 bg-secondary/10 p-4 border border-border rounded-xl">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Licensed Plan</span>
                  <span className="text-sm font-extrabold text-foreground mt-0.5 block capitalize">
                    {selectedStore.subscriptionTier}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Payment Status</span>
                  <span className="text-sm font-extrabold text-foreground mt-0.5 block flex items-center gap-1 capitalize">
                    {selectedStore.subscriptionStatus === "active" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {selectedStore.subscriptionStatus === "trialing" && <Clock className="h-4 w-4 text-sky-500" />}
                    {selectedStore.subscriptionStatus === "past_due" && <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />}
                    {selectedStore.subscriptionStatus === "cancelled" && <XCircle className="h-4 w-4 text-neutral-400" />}
                    {selectedStore.subscriptionStatus}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Current Term Ends</span>
                  <span className="font-mono text-xs text-foreground block mt-0.5">
                    {selectedStore.currentPeriodEnd ? new Date(selectedStore.currentPeriodEnd).toLocaleString() : "None"}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <span className="text-[10px] text-muted-foreground uppercase block font-medium">Auto-Renew Credit Card</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold">{selectedStore.paymentMethodOnFile ? "Card Registered" : "No Card File"}</span>
                    <Button onClick={handleTogglePaymentMethod} variant="link" size="sm" className="h-5 p-0 text-sky-500 font-bold">
                      Toggle
                    </Button>
                  </div>
                </div>
              </div>

              {/* STORE CUSTOM FEATURE FLAG OVERRIDES */}
              <div className="border border-neutral-200/60 rounded-xl p-4 bg-secondary/5 space-y-4">
                <span className="font-bold text-xs uppercase text-primary tracking-wider block border-b pb-1.5 flex items-center gap-1.5">
                  <Settings2 className="h-4 w-4 text-sky-500" />
                  Store-Specific Feature Overrides
                </span>
                <p className="text-[11px] text-muted-foreground -mt-2 leading-relaxed">
                  Directly override active features and subscription tier limits for this specific store. When overridden, these settings take precedence.
                </p>

                <div className="space-y-3.5">
                  {/* 1. Pricing Mode Override */}
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label htmlFor="override_pricing" className="text-xs font-semibold">Multi-Tier Pricing Mode</Label>
                    <Select value={overridePricingMode} onValueChange={(val) => setOverridePricingMode(val as "inherit" | "force_true" | "force_false")}>
                      <SelectTrigger id="override_pricing" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">Inherit from Plan</SelectItem>
                        <SelectItem value="force_true">Force Enabled (Override)</SelectItem>
                        <SelectItem value="force_false">Force Disabled (Override)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Cross-Branch Override */}
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label htmlFor="override_cross" className="text-xs font-semibold">Cross-Branch Visibility</Label>
                    <Select value={overrideCrossBranch} onValueChange={(val) => setOverrideCrossBranch(val as "inherit" | "force_true" | "force_false")}>
                      <SelectTrigger id="override_cross" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">Inherit from Plan</SelectItem>
                        <SelectItem value="force_true">Force Enabled (Override)</SelectItem>
                        <SelectItem value="force_false">Force Disabled (Override)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. B2B Marketplace Override */}
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label htmlFor="override_b2b" className="text-xs font-semibold">B2B Wholesale Marketplace</Label>
                    <Select value={overrideB2B} onValueChange={(val) => setOverrideB2B(val as "inherit" | "force_true" | "force_false")}>
                      <SelectTrigger id="override_b2b" className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">Inherit from Plan</SelectItem>
                        <SelectItem value="force_true">Force Enabled (Override)</SelectItem>
                        <SelectItem value="force_false">Force Disabled (Override)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Max Branches Override */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <Label htmlFor="override_branches" className="text-xs font-semibold">Branches Limit Option</Label>
                      <Select value={overrideMaxBranches} onValueChange={(val) => setOverrideMaxBranches(val as "inherit" | "custom")}>
                        <SelectTrigger id="override_branches" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inherit">Inherit from Plan</SelectItem>
                          <SelectItem value="custom">Custom Limit (Override)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {overrideMaxBranches === "custom" && (
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <Label htmlFor="custom_branches_val" className="text-xs font-semibold pl-2 text-muted-foreground">Custom Max Branches</Label>
                        <Input
                          id="custom_branches_val"
                          type="number"
                          min={1}
                          max={999}
                          value={customMaxBranches}
                          onChange={(e) => setCustomMaxBranches(parseInt(e.target.value) || 1)}
                          className="h-8 text-xs border-neutral-200"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveStoreOverrides}
                    className="bg-sky-500 hover:bg-sky-600 text-white text-xs h-8 px-4"
                  >
                    Save Feature Overrides
                  </Button>
                </div>
              </div>

              {/* AUDIT ACTIONS COMPILER */}
              <div className="border border-neutral-200/60 rounded-xl p-4 bg-secondary/5 space-y-4">
                <span className="font-bold text-xs uppercase text-primary tracking-wider block border-b pb-1.5">Trigger Subscription Adjustment</span>
                
                {/* 1. Audit reasoning comments (REQUIRED) */}
                <div className="space-y-1">
                  <Label htmlFor="audit_reason" className="text-xs font-semibold">Change Reason & Comments (REQUIRED FOR TIMELINE AUDIT)</Label>
                  <Textarea
                    id="audit_reason"
                    placeholder="Merchant requested discount, or manually overridden to Enterprise as enterprise tier partner deal..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="h-16 text-xs border-neutral-200"
                  />
                </div>

                {/* 2. Plan Manual Override */}
                <div className="grid grid-cols-[3fr_1fr] gap-2 items-end border-t pt-3 mt-3">
                  <div className="space-y-1">
                    <Label htmlFor="m_plan" className="text-xs font-semibold block">Manual Plan Override Tier</Label>
                    <Select value={overridePlan} onValueChange={setOverridePlan}>
                      <SelectTrigger id="m_plan" className="h-8 text-xs">
                        <SelectValue placeholder="Select target plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map(p => (
                          <SelectItem key={p.planId} value={p.planId}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleStoreBillingAction("manual_override")}
                    className="bg-primary text-white text-xs h-8"
                  >
                    Set Tier
                  </Button>
                </div>

                {/* 3. Trial Extension */}
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 items-end border-t pt-3 mt-3">
                  <div className="space-y-1">
                    <Label htmlFor="trial_end_dt" className="text-xs font-semibold">Current Trial Expiration</Label>
                    <Input
                      id="trial_end_dt"
                      disabled
                      value={selectedStore.trialEndsAt ? new Date(selectedStore.trialEndsAt).toLocaleDateString() : "No Trial Active"}
                      className="h-8 text-xs border-neutral-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="trial_days" className="text-xs font-semibold">Add Days</Label>
                    <Select value={trialExtensionDays} onValueChange={setTrialExtensionDays}>
                      <SelectTrigger id="trial_days" className="h-8 text-xs">
                        <SelectValue placeholder="Days" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="14">14 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleStoreBillingAction("trial_extension")}
                    className="bg-sky-500 hover:bg-sky-600 text-white text-xs h-8"
                  >
                    Extend
                  </Button>
                </div>

                {/* 4. Quick Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t pt-3 mt-3 justify-end">
                  <Button
                    onClick={() => handleSendTrialNotification(selectedStore)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950 gap-1.5 font-bold"
                  >
                    <Mail className="h-3.5 w-3.5" /> Send Expiry Warning (Gmail + In-App)
                  </Button>
                  {selectedStore.subscriptionStatus === "active" ? (
                    <Button
                      onClick={() => handleStoreBillingAction("cancellation")}
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      Cancel Subscription
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleStoreBillingAction("reactivation")}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs"
                    >
                      Reactivate License
                    </Button>
                  )}
                </div>
              </div>

              {/* TIMELINE OF EVENTS SPECIFIC TO STORE */}
              <div className="space-y-3.5 border-t pt-4">
                <span className="font-bold text-xs uppercase text-primary tracking-wider block">Store Subscription Audit Timeline</span>
                
                {storeSpecificEvents.length > 0 ? (
                  <div className="relative border-l border-neutral-200 ml-3.5 pl-4 space-y-4">
                    {storeSpecificEvents.map((evt) => (
                      <div key={evt.id} className="relative">
                        {/* Event bullet */}
                        <div className="absolute -left-[23px] top-0.5 bg-neutral-100 rounded-full h-3 w-3 border border-neutral-400 flex items-center justify-center" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-foreground capitalize text-[11px]">
                              {evt.eventType.replace("_", " ")}
                            </span>
                            <span className="font-mono text-[9px] text-muted-foreground">
                              ({evt.fromPlan.toUpperCase()} → {evt.toPlan.toUpperCase()})
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-0.5 font-sans leading-relaxed">
                            {evt.reason || "No comments compiled."}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {evt.actorId}</span>
                            <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {new Date(evt.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-muted-foreground text-xs bg-neutral-50 rounded-lg">
                    No timeline logs generated for this merchant yet.
                  </p>
                )}
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* C. DUNNING OUTREACH DIALOG */}
      <Dialog open={isDunningDialogOpen} onOpenChange={setIsDunningDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmitDunningOutreach}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-1.5 text-red-500">
                <AlertTriangle className="h-4 w-4 animate-pulse" /> Log Past-Due Outreach Session
              </DialogTitle>
              <DialogDescription className="text-xs">
                Log direct communication with delinquent accounts. This keeps our staff coordinated.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-red-600 space-y-1">
                <span className="font-bold text-xs block">{dunningStore?.storeName}</span>
                <p className="text-[10px] leading-normal font-medium">
                  Currently Past-Due on their **{dunningStore?.subscriptionTier?.toUpperCase()}** license. Invoice was due on: **{dunningStore?.currentPeriodEnd ? new Date(dunningStore.currentPeriodEnd).toLocaleDateString() : "Immediate"}**.
                </p>
              </div>

              {/* Outreach method */}
              <div className="space-y-1">
                <Label htmlFor="outreach_method" className="text-xs font-semibold">Contact Outreach Method</Label>
                <Select value={dunningMethod} onValueChange={(val: "email" | "whatsapp" | "phone") => setDunningMethod(val)}>
                  <SelectTrigger id="outreach_method" className="h-8 text-xs">
                    <SelectValue placeholder="Outreach Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Notice Sent</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp Direct Ping</SelectItem>
                    <SelectItem value="phone">Phoned Direct Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="outreach_notes" className="text-xs font-semibold">Detailed Conversation Notes</Label>
                <Textarea
                  id="outreach_notes"
                  placeholder="Spoke with manager, they said the card expired. They promised to upload a new active payment card by tomorrow noon..."
                  value={dunningNotes}
                  onChange={(e) => setDunningNotes(e.target.value)}
                  className="h-24 text-xs border-neutral-200"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
              </DialogClose>
              <Button type="submit" size="sm" className="h-8 text-xs bg-red-500 text-white hover:bg-red-600">
                Submit outreach log
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
