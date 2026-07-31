import { useState } from "react";
import { useDemo } from "@/hooks/useDemo";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Play,
  RotateCcw,
  LogOut,
  Lock,
  Smartphone,
  ShieldAlert,
  Building2,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { DemoPassGeneratorModal } from "@/components/shared/DemoPassGeneratorModal";

const BUSINESS_PRESETS = [
  { id: "general", label: "General Supermarket & Retail", desc: "Standard FMCG items, barcode SKUs, wholesale & retail prices" },
  { id: "pharmacy", label: "Pharmacy & Drug Library", desc: "Medication dosages, batch numbers, expiry warnings, and prescriptions" },
  { id: "textile", label: "Textile, Fabric & Fashion", desc: "Roll/Yard conversions, Ankara prints, size/color variant matrices" },
  { id: "agriculture", label: "Agro-Allied & Grain Feeds", desc: "Bag/Kg unit conversions, livestock feeds, fertilizer supply logs" },
  { id: "wholesale", label: "Wholesale & Multi-Branch", desc: "Carton/Piece conversions, manager movement debt logs, credit sales" },
];

export function DemoModeHelpSection() {
  const { isDemo, enterDemoMode, exitDemoMode, resetDemoData } = useDemo();
  const [selectedType, setSelectedType] = useState("general");
  const [showPassModal, setShowPassModal] = useState(false);

  const handleLaunchDemo = (typeId?: string) => {
    const targetType = typeId || selectedType;
    enterDemoMode({
      businessType: targetType,
      categories: [],
      storeName: `NexaOS Demo (${targetType.toUpperCase()})`,
      storePhone: "+234 800 DEMO POS",
      storeAddress: "12 Commerce Avenue, Victoria Island, Lagos",
      receiptFooter: "Thank you for shopping with NexaOS Demo Store!",
      taxRate: 7.5,
      currency: "NGN",
      country: "Nigeria",
    });
    toast.success(`Demo Mode launched with ${targetType.toUpperCase()} sample dataset!`);
  };

  const handleReset = () => {
    resetDemoData();
    toast.success("Demo dataset refreshed to initial factory state!");
  };

  const handleExit = () => {
    exitDemoMode();
    toast.info("Exited Demo Mode. Returned to Live Production Environment.");
  };

  return (
    <div className="space-y-6">
      {/* Current Mode Banner */}
      <Card className={`border shadow-sm overflow-hidden ${isDemo ? "border-amber-500/30 bg-amber-500/5" : "border-primary/20 bg-card"}`}>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    isDemo
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold uppercase text-[10px]"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase text-[10px]"
                  }
                >
                  {isDemo ? "🟢 Demo Mode Active" : "⚪ Live Production Mode"}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {isDemo ? "Using Isolated Sandbox Store" : "Connected to Live Store Database"}
                </span>
              </div>

              <CardTitle className="text-lg font-bold font-sans text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Interactive Field Demo Sandbox & Pass Generator
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Practice cashier sales, multi-branch stock transfers, and manager debt records without affecting your live production database.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isDemo ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-9 font-semibold gap-1.5"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset Dataset
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs h-9 font-semibold gap-1.5"
                    onClick={handleExit}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Exit Demo
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="text-xs h-9 font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm"
                  onClick={() => handleLaunchDemo("general")}
                >
                  <Play className="h-4 w-4 fill-current" /> Activate Demo Mode Now
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-4 text-xs space-y-4">
          <div className="p-3.5 rounded-xl bg-background border border-border grid sm:grid-cols-3 gap-3 text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Zero-Risk Practice</span>
                <span>Test sales, debts, and returns safely.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Multi-Branch Sample Data</span>
                <span>Preloaded with items, suppliers, and POs.</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground block">Device Demo Link</span>
                <span>Share 12h passes with prospective clients.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Industry Business Presets for Demo Mode */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Choose Industry Sample Dataset for Demo Mode:
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 font-bold border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => setShowPassModal(true)}
          >
            <Lock className="h-3.5 w-3.5 text-amber-500" /> Generate 12h Device Demo Link
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {BUSINESS_PRESETS.map((preset) => (
            <Card
              key={preset.id}
              className={`p-4 border transition-all hover:border-primary/50 cursor-pointer space-y-2 relative ${
                selectedType === preset.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
              }`}
              onClick={() => setSelectedType(preset.id)}
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                  {preset.id.toUpperCase()}
                </Badge>
                {selectedType === preset.id && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </div>

              <div>
                <h4 className="font-bold text-xs text-foreground">{preset.label}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{preset.desc}</p>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs h-7 font-semibold text-primary hover:bg-primary/10 gap-1 justify-between pt-1 border-t border-border/50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLaunchDemo(preset.id);
                }}
              >
                <span>Launch {preset.label.split(" ")[0]} Demo</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal for 12h Pass Generator */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <DemoPassGeneratorModal onClose={() => setShowPassModal(false)} />
        </div>
      )}
    </div>
  );
}
