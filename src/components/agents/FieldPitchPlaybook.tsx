import { useState } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  Calculator, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  TrendingUp, 
  ShieldAlert,
  WifiOff,
  BookOpen,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FieldPitchPlaybookProps {
  referralCode?: string;
}

export function FieldPitchPlaybook({ referralCode = "AGENT" }: FieldPitchPlaybookProps) {
  const [openObjection, setOpenObjection] = useState<number | null>(0);
  const [dailyTurnover, setDailyTurnover] = useState<number>(85000);
  const [shrinkageRate, setShrinkageRate] = useState<number>(4);
  const [copiedPitch, setCopiedPitch] = useState<boolean>(false);

  const dailyLoss = (dailyTurnover * shrinkageRate) / 100;
  const monthlyLoss = dailyLoss * 26;
  const yearlyLoss = monthlyLoss * 12;
  const nexaProCostYearly = 36000;
  const netYearlySavings = yearlyLoss - nexaProCostYearly;

  const OBJECTIONS = [
    {
      title: "1. 'I already write everything down in my physical hardcover notebook. Why change?'",
      icon: BookOpen,
      iconColor: "text-amber-400",
      category: "Paper vs Digital",
      response: "Oga/Madam, notebooks don't calculate your total profit, don't notify you when Peak Milk or Indomie is running out, and cannot stop stock from quietly disappearing when you leave your shop with attendants. NexaStoreOS gives you full control right from your phone so you never lose a single Naira.",
      keyPoints: [
        "Automatic stock deductions on every barcode scan or quick sale.",
        "Instant WhatsApp & Bluetooth receipt printing for customers.",
        "Daily profit & loss summary calculated automatically — no midnight maths."
      ]
    },
    {
      title: "2. 'Network is slow or absent in our market. How can a software work here?'",
      icon: WifiOff,
      iconColor: "text-blue-400",
      category: "Offline Architecture",
      response: "NexaStoreOS was built specifically for Nigerian markets! It runs 100% offline using local browser storage (IndexedDB). Your sales cashier can keep scanning, printing receipts, and checking out customers even when there is zero MTN/Airtel network. Once network comes back, it syncs safely to the cloud.",
      keyPoints: [
        "100% offline POS scan & checkout capability.",
        "No network delay during peak customer queues.",
        "Automatic background sync when connection restores."
      ]
    },
    {
      title: "3. 'My store attendants might steal stock or tamper with sales records.'",
      icon: ShieldAlert,
      iconColor: "text-red-400",
      category: "Anti-Theft & Audit",
      response: "With NexaStoreOS, attendants cannot edit selling prices, delete sales history, or give unrecorded discounts unless you give them manager permission. Every single item scanned is logged with exact time and user ID, making stock audit instantaneous.",
      keyPoints: [
        "Role-based cashier permissions (Cashier vs Store Owner).",
        "Stock audit log tracking every item scanned or updated.",
        "Instant low-stock alerts before items run out completely."
      ]
    },
    {
      title: "4. 'I am not tech-savvy and don't know how to operate complicated computers.'",
      icon: Sparkles,
      iconColor: "text-[#00C4CF]",
      category: "Ease of Use",
      response: "If you can use WhatsApp or dial a phone number, you can use NexaStoreOS in 3 minutes! You can scan items with your phone camera, tap quick sale tiles, or speak item names. I will set up your store and train you on the spot in 5 minutes.",
      keyPoints: [
        "Instant camera barcode scanner & quick scan checkout.",
        "Built-in voice product searching in English & Pidgin.",
        "Free 12-hour demo pass to try without paying a dime."
      ]
    }
  ];

  const generateWhatsAppPitch = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    const message = `Hello Sir/Madam! 👋

I am your local NexaStoreOS Growth Partner in Taraba/Nigeria.

Did you know that manual bookkeeping errors & untracked stock leakage cost the average retail store up to ₦${monthlyLoss.toLocaleString()}/month?

With NexaStoreOS Pro:
✅ Works 100% Offline in markets with zero network
✅ Fast Phone Camera Barcode Scanner & Receipt Printing
✅ Stops store attendant theft with secure Cashier Access
✅ Auto-calculates your exact daily profit & inventory alerts

Try a FREE 12-Hour Full Trial now (No Payment Required):
👉 ${link}

Call or WhatsApp me for instant setup & free 5-minute training!`;

    navigator.clipboard.writeText(message);
    setCopiedPitch(true);
    toast.success("WhatsApp pitch summary copied to clipboard!");
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#141528] border border-white/10 text-white rounded-2xl p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#00C4CF]/20 text-[#00C4CF] border-none text-[10px] font-bold uppercase">
              Field Agent Toolkit
            </Badge>
          </div>
          <h2 className="text-xl font-bold font-['Bricolage_Grotesque'] text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#4DE89A]" />
            Field Objection Playbook & Merchant ROI Pitch Calculator
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Equip yourself with proven field objection scripts tailored for Nigerian retail merchants, and use the interactive ROI calculator to show store owners exact monthly savings.
          </p>
        </div>
      </Card>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#7B9FFF]" />
              Common Market Objections & Counter-Scripts
            </h3>
            <span className="text-[10px] text-slate-400">Tap to expand playbook</span>
          </div>

          <div className="space-y-3">
            {OBJECTIONS.map((obj, idx) => {
              const IconComp = obj.icon;
              const isOpen = openObjection === idx;

              return (
                <div 
                  key={idx}
                  className="bg-[#141528] border border-white/10 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenObjection(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-white/5 rounded-xl ${obj.iconColor}`}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{obj.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{obj.category}</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="p-4 pt-0 border-t border-white/5 space-y-3 text-xs">
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-[#4DE89A] uppercase block">💡 Recommended Script to Say:</span>
                        <p className="text-slate-200 leading-relaxed italic">"{obj.response}"</p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Key Selling Points to Emphasize:</span>
                        <ul className="space-y-1 text-slate-300 pl-4 list-disc text-[11px]">
                          {obj.keyPoints.map((kp, kIdx) => (
                            <li key={kIdx}>{kp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-[#141528] border border-white/10 text-white rounded-2xl p-6 space-y-5">
            <div className="space-y-1 border-b border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-['Bricolage_Grotesque']">
                  <Calculator className="h-4 w-4 text-amber-400" />
                  Merchant Savings ROI Calculator
                </h3>
                <Badge className="bg-amber-500/20 text-amber-300 border-none text-[9px]">Live Tool</Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Input the store's estimated daily sales to demonstrate how NexaStoreOS pays for itself in savings.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <Label className="font-bold">Estimated Daily Store Turnover (₦)</Label>
                  <span className="font-mono font-bold text-[#00C4CF]">₦{dailyTurnover.toLocaleString()}</span>
                </div>
                <Input
                  type="number"
                  step={5000}
                  min={10000}
                  max={2000000}
                  value={dailyTurnover}
                  onChange={(e) => setDailyTurnover(Number(e.target.value) || 0)}
                  className="bg-white/5 border-white/10 text-white font-mono rounded-xl h-10 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <Label className="font-bold">Estimated Theft/Error Loss (%)</Label>
                  <span className="font-mono font-bold text-amber-300">{shrinkageRate}% Loss</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={shrinkageRate}
                  onChange={(e) => setShrinkageRate(Number(e.target.value))}
                  className="w-full accent-[#00C4CF] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1% (Low)</span>
                  <span>4% (Retail Avg)</span>
                  <span>15% (High Loss)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-left">
                  <span className="text-[10px] text-red-300 font-bold uppercase block">Monthly Loss Wasted</span>
                  <span className="font-mono font-black text-white text-base">
                    ₦{Math.round(monthlyLoss).toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Without NexaStoreOS</span>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-left">
                  <span className="text-[10px] text-[#4DE89A] font-bold uppercase block">Net Annual Savings</span>
                  <span className="font-mono font-black text-[#4DE89A] text-base">
                    ₦{Math.round(netYearlySavings).toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">After NexaOS Pro Fee</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={generateWhatsAppPitch}
                className="w-full bg-[#25D366] hover:bg-[#1EBE5A] text-slate-950 font-bold rounded-2xl text-xs gap-2 py-3 shadow-lg shadow-[#25D366]/20"
              >
                {copiedPitch ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedPitch ? "Copied Pitch to Clipboard!" : "Copy ROI Pitch for Store Owner (WhatsApp)"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
