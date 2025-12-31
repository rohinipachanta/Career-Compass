import { users, achievements, type User, type InsertUser, type Achievement, type InsertAchievement } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAchievements(userId: number): Promise<Achievement[]>;
  createAchievement(userId: number, achievement: InsertAchievement): Promise<Achievement>;
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
    return db.select().from(achievements).where(eq(achievements.userId, userId));
  }

  async createAchievement(userId: number, insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievements)
      .values({ ...insertAchievement, userId })
      .returning();
    return achievement;
  }
}

export const storage = new DatabaseStorage();
