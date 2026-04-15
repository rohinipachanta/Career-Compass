/**
 * shared/schema.ts
 *
 * Firestore-backed type definitions and Zod validation schemas.
 * All IDs are Firestore document ID strings.
 */

import { z } from "zod";

// ── Core types ────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  username: string;
  password: string;
  email?: string | null;
  weeklyReminder: boolean;
  coachingCount: number;
  xp: number;
  level: number;
  reviewDraft?: string | null;
  reviewDraftUpdatedAt?: Date | null;
  role?: string | null;
  careerJourney?: string | null;
  team?: string | null;
  company?: string | null;
  profileContext?: string | null;
  profileCompletedAt?: Date | null;
};

export type Achievement = {
  id: string;
  userId: string;
  title: string;
  achievementDate: string;
  coachingResponse?: string | null;
  xpEarned: number;
  createdAt: Date;
  feedbackType: string;
  source: string;
  fromPerson?: string | null;
  isConfirmed: number;
  dismissedAt?: Date | null;
  seasonId?: string | null;
};

export type Badge = {
  id: string;
  userId: string;
  type: string;
  awardedAt: Date;
};

export type Season = {
  id: string;
  userId: string;
  name: string;
  reviewContent?: string | null;
  archivedAt: Date;
};

export type Goal = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  archivedAt?: Date | null;
  seasonId?: string | null;
};

export type AchievementGoal = {
  id: string;
  achievementId: string;
  goalId: string;
};

export type PushSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
};

// ── Insert types ──────────────────────────────────────────────────────────────

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type InsertBadge = { userId: string; type: string };
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type InsertPushSubscription = { userId: string; endpoint: string; p256dh: string; auth: string };

// ── Zod validation schemas ────────────────────────────────────────────────────

export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.preprocess(
    (val) => (val === "" || val == null ? undefined : val),
    z.string().email("Please enter a valid email address").optional()
  ),
});

export const insertAchievementSchema = z.object({
  title: z.string().min(1),
  achievementDate: z.string(),
  feedbackType: z.string().optional(),
  source: z.string().optional(),
  fromPerson: z.string().optional(),
  isConfirmed: z.number().optional(),
});

export const insertSeasonSchema = z.object({
  name: z.string(),
  reviewContent: z.string().optional(),
}).partial({ reviewContent: true });

export const insertGoalSchema = z.object({
  title: z.string().min(1),
}).strict();

export const insertBadgeSchema = z.object({
  userId: z.string(),
  type: z.string(),
});

export const insertAchievementGoalSchema = z.object({
  achievementId: z.string(),
  goalId: z.string(),
});

// Dummy exports kept for any import compatibility (not used with Firestore)
export const pushSubscriptions = null as any;
export const achievements = null as any;
export const users = null as any;
export const seasons = null as any;
export const goals = null as any;
export const achievementGoals = null as any;
export const badges = null as any;
