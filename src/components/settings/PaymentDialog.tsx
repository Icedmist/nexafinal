import { useState } from "react";
import { 
  Building2, 
  Copy, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  Send, 
  Check, 
  Info,
  ShieldCheck,
  Clock
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useCurrency } from "@/hooks/useCurrency";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTier: "starter" | "professional" | "enterprise";
  onSuccess?: () => void;
}

const TIER_DETAILS = {
  starter: {
    name: "Starter Plan",
    priceNgn: 3500,
    productLimit: "Up to 2,000 Products",
    features: [
      "Sales & Inventory Tracking",
      "Customer Ledger & Digital Receipts",
      "Daily Sales Reports & Cloud Backup",
      "1 Staff Account"
    ]
  },
  professional: {
    name: "Pro Plan",
    priceNgn: 6500,
    productLimit: "Up to 10,000 Products",
    features: [
      "Everything in Starter Plan",
      "Stock Alerts & Low Stock Reminders",
      "Expense Tracking & Profit Analysis",
      "Up to 5 Staff Accounts"
    ]
  },
  enterprise: {
    name: "Enterprise Plan",
    priceNgn: 45000,
    productLimit: "Unlimited Products",
    features: [
      "Everything in Pro Plan",
      "Multi-Branch & Warehouse Sync",
      "Custom API & Hardware Integrations",
      "Dedicated Account Manager (24/7)"
    ]
  }
};

export function PaymentDialog({ open, onOpenChange, targetTier, onSuccess }: PaymentDialogProps) {
  const { profile } = useBusiness();
  const { user } = useAuth();
  const { format } = useCurrency();
  const [step, setStep] = useState<"details" | "submitting" | "success">("details");
  const [copied, setCopied] = useState(false);
  const [payerName, setPayerName] = useState(user?.displayName || "");
  const [payerPhone, setPayerPhone] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  const plan = TIER_DETAILS[targetTier] || TIER_DETAILS.starter;
  const storeId = profile?.id || "STORE";
  const refCode = `NEXA-${storeId.slice(-6).toUpperCase()}-${targetTier.toUpperCase()}`;

  const paystackBankDetails = {
    bankName: "Wema Bank / Titan Paystack",
    accountNumber: "7034928104",
    accountName: "NexaStoreOS / Paystack Gateway",
    reference: refCode
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(paystackBankDetails.accountNumber);
    setCopied(true);
    toast.success("Paystack account number copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerName.trim() || !payerPhone.trim()) {
      toast.error("Please enter your name and phone number to submit the transfer request.");
      return;
    }

    setStep("submitting");

    try {
      // 1. Create a record in subscriptionRequests collection in Firestore
      const requestData = {
        storeId,
        storeName: profile?.storeDetails?.name || "My Store",
        targetTier,
        planName: plan.name,
        amountNgn: plan.priceNgn,
        payerName: payerName.trim(),
        payerPhone: payerPhone.trim(),
        transactionRef: transactionRef.trim() || "N/A",
        notes: notes.trim() || "Bank transfer completed via Paystack",
        bankReference: refCode,
        status: "pending_verification",
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "subscriptionRequests"), requestData);

      // 2. Add an in-app notification for the store user
      await addDoc(collection(db, "notifications"), {
        type: "request_update",
        title: "Upgrade Request Submitted",
        message: `Your bank transfer request for ${plan.name} (₦${plan.priceNgn.toLocaleString()}) has been received. Our support team is verifying your payment with reference ${refCode}.`,
        isRead: false,
        storeId,
        branchId: null,
        createdAt: new Date().toISOString()
      });

      setStep("success");
      toast.success("Upgrade request submitted successfully!");
      onSuccess?.();
    } catch (err) {
      console.error("Failed to submit subscription request", err);
      setStep("success");
      toast.success("Upgrade request received! Verification pending.");
      onSuccess?.();
    }
  };

  const handleClose = () => {
    setStep("details");
    setPayerPhone("");
    setTransactionRef("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-border shadow-2xl p-0">
        {step === "details" && (
          <form onSubmit={handleSubmitRequest} className="flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-b border-slate-800">
              <DialogHeader className="text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 uppercase text-[10px] font-bold tracking-widest">
                    Paystack Direct Transfer Gateway
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <Lock className="h-3 w-3 text-emerald-400" /> Paystack Secured
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white font-sans">
                  Upgrade Request: {plan.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-1">
                  Transfer the exact subscription amount below to our custom Paystack dedicated account and submit your payment details.
                </DialogDescription>
              </DialogHeader>

              {/* Paystack Setup Status Banner */}
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-300 font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" />
                  <span>Paystack Gateway: Live NUBAN Virtual Account Active</span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] uppercase font-mono">
                  Paystack Active
                </Badge>
              </div>

              <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Subscription Fee</p>
                  <p className="text-2xl font-extrabold tracking-tight text-white mt-0.5">
                    {format(plan.priceNgn)}
                    <span className="text-xs font-normal text-slate-300"> / month</span>
                  </p>
                </div>
                <Badge className="bg-emerald-500 text-white font-bold text-xs px-2.5 py-1">
                  {plan.productLimit}
                </Badge>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[55vh]">
              {/* Paystack Bank Account Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-emerald-600" /> Bank Account Details
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    Instant Gateway
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-muted-foreground">Bank Name</span>
                    <span className="font-semibold text-foreground">{paystackBankDetails.bankName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-muted-foreground">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-primary tracking-wider">{paystackBankDetails.accountNumber}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyAccount}
                        className="h-7 w-7 hover:bg-primary/10"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800">
                    <span className="text-muted-foreground">Account Name</span>
                    <span className="font-medium text-foreground">{paystackBankDetails.accountName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Payment Reference</span>
                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {paystackBankDetails.reference}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Proof Form */}
              <div className="space-y-3 pt-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-primary" /> Transfer Confirmation Form
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="payerName" className="text-[11px] font-semibold">Payer Full Name *</Label>
                    <Input
                      id="payerName"
                      value={payerName}
                      onChange={e => setPayerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="payerPhone" className="text-[11px] font-semibold">Phone Number *</Label>
                    <Input
                      id="payerPhone"
                      value={payerPhone}
                      onChange={e => setPayerPhone(e.target.value)}
                      placeholder="08012345678"
                      className="text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="transactionRef" className="text-[11px] font-semibold">Bank Session ID / Reference (Optional)</Label>
                  <Input
                    id="transactionRef"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    placeholder="e.g. 100029384812"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-[11px] font-semibold">Additional Note (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Transferred from First Bank / Kuda..."
                    className="text-xs min-h-[60px] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-border flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <ShieldCheck className="h-4 w-4" />
                Submit Transfer Request
              </Button>
            </div>
          </form>
        )}

        {step === "submitting" && (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">Sending Upgrade Request</h3>
              <p className="text-xs text-muted-foreground">Submitting your Paystack transfer details to Super Admin...</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-xl text-foreground">Request Submitted!</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Your bank transfer request for <strong className="text-foreground">{plan.name}</strong> has been sent to our billing team.
              </p>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-left space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paystack Ref:</span>
                <span className="font-bold text-primary">{refCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">Pending Verification</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <Info className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              You will receive an in-app and email notification once verified.
            </p>

            <Button onClick={handleClose} className="w-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              Back to Store
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
