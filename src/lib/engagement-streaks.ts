import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc } from "firebase/firestore";

export interface EngagementStreak {
  id: string; // e.g. "store_store123" or "agent_agent123"
  entityId: string;
  entityType: "store" | "agent";
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  freezesAvailable: number;
  freezesUsedThisWeek: number;
  lastFreezeReplenishDate: string; // YYYY-MM-DD
  updatedAt: string; // ISO
}

export interface Achievement {
  id: string; // e.g. "store123_first_sale"
  achievementId: string;
  entityId: string;
  entityType: "store" | "agent";
  milestoneType: string;
  title: string;
  description: string;
  badgeIcon: string;
  achievedAt: string; // ISO
  acknowledged: boolean;
}

export interface MilestoneDefinition {
  id: string;
  name: string;
  triggerCondition: string; // e.g. "first_sale", "sale_100", "first_transfer", "first_report", "catalog_100", "streak_7", "streak_30", "first_referral"
  badgeIcon: string;
  description: string;
  bonusFreeze?: boolean;
  entityType: "store" | "agent" | "both";
}

export const DEFAULT_MILESTONES: MilestoneDefinition[] = [
  {
    id: "first_sale",
    name: "First Sale Recorded",
    triggerCondition: "first_sale",
    badgeIcon: "ShoppingBag",
    description: "Rang up your very first sale on NEXAOS!",
    bonusFreeze: false,
    entityType: "store",
  },
  {
    id: "sale_100",
    name: "Century Seller",
    triggerCondition: "sale_100",
    badgeIcon: "Award",
    description: "Completed 100 sales across your storefronts!",
    bonusFreeze: true,
    entityType: "store",
  },
  {
    id: "first_transfer",
    name: "Inter-Branch Logistics",
    triggerCondition: "first_transfer",
    badgeIcon: "ArrowRightLeft",
    description: "Completed your first cross-branch inventory request!",
    bonusFreeze: false,
    entityType: "store",
  },
  {
    id: "first_report",
    name: "Business Analyst",
    triggerCondition: "first_report",
    badgeIcon: "FileText",
    description: "Exported your first PDF financial or inventory report!",
    bonusFreeze: false,
    entityType: "store",
  },
  {
    id: "streak_7",
    name: "7-Day Consistency",
    triggerCondition: "streak_7",
    badgeIcon: "Flame",
    description: "Maintained active business momentum for 7 consecutive days!",
    bonusFreeze: true,
    entityType: "both",
  },
  {
    id: "streak_30",
    name: "Monthly Powerhouse",
    triggerCondition: "streak_30",
    badgeIcon: "Crown",
    description: "30 consecutive active days recorded! Unstoppable drive.",
    bonusFreeze: true,
    entityType: "both",
  },
  {
    id: "first_referral",
    name: "Growth Ambassador",
    triggerCondition: "first_referral",
    badgeIcon: "UserPlus",
    description: "Referred your first merchant store to NEXAOS!",
    bonusFreeze: false,
    entityType: "agent",
  },
  {
    id: "referral_10",
    name: "Expansion Leader",
    triggerCondition: "referral_10",
    badgeIcon: "Sparkles",
    description: "Successfully connected 10 merchant businesses to NEXAOS!",
    bonusFreeze: true,
    entityType: "agent",
  },
];

// Local storage keys for fallback/demo
const LOCAL_STREAKS_KEY = "nexaos_engagement_streaks";
const LOCAL_ACHIEVEMENTS_KEY = "nexaos_achievements";
const LOCAL_MILESTONES_KEY = "nexaos_milestone_definitions";

function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysBetween(dateStr1: string, dateStr2: string): number {
  if (!dateStr1 || !dateStr2) return 999;
  const d1 = new Date(dateStr1 + "T00:00:00");
  const d2 = new Date(dateStr2 + "T00:00:00");
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Memory / LocalStorage getters & setters
function getLocalStreak(docId: string): EngagementStreak | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_STREAKS_KEY}_${docId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalStreak(streak: EngagementStreak) {
  try {
    localStorage.setItem(`${LOCAL_STREAKS_KEY}_${streak.id}`, JSON.stringify(streak));
  } catch {
    // silent
  }
}

function getLocalAchievements(entityId: string): Achievement[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_ACHIEVEMENTS_KEY}_${entityId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalAchievements(entityId: string, achievements: Achievement[]) {
  try {
    localStorage.setItem(`${LOCAL_ACHIEVEMENTS_KEY}_${entityId}`, JSON.stringify(achievements));
  } catch {
    // silent
  }
}

export function getLocalMilestones(): MilestoneDefinition[] {
  try {
    const raw = localStorage.getItem(LOCAL_MILESTONES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_MILESTONES;
  } catch {
    return DEFAULT_MILESTONES;
  }
}

export function setLocalMilestones(milestones: MilestoneDefinition[]) {
  try {
    localStorage.setItem(LOCAL_MILESTONES_KEY, JSON.stringify(milestones));
  } catch {
    // silent
  }
}

/**
 * Fetch or initialize the engagement streak for a store or agent
 */
export async function fetchStreak(entityId: string, entityType: "store" | "agent"): Promise<EngagementStreak> {
  const docId = `${entityType}_${entityId}`;
  const today = getLocalDateString();

  let streak: EngagementStreak | null = null;

  try {
    const ref = doc(db, "engagementStreaks", docId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      streak = snap.data() as EngagementStreak;
    }
  } catch {
    // Fallback to localStorage
    streak = getLocalStreak(docId);
  }

  if (!streak) {
    // Initialize default streak
    streak = {
      id: docId,
      entityId,
      entityType,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      freezesAvailable: 1,
      freezesUsedThisWeek: 0,
      lastFreezeReplenishDate: today,
      updatedAt: new Date().toISOString(),
    };
  }

  // Check if weekly freeze replenishment is due (>7 days since last replenishment)
  if (streak.lastFreezeReplenishDate) {
    const daysSinceReplenish = getDaysBetween(streak.lastFreezeReplenishDate, today);
    if (daysSinceReplenish >= 7) {
      streak.freezesAvailable = Math.min(3, streak.freezesAvailable + 1);
      streak.freezesUsedThisWeek = 0;
      streak.lastFreezeReplenishDate = today;
      streak.updatedAt = new Date().toISOString();
      await saveStreak(streak);
    }
  }

  return streak;
}

/**
 * Save streak to Firestore & localStorage
 */
export async function saveStreak(streak: EngagementStreak): Promise<void> {
  setLocalStreak(streak);
  try {
    const ref = doc(db, "engagementStreaks", streak.id);
    await setDoc(ref, streak, { merge: true });
  } catch {
    // offline or permissions error handles gracefully
  }
}

/**
 * Record a qualifying business activity (sale, transfer, report, etc.)
 * Safely updates streak without punitive messages.
 */
export async function recordQualifyingActivity(
  entityId: string,
  entityType: "store" | "agent",
  activityType: "sale" | "transfer" | "report" | "catalog_add" | "agent_action"
): Promise<{ streak: EngagementStreak; freezeUsed: boolean; newlyStarted: boolean }> {
  if (!entityId) {
    return {
      streak: {
        id: "",
        entityId: "",
        entityType,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
        freezesAvailable: 1,
        freezesUsedThisWeek: 0,
        lastFreezeReplenishDate: getLocalDateString(),
        updatedAt: new Date().toISOString(),
      },
      freezeUsed: false,
      newlyStarted: false,
    };
  }

  const streak = await fetchStreak(entityId, entityType);
  const today = getLocalDateString();
  const lastActive = streak.lastActiveDate;

  let freezeUsed = false;
  let newlyStarted = false;

  if (lastActive === today) {
    // Already active today! Return existing streak
    return { streak, freezeUsed: false, newlyStarted: false };
  }

  if (!lastActive) {
    // First activity ever!
    streak.currentStreak = 1;
    streak.longestStreak = Math.max(streak.longestStreak, 1);
    streak.lastActiveDate = today;
    newlyStarted = true;
  } else {
    const daysDiff = getDaysBetween(lastActive, today);

    if (daysDiff === 1) {
      // Consecutive day!
      streak.currentStreak += 1;
      streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
      streak.lastActiveDate = today;
    } else if (daysDiff === 2) {
      // Missed 1 day (e.g., active on Mon, today is Wed)
      if (streak.freezesAvailable > 0) {
        // Silently consume freeze and preserve streak!
        streak.freezesAvailable -= 1;
        streak.freezesUsedThisWeek += 1;
        streak.currentStreak += 1; // Preserve and increment
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
        streak.lastActiveDate = today;
        freezeUsed = true;
      } else {
        // No freeze available: start new streak today neutrally
        streak.currentStreak = 1;
        streak.lastActiveDate = today;
        newlyStarted = true;
      }
    } else {
      // Missed >1 days: start new streak today neutrally (longest streak preserved!)
      streak.currentStreak = 1;
      streak.lastActiveDate = today;
      newlyStarted = true;
    }
  }

  streak.updatedAt = new Date().toISOString();
  await saveStreak(streak);

  // Check milestone triggers for streaks (7-day, 30-day)
  if (streak.currentStreak >= 7) {
    await checkAndGrantMilestones(entityId, entityType, "streak_7");
  }
  if (streak.currentStreak >= 30) {
    await checkAndGrantMilestones(entityId, entityType, "streak_30");
  }

  return { streak, freezeUsed, newlyStarted };
}

/**
 * Fetch achievements for an entity
 */
export async function fetchAchievements(entityId: string): Promise<Achievement[]> {
  let achievements: Achievement[] = [];

  try {
    const q = query(collection(db, "achievements"), where("entityId", "==", entityId));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      achievements.push(d.data() as Achievement);
    });
  } catch {
    achievements = getLocalAchievements(entityId);
  }

  if (achievements.length === 0) {
    achievements = getLocalAchievements(entityId);
  }

  return achievements;
}

/**
 * Check and grant milestone if achieved
 */
export async function checkAndGrantMilestones(
  entityId: string,
  entityType: "store" | "agent",
  triggerCondition: string
): Promise<Achievement | null> {
  if (!entityId) return null;

  const milestones = getLocalMilestones();
  const definition = milestones.find((m) => m.triggerCondition === triggerCondition);
  if (!definition) return null;

  const existingList = await fetchAchievements(entityId);
  const alreadyAchieved = existingList.some((a) => a.milestoneType === triggerCondition);

  if (alreadyAchieved) return null;

  const docId = `${entityId}_${triggerCondition}`;
  const newAchievement: Achievement = {
    id: docId,
    achievementId: definition.id,
    entityId,
    entityType,
    milestoneType: triggerCondition,
    title: definition.name,
    description: definition.description,
    badgeIcon: definition.badgeIcon,
    achievedAt: new Date().toISOString(),
    acknowledged: false,
  };

  // Save achievement
  const updatedList = [...existingList, newAchievement];
  setLocalAchievements(entityId, updatedList);

  try {
    const ref = doc(db, "achievements", docId);
    await setDoc(ref, newAchievement, { merge: true });
  } catch {
    // offline handling
  }

  // If definition awards bonus freeze, add 1 freeze to streak
  if (definition.bonusFreeze) {
    try {
      const streak = await fetchStreak(entityId, entityType);
      streak.freezesAvailable = Math.min(5, streak.freezesAvailable + 1);
      await saveStreak(streak);
    } catch {
      // safe ignore
    }
  }

  return newAchievement;
}

/**
 * Mark an achievement as acknowledged by user
 */
export async function acknowledgeAchievement(entityId: string, achievementDocId: string): Promise<void> {
  const achievements = getLocalAchievements(entityId);
  const updated = achievements.map((a) => (a.id === achievementDocId ? { ...a, acknowledged: true } : a));
  setLocalAchievements(entityId, updated);

  try {
    const ref = doc(db, "achievements", achievementDocId);
    await updateDoc(ref, { acknowledged: true });
  } catch {
    // safe ignore
  }
}
