import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Award,
  ShoppingBag,
  ArrowRightLeft,
  FileText,
  Flame,
  Crown,
  UserPlus,
  Sparkles,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Achievement, MilestoneDefinition } from "@/lib/engagement-streaks";

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
  milestones: MilestoneDefinition[];
  currentStreak: number;
  onAcknowledge?: (id: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag,
  Award,
  ArrowRightLeft,
  FileText,
  Flame,
  Crown,
  UserPlus,
  Sparkles,
  Trophy,
};

export function AchievementsModal({
  isOpen,
  onClose,
  achievements,
  milestones,
  currentStreak,
  onAcknowledge,
}: AchievementsModalProps) {
  const earnedTypes = new Set(achievements.map((a) => a.milestoneType));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span>Store Milestones & Achievements</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Earn badged milestones and streak protections by running your everyday business operations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Earned Badges Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>Earned Badges ({achievements.length})</span>
              <span className="text-[11px] font-normal text-emerald-600 font-medium">Positive Business Impact</span>
            </h3>

            {achievements.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center bg-muted/20">
                <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-xs font-medium text-foreground">No milestones unlocked yet</p>
                <p className="text-[11px] text-muted-foreground">Complete your first sale or report export to unlock badges!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {achievements.map((ach) => {
                  const IconComp = ICON_MAP[ach.badgeIcon] || Award;
                  return (
                    <div
                      key={ach.id}
                      className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3 shadow-2xs relative overflow-hidden"
                    >
                      <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <IconComp className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-foreground truncate">{ach.title}</p>
                          <Badge className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20 text-[9px] font-bold border-none px-1.5 py-0">
                            Unlocked
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{ach.description}</p>
                        <p className="text-[10px] text-muted-foreground/80 font-mono pt-1">
                          Achieved: {new Date(ach.achievedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Locked / Upcoming Milestones */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Available Milestones & Goals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {milestones.map((m) => {
                const isEarned = earnedTypes.has(m.triggerCondition);
                if (isEarned) return null; // Already shown in earned section

                const IconComp = ICON_MAP[m.badgeIcon] || Award;
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-border bg-card/60 flex items-start gap-3 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-foreground truncate">{m.name}</p>
                        {m.bonusFreeze && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                            +1 Freeze
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{m.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onClose} className="text-xs font-semibold">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
