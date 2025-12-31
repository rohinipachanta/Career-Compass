import { users, achievements, type User, type InsertUser, type Achievement, type InsertAchievement } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAchievements(userId: number): Promise<Achievement[]>;
  createAchievement(userId: number, achievement: InsertAchievement): Promise<Achievement>;
  getAchievement(id: number): Promise<Achievement | undefined>;
  updateAchievement(id: number, coachingResponse: string): Promise<void>;
  incrementCoachingCount(userId: number): Promise<number>;
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
    return db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.achievementDate), desc(achievements.id));
  }

  async createAchievement(userId: number, insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievements)
      .values({ ...insertAchievement, userId })
      .returning();
    return achievement;
  }

  async getAchievement(id: number): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.id, id));
    return achievement;
  }

  async updateAchievement(id: number, coachingResponse: string): Promise<void> {
    await db.update(achievements).set({ coachingResponse }).where(eq(achievements.id, id));
  }

  async incrementCoachingCount(userId: number): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const newCount = (user?.coachingCount || 0) + 1;
    await db.update(users).set({ coachingCount: newCount }).where(eq(users.id, userId));
    return newCount;
  }
}

export const storage = new DatabaseStorage();
