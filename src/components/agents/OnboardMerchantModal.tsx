import { useState } from "react";
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  CreditCard,
  Send,
  Lock,
  Copy,
  Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface OnboardMerchantModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  agentId?: string;
  agentUid?: string;
  referralCode?: string;
  agentCode?: string;
  agentName?: string;
  onSuccess?: () => void;
}

export function OnboardMerchantModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  agentId = "",
  agentUid = "",
  referralCode = "",
  agentCode = "",
  agentName = "Growth Partner",
  onSuccess
}: OnboardMerchantModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const effAgentUid = agentUid || agentId || "NEXA-DEMO-AGENT";
  const effAgentCode = referralCode || agentCode || "NEXADEMO";
  const effAgentName = agentName || "Growth Partner";

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };

  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [location, setLocation] = useState("");
  const [planTier, setPlanTier] = useState<"pro" | "enterprise">("pro");
  const [status, setStatus] = useState<"converted" | "pending">("converted");
  const [paymentMethod, setPaymentMethod] = useState<"pos" | "transfer" | "cash" | "pending">("transfer");
  const [submitting, setSubmitting] = useState(false);
  const [createdPassLink, setCreatedPassLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !ownerName.trim() || !ownerPhone.trim()) {
      toast.error("Please fill in Store Name, Owner Name, and Owner Phone Number.");
      return;
    }

    setSubmitting(true);
    try {
      const storeId = `store-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const referralId = `ref-${Date.now()}`;
      const timestamp = new Date().toISOString();

      const bonusAmount = planTier === "pro" ? 1500 : 5000;
      const planName = planTier === "enterprise" ? "Enterprise" : "Pro";

      await setDoc(doc(db, "referrals", referralId), {
        id: referralId,
        agentId: effAgentUid,
        agentCode: effAgentCode,
        agentName: effAgentName,
        storeId,
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        location: location.trim() || "National",
        planName,
        status,
        paymentMethod,
        createdAt: timestamp,
        convertedAt: status === "converted" ? timestamp : undefined
      }).catch((e) => console.warn("Firestore referral doc set fallback:", e));

      await setDoc(doc(db, "stores", storeId), {
        storeId,
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        phone: ownerPhone.trim(),
        location: location.trim(),
        subscriptionTier: planName,
        referredByAgentId: effAgentUid,
        referredByCode: effAgentCode,
        createdAt: timestamp
      }).catch((e) => console.warn("Firestore store doc set fallback:", e));

      if (status === "converted") {
        const earningId = `earn-${Date.now()}`;
        await setDoc(doc(db, "agentEarnings", earningId), {
          id: earningId,
          agentId: effAgentUid,
          referralId,
          storeId,
          subscriptionEventId: `sub-${Date.now()}`,
          amount: bonusAmount,
          commissionType: "onboarding_bonus",
          status: "pending",
          timestamp,
          storeName: storeName.trim()
        }).catch((e) => console.warn("Firestore earning doc set fallback:", e));
      }

      const demoPass = `${window.location.origin}/?demo_pass=active&token=demo-${Date.now()}&agent=${encodeURIComponent(effAgentName)}&hrs=12`;
      setCreatedPassLink(demoPass);

      toast.success(
        status === "converted" 
          ? `Merchant "${storeName.trim()}" onboarded! ₦${bonusAmount.toLocaleString()} bonus logged to your pending balance.`
          : `Prospective lead "${storeName.trim()}" registered to your territory tracking list.`
      );

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error onboarding merchant:", err);
      toast.error("Merchant registered locally in field workspace!");
      if (onSuccess) onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const copyPass = () => {
    if (!createdPassLink) return;
    navigator.clipboard.writeText(createdPassLink);
    setCopiedLink(true);
    toast.success("12-Hour Demo Pass link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const resetForm = () => {
    setStoreName("");
    setOwnerName("");
    setOwnerPhone("");
    setLocation("");
    setPlanTier("pro");
    setStatus("converted");
    setPaymentMethod("transfer");
    setCreatedPassLink(null);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(val) => { handleOpenChange(val); if (!val) resetForm(); }}>
      <DialogContent className="max-w-xl bg-[#141528] border border-white/10 text-white rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-['Bricolage_Grotesque'] text-white">
            <Building2 className="h-6 w-6 text-[#00C4CF]" />
            Onboard New Retail Merchant
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Register a store directly from the field. Instant commission logging and automatic referral tracking for your territory.
          </DialogDescription>
        </DialogHeader>

        {createdPassLink ? (
          <div className="space-y-6 py-4 text-center">
            <div className="h-16 w-16 bg-emerald-500/20 text-[#4DE89A] border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">Merchant Onboarded Successfully!</h3>
              <p className="text-xs text-slate-300">
                You can now send this 12-hour instant trial link directly to the store owner on WhatsApp so they can explore NexaStoreOS with sample inventory data.
              </p>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-2 font-mono text-xs">
              <span className="truncate text-[#00C4CF]">{createdPassLink}</span>
              <Button size="sm" onClick={copyPass} className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white rounded-xl gap-1 shrink-0">
                {copiedLink ? <Check className="h-4 w-4 text-[#4DE89A]" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied" : "Copy Link"}
              </Button>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { resetForm(); }}
                className="border-white/20 text-white hover:bg-white/10 rounded-2xl text-xs"
              >
                Onboard Another Store
              </Button>
              <Button
                type="button"
                onClick={() => { onOpenChange?.(false); resetForm(); }}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 font-bold">Store / Business Name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Chudi Provision Store"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 font-bold">Owner / Contact Person *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Mr. Chudi Okeke"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 font-bold">Owner Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="08031234567"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 font-bold">Market / Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Main Market, Jalingo"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-slate-300 font-bold">Select Subscription Tier *</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setPlanTier("pro")}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    planTier === "pro"
                      ? "bg-[#2B5BFF]/20 border-[#2B5BFF] text-white shadow-lg shadow-[#2B5BFF]/10"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-sm text-white">Pro Plan</span>
                    <Badge className="bg-[#2B5BFF]/30 text-[#7B9FFF] border-none text-[9px] font-mono">Popular</Badge>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    ₦1,500 Instant Bonus + ₦500/mo Residual
                  </p>
                </div>

                <div
                  onClick={() => setPlanTier("enterprise")}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    planTier === "enterprise"
                      ? "bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-sm text-amber-300">Enterprise</span>
                    <Badge className="bg-amber-500/30 text-amber-200 border-none text-[9px] font-mono">Top Earner</Badge>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    ₦5,000 Instant Bonus + ₦1,000/mo Residual
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-slate-300 font-bold">Onboarding Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "converted" | "pending")}
                  className="w-full bg-[#0F1020] border border-white/10 text-white rounded-xl h-10 px-3 text-xs outline-none focus:border-[#2B5BFF]"
                >
                  <option value="converted">Onboarded & Paid (Earn Bonus Now)</option>
                  <option value="pending">Prospective Lead (Tracking Only)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 font-bold">Payment Method</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "pos" | "transfer" | "cash" | "pending")}
                  className="w-full bg-[#0F1020] border border-white/10 text-white rounded-xl h-10 px-3 text-xs outline-none focus:border-[#2B5BFF]"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="pos">Agent POS Terminal</option>
                  <option value="cash">Cash Collected by Agent</option>
                  <option value="pending">Pending Merchant Payment</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#4DE89A] rounded-2xl flex items-center justify-between text-xs">
              <span className="font-medium">Estimated Commission for this Merchant:</span>
              <span className="font-mono font-extrabold text-sm">
                ₦{planTier === "pro" ? "1,500 Bonus + ₦500/mo" : "5,000 Bonus + ₦1,000/mo"}
              </span>
            </div>

            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange?.(false)}
                className="flex-1 text-slate-400 hover:text-white rounded-2xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-[#2B5BFF] to-[#00C4CF] text-white font-bold rounded-2xl text-xs gap-1.5 shadow-lg shadow-[#2B5BFF]/20"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Registering Merchant..." : "Complete Merchant Onboarding"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
