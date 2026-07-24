import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Lock,
  Clock,
  Send,
  Copy,
  Check,
  Smartphone,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Users,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { generateDemoPassUrl } from "@/lib/demo-security";
import { getWhatsAppUrl } from "@/lib/whatsapp";

interface DemoPassGeneratorModalProps {
  defaultAgentName?: string;
  onClose?: () => void;
}

export function DemoPassGeneratorModal({
  defaultAgentName = "Stackwise Field Agent",
  onClose,
}: DemoPassGeneratorModalProps) {
  const [agentName, setAgentName] = useState(defaultAgentName);
  const [prospectName, setProspectName] = useState("");
  const [hours, setHours] = useState<number>(12);
  const [copied, setCopied] = useState(false);
  const [generatedPass, setGeneratedPass] = useState<null | {
    url: string;
    tokenId: string;
    expiresAtFormatted: string;
  }>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const pass = generateDemoPassUrl(agentName || "Stackwise Field Agent", hours);
    setGeneratedPass(pass);
    toast.success(`12-Hour Device-Locked Demo Link generated for ${prospectName || "Prospect"}!`);
  };

  const handleCopy = () => {
    if (!generatedPass) return;
    navigator.clipboard.writeText(generatedPass.url);
    setCopied(true);
    toast.success("Demo Pass URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!generatedPass) return;
    const msg = `*Stackwise 12-Hour Merchant Demo Access Pass*\n\nHello ${
      prospectName || "Partner"
    },\nHere is your exclusive 12-hour interactive demo pass for Stackwise POS & Multi-Store Inventory System.\n\n🔗 *Demo Link:* ${
      generatedPass.url
    }\n\n⚠️ *Device Security Lock:* This pass is valid for 12 hours once opened on your device. For questions or account activation, contact ${agentName}.`;

    const waUrl = getWhatsAppUrl("", msg);
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="shadow-2xl border border-muted-foreground/20 max-w-xl w-full mx-auto bg-card text-foreground">
      <CardHeader className="bg-primary/5 border-b border-muted-foreground/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold font-sans flex items-center gap-2 text-primary">
              <Lock className="h-5 w-5 text-primary" /> Secure 12-Hour Device-Locked Demo Pass
            </CardTitle>
            <CardDescription className="text-xs">
              Generate a time-restricted interactive demo link for prospect merchants. Tied to a 12-hour countdown on the prospect's device upon opening.
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="agent-name" className="text-xs font-semibold flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary" /> Agent Tag / Representative
              </Label>
              <Input
                id="agent-name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Agent John Doe"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prospect-name" className="text-xs font-semibold flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-emerald-500" /> Prospect Merchant Name
              </Label>
              <Input
                id="prospect-name"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                placeholder="e.g. Apex Pharmacy Ltd"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Device Access Pass Expiry Hours
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={hours === 12 ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 flex-1 font-bold"
                onClick={() => setHours(12)}
              >
                12 Hours (Standard)
              </Button>
              <Button
                type="button"
                variant={hours === 24 ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 flex-1 font-bold"
                onClick={() => setHours(24)}
              >
                24 Hours (Extended)
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full text-xs font-bold h-9 bg-primary hover:bg-primary/95 text-primary-foreground gap-2 shadow-md"
          >
            <Sparkles className="h-4 w-4 text-amber-400" /> Generate Device-Locked Demo Link
          </Button>
        </form>

        {/* Generated Demo Link Output */}
        {generatedPass && (
          <div className="p-4 bg-muted/20 border border-primary/20 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold uppercase">
                <ShieldAlert className="h-3 w-3 mr-1" /> 12-Hour Security Lock Active
              </Badge>
              <span className="text-[11px] text-muted-foreground font-mono">
                Expires: {generatedPass.expiresAtFormatted}
              </span>
            </div>

            <div className="p-2.5 bg-background rounded-lg border border-muted-foreground/15 font-mono text-xs break-all text-primary select-all">
              {generatedPass.url}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                className="text-xs h-8 gap-1.5 flex-1 font-bold"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied Link!" : "Copy Link"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-bold flex-1"
                onClick={handleWhatsAppShare}
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-500" /> Share via WhatsApp
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-8 gap-1.5 font-bold"
                onClick={() => window.open(generatedPass.url, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Test Demo Link
              </Button>
            </div>
          </div>
        )}

        {/* Security Rule Explanation Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
          <p className="font-bold flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Device Lock Enforcement Rules:
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
            <li>Once opened on the merchant's phone or computer browser, the 12-hour countdown locks to that device.</li>
            <li>After 12 hours elapse, access on that device is automatically revoked with an agent contact prompt.</li>
            <li>Prevents unauthorized perpetual usage while enabling frictionless field demonstrations.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
