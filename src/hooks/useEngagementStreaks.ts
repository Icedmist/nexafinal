import { useState, useEffect, useCallback } from "react";
import {
  EngagementStreak,
  Achievement,
  MilestoneDefinition,
  fetchStreak,
  fetchAchievements,
  recordQualifyingActivity,
  checkAndGrantMilestones,
  acknowledgeAchievement,
  getLocalMilestones,
  setLocalMilestones,
} from "@/lib/engagement-streaks";
import { toast } from "sonner";

export function useEngagementStreaks(entityId: string, entityType: "store" | "agent" = "store") {
  const [streak, setStreak] = useState<EngagementStreak | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<MilestoneDefinition[]>(getLocalMilestones());
  const [loading, setLoading] = useState<boolean>(true);

  const loadStreakData = useCallback(async () => {
    if (!entityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const currentStreak = await fetchStreak(entityId, entityType);
      const achievementList = await fetchAchievements(entityId);
      setStreak(currentStreak);
      setAchievements(achievementList);
    } catch (err) {
      console.error("Failed loading engagement streaks:", err);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  const recordActivity = useCallback(
    async (activityType: "sale" | "transfer" | "report" | "catalog_add" | "agent_action") => {
      if (!entityId) return null;
      const res = await recordQualifyingActivity(entityId, entityType, activityType);
      setStreak(res.streak);

      if (res.freezeUsed) {
        toast.info("Streak Protected!", {
          description: `Your active day was protected using a weekly freeze. Current streak: ${res.streak.currentStreak} days 🔥`,
        });
      } else if (res.newlyStarted) {
        toast.success("New Streak Started Today! 🔥", {
          description: "Keep up the great business momentum!",
        });
      }

      // Re-fetch achievements in case milestone was triggered
      const updatedAchievements = await fetchAchievements(entityId);
      setAchievements(updatedAchievements);
      return res;
    },
    [entityId, entityType]
  );

  const triggerMilestone = useCallback(
    async (triggerCondition: string) => {
      if (!entityId) return null;
      const newAchievement = await checkAndGrantMilestones(entityId, entityType, triggerCondition);
      if (newAchievement) {
        const updatedAchievements = await fetchAchievements(entityId);
        setAchievements(updatedAchievements);
      }
      return newAchievement;
    },
    [entityId, entityType]
  );

  const markAcknowledged = useCallback(
    async (achievementDocId: string) => {
      if (!entityId) return;
      await acknowledgeAchievement(entityId, achievementDocId);
      setAchievements((prev) =>
        prev.map((a) => (a.id === achievementDocId ? { ...a, acknowledged: true } : a))
      );
    },
    [entityId]
  );

  const updateMilestonesConfig = useCallback((newDefs: MilestoneDefinition[]) => {
    setLocalMilestones(newDefs);
    setMilestones(newDefs);
    toast.success("Milestone configuration updated successfully!");
  }, []);

  const unacknowledged = achievements.filter((a) => !a.acknowledged);

  return {
    streak,
    achievements,
    unacknowledged,
    milestones,
    loading,
    recordActivity,
    triggerMilestone,
    markAcknowledged,
    updateMilestonesConfig,
    refreshStreak: loadStreakData,
  };
}
