import { useState } from "react";
import { 
  QrCode, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  Phone, 
  MapPin, 
  Building2, 
  ShieldCheck,
  Download
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AgentQrFlyerModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  agentName?: string;
  agentCode?: string;
  agentPhone?: string;
  agentRegion?: string;
  referralLink?: string;
}

export function AgentQrFlyerModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  agentName = "Growth Partner",
  agentCode = "NEXADEMO",
  agentPhone = "090-380-26109",
  agentRegion = "Taraba State",
  referralLink
}: AgentQrFlyerModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const effLink = referralLink || `${window.location.origin}/?ref=${agentCode}`;

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };

  const [copiedLink, setCopiedLink] = useState(false);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(effLink)}&color=0F1020&bgcolor=FFFFFF`;

  const copyLink = () => {
    navigator.clipboard.writeText(effLink);
    setCopiedLink(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `Hello Sir/Madam! 👋
I am ${agentName}, your official NexaStoreOS Growth Partner Agent in ${agentRegion}.

Scan this QR code or click the link below to get 12 Hours of free full POS access for your retail store:
${effLink}

Contact me directly at ${agentPhone} for instant store setup & training!`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-[#141528] border border-white/10 text-white rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-['Bricolage_Grotesque'] text-white">
            <QrCode className="h-6 w-6 text-[#00C4CF]" />
            Official Agent Digital Flyer &amp; QR Badge
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Show or print this official QR flyer when visiting retail merchants in your territory.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gradient-to-br from-[#1C1E3A] to-[#0F1020] border-2 border-[#2B5BFF]/30 rounded-3xl p-6 space-y-6 text-center shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="text-left">
              <span className="text-xs font-black tracking-wider text-white block">NexaStoreOS</span>
              <span className="text-[10px] text-[#00C4CF] font-bold block">Growth Partner Agent</span>
            </div>
            <Badge className="bg-emerald-500/20 text-[#4DE89A] border border-emerald-500/30 text-[9px] font-bold uppercase">
              Verified Agent
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl border-4 border-[#2B5BFF]/20">
              <img
                src={qrCodeUrl}
                alt="Agent Referral QR Code"
                className="w-44 h-44 mx-auto object-contain"
              />
            </div>
            <p className="text-[11px] font-semibold text-slate-300">
              Scan with phone camera to launch NexaStoreOS Trial
            </p>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-xs">
            <div className="font-extrabold text-base text-white">{agentName}</div>
            <div className="flex justify-center items-center gap-3 text-[11px] text-slate-300 font-mono flex-wrap">
              <span className="text-[#00C4CF] font-bold">ID: {agentCode}</span>
              <span>•</span>
              <span>📍 {agentRegion}</span>
              {agentPhone && (
                <>
                  <span>•</span>
                  <span>📞 {agentPhone}</span>
                </>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 leading-normal italic">
            Official Field Agent Representative for Nexa Digital Solutions LTD, Jalingo, Taraba State, Nigeria.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={copyLink}
            className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-2xl text-xs gap-1.5"
          >
            {copiedLink ? <Check className="h-4 w-4 text-[#4DE89A]" /> : <Copy className="h-4 w-4" />}
            {copiedLink ? "Copied Link!" : "Copy Referral Link"}
          </Button>

          <Button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex-1 bg-[#25D366] hover:bg-[#1EBE5A] text-slate-950 font-bold rounded-2xl text-xs gap-1.5 shadow-lg shadow-[#25D366]/20"
          >
            <Share2 className="h-4 w-4" />
            Share via WhatsApp
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold rounded-2xl text-xs gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
