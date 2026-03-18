import { users, achievements, badges, seasons, goals, achievementGoals, type User, type InsertUser, type Achievement, type InsertAchievement, type Badge, type InsertBadge, type Season, type Goal, type InsertGoal } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, isNull, isNotNull, gte } from "drizzle-orm";
import { encryptText, decryptText } from "./encryption";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAchievements(userId: number): Promise<Achievement[]>;
  getDismissedAchievements(userId: number): Promise<Achievement[]>;
  createAchievement(userId: number, achievement: InsertAchievement): Promise<Achievement>;
  getAchievement(id: number): Promise<Achievement | undefined>;
  updateAchievement(id: number, coachingResponse: string): Promise<void>;
  editAchievement(id: number, title: string, feedbackType: string, achievementDate: string): Promise<void>;
  confirmAchievement(id: number): Promise<void>;
  deleteAchievement(id: number): Promise<void>;   // soft-delete (sets dismissed_at)
  restoreAchievement(id: number): Promise<void>;  // clears dismissed_at
  incrementCoachingCount(userId: number): Promise<number>;
  updateUserPassword(id: number, password: string): Promise<void>;
  updateUserEmail(id: number, email: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateWeeklyReminder(id: number, enabled: boolean): Promise<void>;
  getAllUsersWithReminders(): Promise<User[]>;
  getBadges(userId: number): Promise<Badge[]>;
  awardBadge(userId: number, type: string): Promise<void>;
  // Review draft auto-save
  getReviewDraft(userId: number): Promise<{ content: string | null; updatedAt: Date | null }>;
  saveReviewDraft(userId: number, content: string): Promise<void>;
  clearReviewDraft(userId: number): Promise<void>;
  // Seasons (review-cycle archives)
  createSeason(userId: number, name: string, reviewContent: string | null): Promise<Season>;
  getSeasons(userId: number): Promise<Season[]>;
  getSeason(id: number): Promise<Season | undefined>;
  archiveCurrentWins(userId: number, seasonId: number): Promise<void>;
  getSeasonAchievements(seasonId: number): Promise<Achievement[]>;
  // Profile
  getProfile(userId: number): Promise<Partial<User> | undefined>;
  updateProfile(userId: number, profile: { role?: string; careerJourney?: string; team?: string; company?: string; profileContext?: string; profileCompletedAt?: Date }): Promise<void>;
  // Goals
  createGoal(userId: number, title: string): Promise<Goal>;
  getGoals(userId: number): Promise<Goal[]>;
  archiveGoal(goalId: number): Promise<void>;
  archiveCurrentGoals(userId: number, seasonId: number): Promise<void>;
  tagAchievementToGoals(achievementId: number, goalIds: number[]): Promise<void>;
  getGoalProgress(userId: number): Promise<Array<{ goal: Goal; winCount: number; lastWinDate: Date | null; needsNudge: boolean }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAchievements(userId: number): Promise<Achievement[]> {
    const rawAchievements = await db
      .select()
      .from(achievements)
      .where(sql`${achievements.userId} = ${userId} AND ${achievements.dismissedAt} IS NULL AND ${achievements.seasonId} IS NULL`)
      .orderBy(desc(achievements.achievementDate), desc(achievements.id));
    
    // Decrypt achievement titles
    const decryptedAchievements = await Promise.all(
      rawAchievements.map(async (achievement) => ({
        ...achievement,
        title: await decryptText(achievement.title),
      }))
    );
    
    return decryptedAchievements;
  }

  async createAchievement(userId: number, insertAchievement: InsertAchievement): Promise<Achievement> {
    const xpEarned = 10;
    
    // Encrypt the achievement title before storing
    const encryptedTitle = await encryptText(insertAchievement.title);
    
    // Apply explicit defaults for optional fields to avoid NOT NULL violations
    const [achievement] = await db
      .insert(achievements)
      .values({
        ...insertAchievement,
        title:        encryptedTitle,
        userId,
        xpEarned,
        feedbackType: insertAchievement.feedbackType ?? "win",
        source:       insertAchievement.source       ?? "self",
        isConfirmed:  insertAchievement.isConfirmed  ?? 1,
      })
      .returning();

    // Update user XP and level
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user) {
      const newXp = (user.xp || 0) + xpEarned;
      const newLevel = Math.floor(newXp / 50) + 1;
      await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, userId));
      
      // Check for badges
      const userAchievements = await this.getAchievements(userId);
      if (userAchievements.length === 1) {
        await this.awardBadge(userId, 'first_achievement');
      } else if (userAchievements.length === 5) {
        await this.awardBadge(userId, 'five_achievements');
      }
    }
    
    // Return decrypted version for immediate display
    return {
      ...achievement,
      title: insertAchievement.title, // Return original unencrypted title
    };
  }

  async getBadges(userId: number): Promise<Badge[]> {
    return db.select().from(badges).where(eq(badges.userId, userId));
  }

  async awardBadge(userId: number, type: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(badges)
      .where(sql`${badges.userId} = ${userId} AND ${badges.type} = ${type}`);
    
    if (!existing) {
      await db.insert(badges).values({ userId, type });
    }
  }

  async getAchievement(id: number): Promise<Achievement | undefined> {
    // NOTE: does NOT filter by dismissedAt — this lets the restore route find dismissed items
    const [achievement] = await db.select().from(achievements).where(eq(achievements.id, id));
    if (!achievement) return undefined;
    return { ...achievement, title: await decryptText(achievement.title) };
  }

  async updateAchievement(id: number, coachingResponse: string): Promise<void> {
    await db.update(achievements).set({ coachingResponse }).where(eq(achievements.id, id));
  }

  async editAchievement(id: number, title: string, feedbackType: string, achievementDate: string): Promise<void> {
    const encryptedTitle = await encryptText(title);
    await db.update(achievements)
      .set({ title: encryptedTitle, feedbackType, achievementDate })
      .where(eq(achievements.id, id));
  }

  async confirmAchievement(id: number): Promise<void> {
    await db.update(achievements).set({ isConfirmed: 1 }).where(eq(achievements.id, id));
  }

  async getDismissedAchievements(userId: number): Promise<Achievement[]> {
    const rawAchievements = await db
      .select()
      .from(achievements)
      .where(sql`${achievements.userId} = ${userId} AND ${achievements.dismissedAt} IS NOT NULL AND ${achievements.seasonId} IS NULL`)
      .orderBy(desc(achievements.dismissedAt));
    return Promise.all(
      rawAchievements.map(async (a) => ({ ...a, title: await decryptText(a.title) }))
    );
  }

  async deleteAchievement(id: number): Promise<void> {
    // Soft-delete: set dismissed_at so the item can be restored later
    await db.update(achievements).set({ dismissedAt: new Date() }).where(eq(achievements.id, id));
  }

  async restoreAchievement(id: number): Promise<void> {
    await db.update(achievements).set({ dismissedAt: null }).where(eq(achievements.id, id));
  }

  async incrementCoachingCount(userId: number): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const newCount = (user?.coachingCount || 0) + 1;
    await db.update(users).set({ coachingCount: newCount }).where(eq(users.id, userId));
    return newCount;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, id));
  }

  async updateUserEmail(id: number, email: string): Promise<void> {
    await db.update(users).set({ email: email.toLowerCase().trim() }).where(eq(users.id, id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));
    return user;
  }

  async updateWeeklyReminder(id: number, enabled: boolean): Promise<void> {
    await db.update(users).set({ weeklyReminder: enabled }).where(eq(users.id, id));
  }

  async getAllUsersWithReminders(): Promise<User[]> {
    return db.select().from(users).where(eq(users.weeklyReminder, true));
  }

  // ── Review draft auto-save ────────────────────────────────────────────────
  async getReviewDraft(userId: number): Promise<{ content: string | null; updatedAt: Date | null }> {
    const [user] = await db.select({ reviewDraft: users.reviewDraft, reviewDraftUpdatedAt: users.reviewDraftUpdatedAt })
      .from(users).where(eq(users.id, userId));
    return { content: user?.reviewDraft ?? null, updatedAt: user?.reviewDraftUpdatedAt ?? null };
  }

  async saveReviewDraft(userId: number, content: string): Promise<void> {
    await db.update(users)
      .set({ reviewDraft: content, reviewDraftUpdatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async clearReviewDraft(userId: number): Promise<void> {
    await db.update(users)
      .set({ reviewDraft: null, reviewDraftUpdatedAt: null })
      .where(eq(users.id, userId));
  }

  // ── Seasons ───────────────────────────────────────────────────────────────
  async createSeason(userId: number, name: string, reviewContent: string | null): Promise<Season> {
    const [season] = await db.insert(seasons).values({ userId, name, reviewContent }).returning();
    return season;
  }

  async getSeasons(userId: number): Promise<Season[]> {
    return db.select().from(seasons).where(eq(seasons.userId, userId)).orderBy(desc(seasons.archivedAt));
  }

  async getSeason(id: number): Promise<Season | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id));
    return season;
  }

  async archiveCurrentWins(userId: number, seasonId: number): Promise<void> {
    // Move all active, non-dismissed, current-season wins into the archive
    await db.update(achievements)
      .set({ seasonId })
      .where(sql`${achievements.userId} = ${userId} AND ${achievements.dismissedAt} IS NULL AND ${achievements.seasonId} IS NULL`);
  }

  async getSeasonAchievements(seasonId: number): Promise<Achievement[]> {
    const rawAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.seasonId, seasonId))
      .orderBy(desc(achievements.achievementDate), desc(achievements.id));
    return Promise.all(
      rawAchievements.map(async (a) => ({ ...a, title: await decryptText(a.title) }))
    );
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  async getProfile(userId: number): Promise<Partial<User> | undefined> {
    const [user] = await db
      .select({
        role: users.role,
        careerJourney: users.careerJourney,
        team: users.team,
        company: users.company,
        profileContext: users.profileContext,
        profileCompletedAt: users.profileCompletedAt,
      })
      .from(users)
      .where(eq(users.id, userId));
    return user;
  }

  async updateProfile(userId: number, profile: { role?: string; careerJourney?: string; team?: string; company?: string; profileContext?: string; profileCompletedAt?: Date }): Promise<void> {
    const updateData: any = {};
    if (profile.role !== undefined) updateData.role = profile.role || null;
    if (profile.careerJourney !== undefined) updateData.careerJourney = profile.careerJourney || null;
    if (profile.team !== undefined) updateData.team = profile.team || null;
    if (profile.company !== undefined) updateData.company = profile.company || null;
    if (profile.profileContext !== undefined) updateData.profileContext = profile.profileContext || null;
    if (profile.profileCompletedAt !== undefined) updateData.profileCompletedAt = profile.profileCompletedAt;

    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  // ── Goals ──────────────────────────────────────────────────────────────────
  async createGoal(userId: number, title: string): Promise<Goal> {
    const [goal] = await db.insert(goals).values({ userId, title }).returning();
    return goal;
  }

  async getGoals(userId: number): Promise<Goal[]> {
    return db
      .select()
      .from(goals)
      .where(sql`${goals.userId} = ${userId} AND ${goals.seasonId} IS NULL AND ${goals.archivedAt} IS NULL`)
      .orderBy(desc(goals.createdAt));
  }

  async archiveGoal(goalId: number): Promise<void> {
    await db.update(goals).set({ archivedAt: new Date() }).where(eq(goals.id, goalId));
  }

  async archiveCurrentGoals(userId: number, seasonId: number): Promise<void> {
    // Move all active (non-archived, no seasonId) goals into the archived season
    await db.update(goals)
      .set({ seasonId, archivedAt: new Date() })
      .where(sql`${goals.userId} = ${userId} AND ${goals.seasonId} IS NULL AND ${goals.archivedAt} IS NULL`);
  }

  async tagAchievementToGoals(achievementId: number, goalIds: number[]): Promise<void> {
    // Clear existing tags
    await db.delete(achievementGoals).where(eq(achievementGoals.achievementId, achievementId));

    // Insert new tags
    if (goalIds.length > 0) {
      await db.insert(achievementGoals).values(
        goalIds.map(goalId => ({ achievementId, goalId }))
      );
    }
  }

  async getGoalProgress(userId: number): Promise<Array<{ goal: Goal; winCount: number; lastWinDate: Date | null; needsNudge: boolean }>> {
    const userGoals = await this.getGoals(userId);

    const progress = await Promise.all(
      userGoals.map(async (goal) => {
        // Get wins tagged to this goal
        const taggedWins = await db
          .select({ achievementId: achievementGoals.achievementId })
          .from(achievementGoals)
          .where(eq(achievementGoals.goalId, goal.id));

        const winIds = taggedWins.map(w => w.achievementId);

        let winCount = 0;
        let lastWinDate: Date | null = null;

        if (winIds.length > 0) {
          const goalAchievements = await db
            .select({ achievementDate: achievements.achievementDate })
            .from(achievements)
            .where(sql`${achievements.id} IN (${sql.join(winIds)})`)
            .orderBy(desc(achievements.achievementDate))
            .limit(1);

          winCount = winIds.length;
          if (goalAchievements.length > 0) {
            lastWinDate = goalAchievements[0].achievementDate as unknown as Date;
          }
        }

        // Check if nudge needed (no wins in 60+ days)
        let needsNudge = false;
        if (lastWinDate) {
          const daysSinceLastWin = (new Date().getTime() - lastWinDate.getTime()) / (1000 * 60 * 60 * 24);
          needsNudge = daysSinceLastWin > 60;
        } else if (goal.createdAt) {
          const daysSinceCreated = (new Date().getTime() - goal.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          needsNudge = daysSinceCreated > 60;
        }

        return { goal, winCount, lastWinDate, needsNudge };
      })
    );

    return progress;
  }
}

export const storage = new DatabaseStorage();
