import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreType, STORE_TYPE_OPTIONS, type StoreClientType } from "@/hooks/useStoreType";
import { toast } from "sonner";
import { Zap, Check, ShieldCheck } from "lucide-react";

interface StoreTypeOnboardingOverlayProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  forceShow?: boolean;
}

export function StoreTypeOnboardingOverlay({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  forceShow = false,
}: StoreTypeOnboardingOverlayProps) {
  const { storeType, setStoreType } = useStoreType();
  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !forceShow) {
      const hasOnboarded = localStorage.getItem("nexa_storetype_onboarded");
      if (!hasOnboarded) {
        setInternalOpen(true);
      }
    }
  }, [forceShow]);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(val);
    else setInternalOpen(val);
  };

  const handleSelectOneTap = (typeId: StoreClientType) => {
    setStoreType(typeId);
    if (typeof window !== "undefined") {
      localStorage.setItem("nexa_storetype_onboarded", "true");
    }
    const option = STORE_TYPE_OPTIONS.find((o) => o.id === typeId);
    toast.success(`1-Tap Preference Saved! Workspace adapted to ${option?.title || typeId}.`, {
      description: "Sales POS layout, pricing controls, and dashboard metrics updated instantly.",
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl p-6 sm:p-8 rounded-3xl border-border bg-card shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Zap className="h-5 w-5 fill-emerald-500/20" />
            </div>
            <div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-2.5 py-0.5 font-bold uppercase tracking-wider">
                1-Tap Workspace Customization
              </Badge>
            </div>
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
            What type of store do you run?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Select your primary business model in one tap. We will automatically tailor your POS checkout buttons, unit converters, inventory metrics, and sales dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 my-4 sm:grid-cols-3">
          {STORE_TYPE_OPTIONS.map((opt) => {
            const isSelected = storeType === opt.id;
            return (
              <div
                key={opt.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectOneTap(opt.id); } }}
                onClick={() => handleSelectOneTap(opt.id)}
                className={`cursor-pointer group relative p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 ${opt.borderColor} ${isSelected ? "bg-gradient-to-b from-card to-emerald-500/5 ring-2 ring-emerald-500 border-emerald-500 shadow-md" : "bg-card/80 hover:bg-muted/40 hover:shadow-sm"}`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{opt.icon}</span>
                    <Badge variant="secondary" className="text-[10px] font-bold">{opt.badge}</Badge>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{opt.title}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-snug">{opt.tagline}</p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  {opt.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                      <span className="line-clamp-1">{feat}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 w-full">
                  <Button size="sm" variant={isSelected ? "default" : "outline"} className={`w-full text-xs font-bold rounded-xl h-8 transition-all ${isSelected ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "group-hover:border-emerald-500/50"}`}>
                    {isSelected ? "Active Mode" : "Tap to Select"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            You can switch your store mode anytime from the header switch
          </span>
          <Button variant="ghost" size="sm" onClick={() => { if (typeof window !== "undefined") localStorage.setItem("nexa_storetype_onboarded", "true"); setIsOpen(false); }} className="text-xs text-muted-foreground hover:text-foreground h-7">
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
