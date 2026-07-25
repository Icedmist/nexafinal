import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Shield, Check, Scale } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "terms" | "privacy";
}

export function LegalModal({ isOpen, onClose, defaultTab = "terms" }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(defaultTab);
  const [accepted, setAccepted] = useState(false);
  const [acceptedDate, setAcceptedDate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      
      const isAccepted = localStorage.getItem("nexa_legal_accepted") === "true";
      const date = localStorage.getItem("nexa_legal_accepted_date");
      setAccepted(isAccepted);
      setAcceptedDate(date);
    }
  }, [isOpen, defaultTab]);

  const handleAccept = () => {
    const now = new Date().toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      dateStyle: "medium",
      timeStyle: "short",
    });
    localStorage.setItem("nexa_legal_accepted", "true");
    localStorage.setItem("nexa_legal_accepted_date", now);
    setAccepted(true);
    setAcceptedDate(now);
    toast.success("You have successfully accepted the Terms of Service and Privacy Policy.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent id="legal-dialog" className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-6 overflow-hidden gap-4">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-sans">
                Legal Agreements
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Please read and accept our agreements for using NexaStoreOS
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "terms" | "privacy")}
            className="w-full flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-2 mb-3 shrink-0">
              <TabsTrigger value="terms" className="flex items-center gap-2 py-2 text-xs">
                <FileText className="h-3.5 w-3.5" />
                Terms & Conditions
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2 py-2 text-xs">
                <Shield className="h-3.5 w-3.5" />
                Privacy Policy
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 bg-slate-50/50 rounded-lg border p-4 overflow-y-auto text-[13px] leading-relaxed text-slate-700">
              <TabsContent value="terms" className="mt-0 outline-none">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">1. Terms of Agreement</h3>
                    <p>
                      Welcome to NexaStoreOS, operated by Nexa Digital Solutions LTD ("Nexa", "we", "us", or "our"), 
                      located at Lamurde Street, Barade, Jalingo, Taraba State, Nigeria. By accessing our platform, website, 
                      or cloud interfaces, you agree to comply with and be bound by these Terms of Service.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">2. Store Owner Accounts & Security</h3>
                    <p>
                      To use NexaStoreOS, you must register and secure your credentials. You are solely responsible for 
                      all transactions processed under your store profile and the actions of staff members assigned 
                      to your account. You agree to notify us immediately of any unauthorized access or security breaches.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">3. Pricing, Subscriptions & Refunds</h3>
                    <p>
                      NexaStoreOS operates on a monthly subscription fee of <strong>₦6,500/month</strong>. All charges 
                      arise on a pre-paid basis. We provide a <strong>30-day zero-risk money-back guarantee</strong>. 
                      If our services do not bring cost savings or order clarity to your retail store within the first 
                      30 days, we will refund your subscription fee in full, no questions asked.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">4. Data Ownership & Availability</h3>
                    <p>
                      All business statistics, sales ledger documentation, debt profiles, and inventory details inputted 
                      remain your absolute property. We grant you complete export capabilities via standard Excel sheets 
                      at any time. We strive to maintain extreme data uptime (99.9% target) with automated hourly cloud backups.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">5. Appropriate Usage & Fair Limits</h3>
                    <p>
                      Our system is tailored strictly for legitimate retail management. Automated WhatsApp summaries, 
                      low-stock alerts, and financial intelligence tools must not be abused or manipulated to transmit spam content 
                      or unauthorized notifications.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">6. Governing Law</h3>
                    <p>
                      These terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. 
                      Any legal actions arising shall be brought before competent courts in Jalingo, Taraba State.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="mt-0 outline-none">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">1. Commitment to Privacy</h3>
                    <p>
                      Nexa Digital Solutions LTD respects your absolute business privacy. We align with the Nigerian Data 
                      Protection Regulation (NDPR) guidelines to ensure that all customer information, transaction receipts, 
                      and margin metrics are protected against unauthorized exploration or data mining.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">2. Information Collection & Usage</h3>
                    <p>
                      NexaStoreOS organizes store data to deliver your requested modules:
                    </p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li><strong>Inventory & Pricing:</strong> Registered to maintain catalog assets and trigger restocking alerts.</li>
                      <li><strong>Customer Debt Portfolios:</strong> Stored strictly to dispatch customer payment reminders via WhatsApp upon your prompt.</li>
                      <li><strong>Device Information:</strong> Collected to ensure secure local authentication across your staff tablets and smartphones.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">3. Safe Storage & Bank-Grade Security</h3>
                    <p>
                      All database queries are structured via industry-standard SSL encryption layers. Our local server nodes 
                      and backup facilities employ technical access control matrixes, ensuring that no employee has unauthorized 
                      visibility into your sales logs or operating margins.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">4. Data Retention</h3>
                    <p>
                      Upon subscription termination or account deletion, all active databases and custom cloud paths 
                      associated with your Jalingo store will be completely purged within 30 days unless a temporary legal pause 
                      is mandated.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-2 text-sm">5. Policy Updates</h3>
                    <p>
                      We may occasionally refine this Privacy Policy. Continued use of our landing frameworks or active dashboard 
                      represents your acknowledgment of updated terms. If you have concerns, speak directly with our team 
                      at Jalingo or write us at hello@nexastoreos.com.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="pt-2 border-t flex flex-col sm:flex-row gap-2 shrink-0 items-center justify-between">
          <div className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            {accepted ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Check className="h-4 w-4 stroke-[3]" />
                Accepted on {acceptedDate || "your profile"}
              </span>
            ) : (
              <span>By clicking accept, you agree to these legal frameworks.</span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              id="legal-close-button"
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial h-9"
              onClick={onClose}
            >
              Close
            </Button>
            {!accepted && (
              <Button
                id="legal-accept-button"
                size="sm"
                className="flex-1 sm:flex-initial h-9 font-semibold"
                onClick={handleAccept}
              >
                Accept Terms & Policy
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
