import React, { useState } from "react";
import { Flame, ShieldCheck, Award, Sparkles, Trophy, ChevronRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EngagementStreak, Achievement, MilestoneDefinition } from "@/lib/engagement-streaks";
import { AchievementsModal } from "./AchievementsModal";
import { useEngagementStreaks } from "@/hooks/useEngagementStreaks";
import { cn } from "@/lib/utils";

interface StreakCardWidgetProps {
  streak?: EngagementStreak | null;
  achievements?: Achievement[];
  milestones?: MilestoneDefinition[];
  onAcknowledgeBadge?: (id: string) => void;
  entityId?: string;
  entityType?: "store" | "agent";
  className?: string;
}

export function StreakCardWidget({
  streak: propStreak,
  achievements: propAchievements,
  milestones: propMilestones,
  onAcknowledgeBadge: propOnAcknowledgeBadge,
  entityId,
  entityType = "store",
  className,
}: StreakCardWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If entityId is provided, fallback to fetching data with hook
  const hookData = useEngagementStreaks(
    propStreak === undefined && entityId ? entityId : "",
    entityType
  );

  const streak = propStreak !== undefined ? propStreak : hookData.streak;
  const achievements = propAchievements !== undefined ? propAchievements : hookData.achievements;
  const milestones = propMilestones !== undefined ? propMilestones : hookData.milestones;
  const onAcknowledgeBadge = propOnAcknowledgeBadge || hookData.markAcknowledged;

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const freezesAvailable = streak?.freezesAvailable ?? 0;

  return (
    <>
      <div className={cn("rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow", className)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5 fill-amber-500/20 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-foreground text-lg leading-none">
                  {currentStreak} {currentStreak === 1 ? "Day" : "Days"}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-600 bg-amber-500/5 font-semibold">
                  Momentum
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Best Record: <span className="font-semibold text-foreground">{longestStreak} days</span>
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 text-xs gap-1 text-primary hover:text-primary/90 hover:bg-primary/5 px-2 font-medium"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span>Badges ({achievements.length})</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              {freezesAvailable > 0
                ? `${freezesAvailable} ${freezesAvailable === 1 ? "Streak Freeze" : "Streak Freezes"} Protected`
                : "Freezes replenish weekly"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>View Achievements</span>
          </button>
        </div>
      </div>

      <AchievementsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        achievements={achievements}
        milestones={milestones}
        currentStreak={currentStreak}
        onAcknowledge={onAcknowledgeBadge}
      />
    </>
  );
}
