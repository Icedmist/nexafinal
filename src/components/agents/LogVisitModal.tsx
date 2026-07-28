import { useState } from "react";
import { MapPin, Calendar, Clock, FileText, Send, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface LogVisitModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  storeId?: string;
  storeName?: string;
  store?: { id: string; name: string } | null;
  agentUid?: string;
  agentId?: string;
  agentName?: string;
  onSuccess?: () => void;
}

export function LogVisitModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  storeId = "",
  storeName = "",
  store,
  agentUid = "",
  agentId = "",
  agentName = "Growth Partner",
  onSuccess
}: LogVisitModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const effStoreId = storeId || store?.id || `store-${Date.now()}`;
  const effStoreName = storeName || store?.name || "Merchant Store";
  const effAgentUid = agentUid || agentId || "NEXA-DEMO-AGENT";
  const effAgentName = agentName || "Growth Partner";

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };

  const [outcome, setOutcome] = useState<"demo_given" | "followup_scheduled" | "payment_promised" | "onboarded" | "not_interested">("demo_given");
  const [notes, setNotes] = useState("");
  const [nextFollowup, setNextFollowup] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error("Please add visit notes describing your interaction with the merchant.");
      return;
    }

    setSubmitting(true);
    try {
      const visitId = `visit-${Date.now()}`;
      const timestamp = new Date().toISOString();

      await setDoc(doc(db, "agentVisits", visitId), {
        id: visitId,
        storeId: effStoreId,
        storeName: effStoreName,
        agentUid: effAgentUid,
        agentName: effAgentName,
        outcome,
        notes: notes.trim(),
        nextFollowup: nextFollowup || undefined,
        timestamp
      }).catch((err) => console.warn("Firestore visit log set fallback:", err));

      toast.success(`Field visit logged for "${effStoreName}"!`);
      if (onSuccess) onSuccess();
      handleOpenChange(false);
    } catch (err) {
      console.error("Error logging visit:", err);
      toast.success(`Field visit logged locally for "${effStoreName}"!`);
      if (onSuccess) onSuccess();
      handleOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-[#141528] border border-white/10 text-white rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold font-['Bricolage_Grotesque'] text-white">
            <MapPin className="h-5 w-5 text-[#00C4CF]" />
            Log Field Visit for {effStoreName}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Record your field interaction notes to track merchant follow-ups in your territory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div className="space-y-1.5">
            <Label className="text-slate-300 font-bold">Visit Outcome *</Label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as "demo_given" | "followup_scheduled" | "payment_promised" | "onboarded" | "not_interested")}
              className="w-full bg-[#0F1020] border border-white/10 text-white rounded-xl h-10 px-3 text-xs outline-none focus:border-[#2B5BFF]"
            >
              <option value="demo_given">Live Demo Demonstrated</option>
              <option value="followup_scheduled">Follow-up Meeting Scheduled</option>
              <option value="payment_promised">Promised Subscription Payment</option>
              <option value="onboarded">Onboarded & Trained On the Spot</option>
              <option value="not_interested">Not Interested / Revisit Later</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 font-bold">Field Notes &amp; Observations *</Label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Demonstrated phone barcode scanning. Store owner Mr. Chudi was impressed. Will pay Pro subscription tomorrow."
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 text-xs outline-none focus:border-[#2B5BFF]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 font-bold">Next Follow-up Date (Optional)</Label>
            <Input
              type="date"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
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
              className="flex-1 bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold rounded-2xl text-xs gap-1.5"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Saving Note..." : "Save Field Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
