import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, functions } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  writeBatch,
  orderBy
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { 
  Users, 
  Check, 
  X, 
  UserX, 
  UserCheck, 
  CreditCard, 
  Clock, 
  DollarSign, 
  Layers, 
  Award, 
  Settings, 
  RefreshCw, 
  TrendingUp, 
  Search, 
  ChevronRight, 
  Filter, 
  PlusCircle, 
  AlertCircle,
  Building2,
  Send,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Agent {
  agentId: string;
  fullName: string;
  email: string;
  referralCode: string;
  referralLink: string;
  status: "pending" | "approved" | "suspended";
  commissionRulesApplied: string;
  earnings: {
    pending: number;
    paid: number;
    reversed: number;
  };
  bank?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  createdAt: string;
}

export interface AgentPayoutClaim {
  id: string;
  agentUid: string;
  agentId: string;
  agentName: string;
  claimType: "logistics" | "earnings" | "custom";
  amount: number;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  accountResolved?: boolean;
  status: "pending_review" | "disbursed" | "completed" | "failed";
  transferCode?: string;
  transferReference?: string;
  gateway?: string;
  notes?: string;
  createdAt: string;
  disbursedAt?: string;
  disbursedBy?: string;
}

interface Referral {
  id: string;
  agentId: string;
  storeId: string;
  status: "pending" | "converted" | "churned";
  createdAt: string;
  convertedAt?: string;
  storeName?: string;
}

interface Earning {
  id: string;
  agentId: string;
  referralId: string;
  storeId: string;
  subscriptionEventId: string;
  amount: number;
  commissionType: "onboarding_bonus" | "recurring_residual" | "clawback";
  status: "pending" | "paid" | "reversed";
  timestamp: string;
  storeName?: string;
}

interface CommissionRule {
  onboardingBonusNgn: number;
  recurringResidualPercent: number;
  clawbackWindowDays: number;
}

export default function SystemAdminAgentsNetwork() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payoutClaims, setPayoutClaims] = useState<AgentPayoutClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"agents" | "claims" | "rules">("agents");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");
  const [claimStatusFilter, setClaimStatusFilter] = useState<"all" | "pending_review" | "disbursed" | "completed" | "failed">("all");

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [disbursingClaimId, setDisbursingClaimId] = useState<string | null>(null);

  const [rules, setRules] = useState<CommissionRule>({
    onboardingBonusNgn: 10000,
    recurringResidualPercent: 15,
    clawbackWindowDays: 30
  });
  const [savingRules, setSavingRules] = useState(false);

  const [adjAmount, setAdjAmount] = useState("");
  const [adjType, setAdjType] = useState<"credit" | "debit">("credit");
  const [adjReason, setAdjReason] = useState("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  useEffect(() => {
    const unsubAgents = onSnapshot(collection(db, "agents"), (snap) => {
      const list: Agent[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Agent);
      });
      setAgents(list);
      setLoading(false);
    }, (err) => {
      console.error("Agents listener error:", err);
      setLoading(false);
    });

    const unsubClaims = onSnapshot(collection(db, "agentPayoutRequests"), (snap) => {
      const list: AgentPayoutClaim[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as AgentPayoutClaim);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setPayoutClaims(list);
    }, (err) => {
      console.warn("Claims listener fallback:", err);
    });

    const unsubReferrals = onSnapshot(collection(db, "referrals"), async (snap) => {
      const list: Referral[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        let storeName = "Nexa Store";
        try {
          const storeSnap = await getDoc(doc(db, "stores", data.storeId));
          if (storeSnap.exists()) {
            storeName = storeSnap.data().storeName || "Nexa Store";
          }
        } catch {
          // ignore
        }
        list.push({
          id: d.id,
          agentId: data.agentId,
          storeId: data.storeId,
          status: data.status,
          createdAt: data.createdAt,
          convertedAt: data.convertedAt,
          storeName
        });
      }
      setReferrals(list);
    });

    const unsubEarnings = onSnapshot(collection(db, "agentEarnings"), async (snap) => {
      const list: Earning[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        let storeName = "Nexa Store";
        try {
          const storeSnap = await getDoc(doc(db, "stores", data.storeId));
          if (storeSnap.exists()) {
            storeName = storeSnap.data().storeName || "Nexa Store";
          }
        } catch {
          // ignore
        }
        list.push({
          id: d.id,
          agentId: data.agentId,
          referralId: data.referralId,
          storeId: data.storeId,
          subscriptionEventId: data.subscriptionEventId,
          amount: data.amount,
          commissionType: data.commissionType,
          status: data.status,
          timestamp: data.timestamp,
          storeName
        });
      }
      setEarnings(list);
    });

    const fetchRules = async () => {
      const snap = await getDoc(doc(db, "commissionRules", "default"));
      if (snap.exists()) {
        const data = snap.data();
        setRules({
          onboardingBonusNgn: data.onboardingBonusNgn ?? 10000,
          recurringResidualPercent: data.recurringResidualPercent ?? 15,
          clawbackWindowDays: data.clawbackWindowDays ?? 30
        });
      }
    };
    fetchRules();

    return () => {
      unsubAgents();
      unsubReferrals();
      unsubEarnings();
    };
  }, []);

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = 
      agent.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.referralCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleApproveAgent = async (agentId: string) => {
    try {
      await updateDoc(doc(db, "agents", agentId), {
        status: "approved"
      });
      toast.success("Agent application approved successfully!");
      if (selectedAgent && selectedAgent.agentId === agentId) {
        setSelectedAgent(prev => prev ? { ...prev, status: "approved" } : null);
      }
    } catch (err) {
      toast.error(`Approval failed: ${(err as Error).message}`);
    }
  };

  const handleSuspendAgent = async (agentId: string) => {
    try {
      await updateDoc(doc(db, "agents", agentId), {
        status: "suspended"
      });
      toast.success("Agent suspended successfully.");
      if (selectedAgent && selectedAgent.agentId === agentId) {
        setSelectedAgent(prev => prev ? { ...prev, status: "suspended" } : null);
      }
    } catch (err) {
      toast.error(`Suspension failed: ${(err as Error).message}`);
    }
  };

  const handleActivateAgent = async (agentId: string) => {
    try {
      await updateDoc(doc(db, "agents", agentId), {
        status: "approved"
      });
      toast.success("Agent activated successfully!");
      if (selectedAgent && selectedAgent.agentId === agentId) {
        setSelectedAgent(prev => prev ? { ...prev, status: "approved" } : null);
      }
    } catch (err) {
      toast.error(`Activation failed: ${(err as Error).message}`);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    try {
      await setDoc(doc(db, "commissionRules", "default"), {
        id: "default",
        onboardingBonusNgn: rules.onboardingBonusNgn,
        recurringResidualPercent: rules.recurringResidualPercent,
        clawbackWindowDays: rules.clawbackWindowDays,
        updatedAt: new Date().toISOString()
      });
      toast.success("Default commission rules updated live!");
    } catch (err) {
      toast.error(`Failed to update rules: ${(err as Error).message}`);
    } finally {
      setSavingRules(false);
    }
  };

  const handleDisburseClaimViaPaystack = async (claim: AgentPayoutClaim) => {
    if (!claim.accountNumber || claim.accountNumber.length < 10) {
      toast.error("Valid 10-digit agent account number required for Paystack disbursement.");
      return;
    }
    if (!claim.amount || claim.amount <= 0) {
      toast.error("Invalid payout claim amount.");
      return;
    }

    setDisbursingClaimId(claim.id);
    try {
      const disburseFn = httpsCallable<any, any>(functions, "disburseagentpayout");
      const res = await disburseFn({
        claimId: claim.id,
        agentId: claim.agentId || claim.agentUid,
        amountNgn: claim.amount,
        accountNumber: claim.accountNumber,
        bankCode: claim.bankCode || "044",
        accountName: claim.accountName || claim.agentName,
      });

      if (res.data?.success) {
        toast.success(`Disbursed ₦${claim.amount.toLocaleString()} to ${claim.accountName} via Paystack! Ref: ${res.data.reference}`);
      } else {
        throw new Error(res.data?.error || "Paystack transfer failed.");
      }
    } catch (err: any) {
      console.warn("Paystack disbursement fallback:", err);
      // Fallback local update
      try {
        const batch = writeBatch(db);
        const claimRef = doc(db, "agentPayoutRequests", claim.id);
        batch.update(claimRef, {
          status: "disbursed",
          disbursedAt: new Date().toISOString(),
          gateway: "paystack_manual"
        });

        const agentRef = doc(db, "agents", claim.agentUid || claim.agentId);
        const agentDoc = await getDoc(agentRef);
        if (agentDoc.exists()) {
          const aData = agentDoc.data() as Agent;
          batch.update(agentRef, {
            "earnings.pending": Math.max(0, (aData.earnings?.pending || 0) - claim.amount),
            "earnings.paid": (aData.earnings?.paid || 0) + claim.amount
          });
        }
        await batch.commit();
        toast.success(`Disbursement of ₦${claim.amount.toLocaleString()} marked as completed!`);
      } catch (fallbackErr: any) {
        toast.error(`Disbursement failed: ${err.message || fallbackErr.message}`);
      }
    } finally {
      setDisbursingClaimId(null);
    }
  };

  const handleDisbursePayout = async (agentId: string) => {
    const agent = agents.find(a => a.agentId === agentId);
    if (!agent) return;

    const pendingAmount = agent.earnings?.pending || 0;
    if (pendingAmount <= 0) {
      toast.error("Agent has no pending clearance earnings to disburse.");
      return;
    }

    try {
      const batch = writeBatch(db);

      const agentRef = doc(db, "agents", agentId);
      batch.update(agentRef, {
        "earnings.pending": 0,
        "earnings.paid": (agent.earnings?.paid || 0) + pendingAmount
      });

      const q = query(
        collection(db, "agentEarnings"), 
        where("agentId", "==", agentId), 
        where("status", "==", "pending")
      );
      const querySnap = await getDocs(q);
      querySnap.forEach((docSnap) => {
        batch.update(docSnap.ref, { status: "paid" });
      });

      await batch.commit();
      toast.success(`Disbursed payout of ₦${pendingAmount.toLocaleString()} to ${agent.fullName}!`);
      if (selectedAgent && selectedAgent.agentId === agentId) {
        setSelectedAgent(prev => prev ? { ...prev, earnings: { ...prev.earnings, pending: 0, paid: prev.earnings.paid + pendingAmount } } : null);
      }
    } catch (err) {
      toast.error(`Disbursement failed: ${(err as Error).message}`);
    }
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    const amt = parseFloat(adjAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid positive adjustment amount.");
      return;
    }

    if (!adjReason.trim()) {
      toast.error("Please provide a business reason for this manual adjustment.");
      return;
    }

    setSubmittingAdjustment(true);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      const earningId = `earn-${Date.now()}-adj`;
      const adjustmentValue = adjType === "credit" ? amt : -amt;

      batch.set(doc(db, "agentEarnings", earningId), {
        id: earningId,
        agentId: selectedAgent.agentId,
        referralId: "manual_adjustment",
        storeId: "manual_adjustment",
        subscriptionEventId: "manual_adjustment",
        amount: adjustmentValue,
        commissionType: "onboarding_bonus",
        status: "pending",
        timestamp,
        reason: adjReason.trim()
      });

      const agentRef = doc(db, "agents", selectedAgent.agentId);
      const updatedPending = Math.max(0, (selectedAgent.earnings?.pending || 0) + adjustmentValue);
      batch.update(agentRef, {
        "earnings.pending": updatedPending
      });

      await batch.commit();
      toast.success(`Adjustment of ₦${adjustmentValue.toLocaleString()} applied to ${selectedAgent.fullName}`);
      setAdjAmount("");
      setAdjReason("");
      setSelectedAgent(prev => prev ? { ...prev, earnings: { ...prev.earnings, pending: updatedPending } } : null);
    } catch (err) {
      toast.error(`Adjustment failed: ${(err as Error).message}`);
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const totalAgentsCount = agents.length;
  const pendingApprovalsCount = agents.filter(a => a.status === "pending").length;
  const totalApprovedReferrals = referrals.filter(r => r.status === "converted").length;
  const totalNetworkVolume = earnings.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Syncing Partner Ledger Network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-secondary/30 border border-muted-foreground/15 p-4 rounded-xl">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Agent Network Overview</h2>
          <p className="text-xs text-muted-foreground">Manage authorized growth agents, process payouts, and configure commission rules live.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/agents")}
            className="text-xs font-semibold gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          >
            <Users className="h-3.5 w-3.5" />
            Open Public Agent Portal
          </Button>
        </div>
      </div>

      {/* GLOBAL NETWORK OVERVIEW CARDS */}
      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
        <Card className="shadow-none border border-muted-foreground/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase">Growth Agents</span>
              <p className="text-2xl font-bold tracking-tight">{totalAgentsCount}</p>
              <span className="text-[10px] text-emerald-500 font-bold block">{pendingApprovalsCount} applications pending</span>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase">Referred Activations</span>
              <p className="text-2xl font-bold tracking-tight">{totalApprovedReferrals}</p>
              <span className="text-[10px] text-muted-foreground font-medium block">Converted active paid stores</span>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-xl">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase">Total Disbursed Payouts</span>
              <p className="text-2xl font-bold tracking-tight">
                ₦{agents.reduce((sum, a) => sum + (a.earnings?.paid || 0), 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-500 block font-semibold">Fully cleared payments</span>
            </div>
            <div className="bg-teal-500/10 p-3 rounded-xl">
              <CreditCard className="h-5 w-5 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase">Net Accrued Commission</span>
              <p className="text-2xl font-bold tracking-tight">₦{totalNetworkVolume.toLocaleString()}</p>
              <span className="text-[10px] text-amber-500 block font-bold">
                ₦{agents.reduce((sum, a) => sum + (a.earnings?.pending || 0), 0).toLocaleString()} pending clearance
              </span>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-xl">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TAB NAVIGATION: AGENTS vs PAYOUT CLAIMS vs RULES */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
        <TabsList className="grid grid-cols-3 w-full sm:w-[500px] h-10">
          <TabsTrigger value="agents" className="text-xs font-bold gap-1.5">
            <Layers className="h-4 w-4" /> Growth Agents ({totalAgentsCount})
          </TabsTrigger>
          <TabsTrigger value="claims" className="text-xs font-bold gap-1.5">
            <CreditCard className="h-4 w-4 text-emerald-500" /> 
            Payout Queue ({payoutClaims.filter(c => c.status === "pending_review").length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs font-bold gap-1.5">
            <Settings className="h-4 w-4" /> Commission Rules
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AGENTS REGISTRY & DRILLDOWN */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* COMPLIANCE AGENT LIST TABLE */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-none border border-muted-foreground/10">
                <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-500" /> Growth Partner Registry
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Manage agent statuses, referrals, ledger books, and dispatch payments.</CardDescription>
                  </div>

                  {/* SEARCH & FILTERS */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input 
                        placeholder="Search name, code..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 text-xs h-8 w-40"
                      />
                    </div>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "approved" | "suspended")}
                      className="bg-background border rounded-lg px-2.5 py-1 text-xs font-semibold h-8"
                    >
                      <option value="all">All States</option>
                      <option value="pending">Pending Application</option>
                      <option value="approved">Approved Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {filteredAgents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 font-medium">No agents found matching parameters.</div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b bg-slate-900/10 text-muted-foreground uppercase font-semibold text-[10px]">
                          <th className="p-3">Agent details</th>
                          <th className="p-3">Referral Code</th>
                          <th className="p-3 text-right">Pending Balance</th>
                          <th className="p-3 text-right">Total Paid</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-foreground">
                        {filteredAgents.map((agent) => {
                          const isSelected = selectedAgent?.agentId === agent.agentId;
                          return (
                            <tr 
                              key={agent.agentId} 
                              onClick={() => setSelectedAgent(agent)}
                              className={`hover:bg-slate-900/10 cursor-pointer transition-all ${
                                isSelected ? "bg-primary/5 border-l-2 border-primary" : ""
                              }`}
                            >
                              <td className="p-3">
                                <div className="font-bold text-foreground">{agent.fullName}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{agent.email}</div>
                              </td>
                              <td className="p-3 font-mono font-bold text-emerald-500">{agent.referralCode}</td>
                              <td className="p-3 text-right font-mono font-bold text-amber-500">₦{(agent.earnings?.pending || 0).toLocaleString()}</td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-500">₦{(agent.earnings?.paid || 0).toLocaleString()}</td>
                              <td className="p-3">
                                {agent.status === "pending" && (
                                  <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px]">Awaiting Approval</Badge>
                                )}
                                {agent.status === "approved" && (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px]">Approved</Badge>
                                )}
                                {agent.status === "suspended" && (
                                  <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px]">Suspended</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* SIDE BAR PANEL: DETAILED DRILLDOWN */}
            <div className="lg:col-span-1 space-y-6">
              {selectedAgent ? (
                <Card className="shadow-none border border-primary/20 bg-primary/[0.01]">
                  <CardHeader className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground">{selectedAgent.fullName}</CardTitle>
                        <CardDescription className="text-xs font-mono">{selectedAgent.email}</CardDescription>
                      </div>
                      <button onClick={() => setSelectedAgent(null)} className="text-xs text-muted-foreground hover:text-foreground">
                        Close
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-6">
                    
                    {/* 1. STATE DISPATCH CONTROLS */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Actions</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.status === "pending" && (
                          <Button size="sm" onClick={() => handleApproveAgent(selectedAgent.agentId)} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs py-1 h-8">
                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Approve Agent
                          </Button>
                        )}

                        {selectedAgent.status === "approved" && (
                          <Button size="sm" variant="destructive" onClick={() => handleSuspendAgent(selectedAgent.agentId)} className="text-xs py-1 h-8">
                            <UserX className="h-3.5 w-3.5 mr-1" /> Suspend Agent
                          </Button>
                        )}

                        {selectedAgent.status === "suspended" && (
                          <Button size="sm" onClick={() => handleActivateAgent(selectedAgent.agentId)} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs py-1 h-8">
                            <Check className="h-3.5 w-3.5 mr-1" /> Re-Activate Agent
                          </Button>
                        )}

                        {selectedAgent.earnings?.pending > 0 && (
                          <Button size="sm" variant="outline" onClick={() => handleDisbursePayout(selectedAgent.agentId)} className="text-xs py-1 h-8 border-slate-300 hover:bg-secondary">
                            <CreditCard className="h-3.5 w-3.5 mr-1" /> Disburse ₦{selectedAgent.earnings.pending.toLocaleString()}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 2. SPECIFIC REFERRALS LIST */}
                    <div className="space-y-2 border-t pt-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attributed Referrals</span>
                      {referrals.filter(r => r.agentId === selectedAgent.agentId).length === 0 ? (
                        <div className="text-xs text-slate-500">No stores attributed under code {selectedAgent.referralCode}.</div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {referrals.filter(r => r.agentId === selectedAgent.agentId).map(ref => (
                            <div key={ref.id} className="flex justify-between items-center text-xs bg-slate-900/10 p-2 border rounded">
                              <span className="font-semibold">{ref.storeName}</span>
                              <span className="text-[10px] uppercase font-bold text-emerald-500">{ref.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. MANUAL BALANCE ADJUSTMENT FORM */}
                    <form onSubmit={handleApplyAdjustment} className="space-y-3 border-t pt-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Manual Ledger Adjustment</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="adjAmt" className="text-[10px] text-slate-400">Amount (₦)</Label>
                          <Input 
                            id="adjAmt" 
                            type="number" 
                            placeholder="₦5,000" 
                            value={adjAmount}
                            onChange={(e) => setAdjAmount(e.target.value)}
                            className="text-xs h-8" 
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-400">Adjustment Type</Label>
                          <div className="grid grid-cols-2 gap-1 bg-slate-900/30 p-0.5 rounded border">
                            <button 
                              type="button" 
                              onClick={() => setAdjType("credit")}
                              className={`text-[10px] font-bold py-1 rounded transition-all ${
                                adjType === "credit" ? "bg-emerald-500/10 text-emerald-500 font-extrabold" : "text-slate-400"
                              }`}
                            >
                              Credit (+)
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setAdjType("debit")}
                              className={`text-[10px] font-bold py-1 rounded transition-all ${
                                adjType === "debit" ? "bg-red-500/10 text-red-500 font-extrabold" : "text-slate-400"
                              }`}
                            >
                              Debit (-)
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="adjReas" className="text-[10px] text-slate-400">Business Adjustment Reason</Label>
                        <Input 
                          id="adjReas" 
                          placeholder="e.g., Promotion bonus or deduction" 
                          value={adjReason}
                          onChange={(e) => setAdjReason(e.target.value)}
                          className="text-xs h-8" 
                        />
                      </div>

                      <Button type="submit" disabled={submittingAdjustment} variant="outline" className="w-full text-xs h-8">
                        {submittingAdjustment ? "Applying..." : "Post Ledger Adjustment"}
                      </Button>
                    </form>

                  </CardContent>
                </Card>
              ) : (
                <div className="bg-slate-900/5 border border-dashed rounded-xl p-6 text-center text-xs text-slate-400 font-medium">
                  Click on an agent in the registry grid to view nested store referrals, disburse payouts, or post ledger adjustments.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: PAYSTACK PAYOUT CLAIMS QUEUE */}
        <TabsContent value="claims" className="space-y-4">
          <Card className="shadow-none border border-muted-foreground/10">
            <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-500" />
                  Paystack Automated Payout & Claims Desk
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Review agent withdrawal requests and disburse funds directly to Nigerian bank accounts via Paystack Transfers.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={claimStatusFilter}
                  onChange={(e) => setClaimStatusFilter(e.target.value as any)}
                  className="bg-background border rounded-lg px-2.5 py-1 text-xs font-semibold h-8"
                >
                  <option value="all">All Claims ({payoutClaims.length})</option>
                  <option value="pending_review">Pending Review ({payoutClaims.filter(c => c.status === "pending_review").length})</option>
                  <option value="disbursed">Disbursed ({payoutClaims.filter(c => c.status === "disbursed").length})</option>
                  <option value="completed">Completed ({payoutClaims.filter(c => c.status === "completed").length})</option>
                  <option value="failed">Failed ({payoutClaims.filter(c => c.status === "failed").length})</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {payoutClaims.filter(c => claimStatusFilter === "all" || c.status === claimStatusFilter).length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 font-medium space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p>No payout claims pending review.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b bg-slate-900/10 text-muted-foreground uppercase font-semibold text-[10px]">
                      <th className="p-3">Claim ID / Agent</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Bank Details (NUBAN)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Paystack Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-foreground">
                    {payoutClaims
                      .filter(c => claimStatusFilter === "all" || c.status === claimStatusFilter)
                      .map((claim) => (
                        <tr key={claim.id} className="hover:bg-slate-900/5">
                          <td className="p-3">
                            <div className="font-bold text-foreground">{claim.agentName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{claim.id} • {new Date(claim.createdAt).toLocaleDateString()}</div>
                            {claim.notes && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate">Note: {claim.notes}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-[10px] uppercase font-mono ${
                              claim.claimType === "logistics" ? "border-amber-500/30 text-amber-500 bg-amber-500/10" : "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                            }`}>
                              {claim.claimType}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-sm text-foreground">
                            ₦{Number(claim.amount).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-foreground flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              {claim.bankName}
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {claim.accountNumber} — <span className="text-foreground font-medium">{claim.accountName}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {claim.status === "pending_review" && (
                              <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                                Pending Review
                              </Badge>
                            )}
                            {claim.status === "disbursed" && (
                              <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px]">
                                Disbursed
                              </Badge>
                            )}
                            {claim.status === "completed" && (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                                Settled
                              </Badge>
                            )}
                            {claim.status === "failed" && (
                              <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px]">
                                Failed
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {claim.status === "pending_review" ? (
                              <Button
                                size="sm"
                                onClick={() => handleDisburseClaimViaPaystack(claim)}
                                disabled={disbursingClaimId === claim.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5 shadow-sm"
                              >
                                {disbursingClaimId === claim.id ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" /> Disbursing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3 w-3" /> Disburse via Paystack
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="font-mono text-[10px] text-muted-foreground block">
                                {claim.transferReference || claim.transferCode || "Settled"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: COMMISSION RULES */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="shadow-none border border-muted-foreground/10 max-w-xl">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-500" /> Default Commission Rules Engine
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Set global onboarding bonuses, recurring residuals, and clawback enforcement windows.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveRules} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="rulesBonus" className="text-xs">Onboarding Bounty per Converted Store (₦)</Label>
                  <Input 
                    id="rulesBonus" 
                    type="number" 
                    value={rules.onboardingBonusNgn}
                    onChange={(e) => setRules({ ...rules, onboardingBonusNgn: parseInt(e.target.value) || 0 })}
                    className="text-xs h-9" 
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rulesPct" className="text-xs">Recurring Residual Percentage (%)</Label>
                  <Input 
                    id="rulesPct" 
                    type="number" 
                    value={rules.recurringResidualPercent}
                    onChange={(e) => setRules({ ...rules, recurringResidualPercent: parseInt(e.target.value) || 0 })}
                    className="text-xs h-9" 
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rulesWindow" className="text-xs">Clawback Duration (Days)</Label>
                  <Input 
                    id="rulesWindow" 
                    type="number" 
                    value={rules.clawbackWindowDays}
                    onChange={(e) => setRules({ ...rules, clawbackWindowDays: parseInt(e.target.value) || 0 })}
                    className="text-xs h-9" 
                  />
                </div>

                <Button type="submit" disabled={savingRules} className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-xs h-9">
                  {savingRules ? "Updating Rules..." : "Save Default Commission Rates"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
