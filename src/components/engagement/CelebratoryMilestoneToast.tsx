import React, { useEffect, useState } from "react";
import { Sparkles, Trophy, Award, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Achievement } from "@/lib/engagement-streaks";

interface CelebratoryMilestoneToastProps {
  unacknowledged: Achievement[];
  onAcknowledge: (id: string) => void;
}

export function CelebratoryMilestoneToast({
  unacknowledged,
  onAcknowledge,
}: CelebratoryMilestoneToastProps) {
  const [current, setCurrent] = useState<Achievement | null>(null);

  useEffect(() => {
    if (unacknowledged.length > 0) {
      setCurrent(unacknowledged[0]);
    } else {
      setCurrent(null);
    }
  }, [unacknowledged]);

  if (!current) return null;

  const handleDismiss = () => {
    onAcknowledge(current.id);
    setCurrent(null);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="rounded-2xl border-2 border-amber-500/40 bg-card p-4 shadow-xl text-card-foreground flex flex-col gap-3 relative overflow-hidden backdrop-blur-md">
        {/* Accent background glow */}
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/15 blur-xl pointer-events-none" />

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="h-5 w-5 text-amber-500 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Milestone Unlocked!
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground leading-tight">{current.title}</h4>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground h-6 w-6 rounded-md flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed pl-0.5">
          {current.description}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
          <Button
            size="sm"
            onClick={handleDismiss}
            className="h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shadow-2xs"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Awesome, Got It!</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
