/**
 * server/storage.ts — Firestore implementation
 */
import { firestore, toDate, toTimestamp } from "./firestore-admin";
import type { User, InsertUser, Achievement, InsertAchievement, Badge, Season, Goal, PushSubscription, InsertPushSubscription } from "@shared/schema";
import { encryptText, decryptText } from "./encryption";

const col = {
  users:    ()          => firestore.collection("users"),
  ach:      (uid: string) => firestore.collection("users").doc(uid).collection("achievements"),
  seasons:  (uid: string) => firestore.collection("users").doc(uid).collection("seasons"),
  goals:    (uid: string) => firestore.collection("users").doc(uid).collection("goals"),
  agLinks:  (uid: string) => firestore.collection("users").doc(uid).collection("achievementGoals"),
  badges:   (uid: string) => firestore.collection("users").doc(uid).collection("badges"),
  pushSubs: (uid: string) => firestore.collection("users").doc(uid).collection("pushSubscriptions"),
};

function toUser(id: string, d: any): User {
  return { id, username: d.username, password: d.password, email: d.email ?? null, weeklyReminder: d.weeklyReminder ?? false, coachingCount: d.coachingCount ?? 0, xp: d.xp ?? 0, level: d.level ?? 1, reviewDraft: d.reviewDraft ?? null, reviewDraftUpdatedAt: toDate(d.reviewDraftUpdatedAt), role: d.role ?? null, careerJourney: d.careerJourney ?? null, team: d.team ?? null, company: d.company ?? null, profileContext: d.profileContext ?? null, profileCompletedAt: toDate(d.profileCompletedAt) };
}
function toAch(id: string, d: any): Achievement {
  return { id, userId: d.userId, title: d.title, achievementDate: d.achievementDate, coachingResponse: d.coachingResponse ?? null, xpEarned: d.xpEarned ?? 10, createdAt: toDate(d.createdAt) ?? new Date(), feedbackType: d.feedbackType ?? "win", source: d.source ?? "self", fromPerson: d.fromPerson ?? null, isConfirmed: d.isConfirmed ?? 1, dismissedAt: toDate(d.dismissedAt), seasonId: d.seasonId ?? null };
}
function toSeason(id: string, d: any): Season { return { id, userId: d.userId, name: d.name, reviewContent: d.reviewContent ?? null, archivedAt: toDate(d.archivedAt) ?? new Date() }; }
function toGoal(id: string, d: any): Goal { return { id, userId: d.userId, title: d.title, createdAt: toDate(d.createdAt) ?? new Date(), archivedAt: toDate(d.archivedAt), seasonId: d.seasonId ?? null }; }

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAchievements(userId: string): Promise<Achievement[]>;
  getDismissedAchievements(userId: string): Promise<Achievement[]>;
  createAchievement(userId: string, achievement: InsertAchievement): Promise<Achievement>;
  getAchievement(id: string, userId: string): Promise<Achievement | undefined>;
  updateAchievement(id: string, coachingResponse: string, userId: string): Promise<void>;
  editAchievement(id: string, title: string, feedbackType: string, achievementDate: string, userId: string): Promise<void>;
  confirmAchievement(id: string, userId: string): Promise<void>;
  deleteAchievement(id: string, userId: string): Promise<void>;
  restoreAchievement(id: string, userId: string): Promise<void>;
  incrementCoachingCount(userId: string): Promise<number>;
  updateUserPassword(id: string, password: string): Promise<void>;
  updateUserEmail(id: string, email: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateWeeklyReminder(id: string, enabled: boolean): Promise<void>;
  getAllUsersWithReminders(): Promise<User[]>;
  getBadges(userId: string): Promise<Badge[]>;
  awardBadge(userId: string, type: string): Promise<void>;
  getReviewDraft(userId: string): Promise<{ content: string | null; updatedAt: Date | null }>;
  saveReviewDraft(userId: string, content: string): Promise<void>;
  clearReviewDraft(userId: string): Promise<void>;
  createSeason(userId: string, name: string, reviewContent: string | null): Promise<Season>;
  getSeasons(userId: string): Promise<Season[]>;
  getSeason(id: string, userId: string): Promise<Season | undefined>;
  archiveCurrentWins(userId: string, seasonId: string): Promise<void>;
  getSeasonAchievements(userId: string, seasonId: string): Promise<Achievement[]>;
  getProfile(userId: string): Promise<Partial<User> | undefined>;
  updateProfile(userId: string, profile: { role?: string; careerJourney?: string; team?: string; company?: string; profileContext?: string; profileCompletedAt?: Date }): Promise<void>;
  createGoal(userId: string, title: string): Promise<Goal>;
  getGoals(userId: string): Promise<Goal[]>;
  archiveGoal(goalId: string, userId: string): Promise<void>;
  archiveCurrentGoals(userId: string, seasonId: string): Promise<void>;
  tagAchievementToGoals(userId: string, achievementId: string, goalIds: string[]): Promise<void>;
  getGoalProgress(userId: string): Promise<Array<{ goal: Goal; winCount: number; lastWinDate: Date | null; needsNudge: boolean }>>;
  savePushSubscription(sub: InsertPushSubscription): Promise<void>;
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(userId: string, endpoint: string): Promise<void>;
}

export class FirestoreStorage implements IStorage {
  async getUser(id: string) { const doc = await col.users().doc(id).get(); return doc.exists ? toUser(doc.id, doc.data()!) : undefined; }
  async getUserByUsername(username: string) { const s = await col.users().where("username","==",username.toLowerCase().trim()).limit(1).get(); return s.empty ? undefined : toUser(s.docs[0].id, s.docs[0].data()); }
  async createUser(u: InsertUser): Promise<User> {
    const ref = col.users().doc();
    const data = { username: u.username.toLowerCase().trim(), password: u.password, email: u.email ?? null, weeklyReminder: false, coachingCount: 0, xp: 0, level: 1, reviewDraft: null, reviewDraftUpdatedAt: null, role: null, careerJourney: null, team: null, company: null, profileContext: null, profileCompletedAt: null, createdAt: toTimestamp(new Date()) };
    await ref.set(data); return toUser(ref.id, data);
  }
  async getAchievements(userId: string): Promise<Achievement[]> {
    const s = await col.ach(userId).where("dismissedAt","==",null).where("seasonId","==",null).orderBy("achievementDate","desc").get();
    return Promise.all(s.docs.map(async d => { const a = toAch(d.id, d.data()); return { ...a, title: await decryptText(a.title) }; }));
  }
  async getDismissedAchievements(userId: string): Promise<Achievement[]> {
    const s = await col.ach(userId).where("seasonId","==",null).get();
    const list = s.docs.map(d => toAch(d.id, d.data())).filter(a => a.dismissedAt !== null);
    list.sort((a,b) => (b.dismissedAt?.getTime()??0)-(a.dismissedAt?.getTime()??0));
    return Promise.all(list.map(async a => ({ ...a, title: await decryptText(a.title) })));
  }
  async createAchievement(userId: string, ins: InsertAchievement): Promise<Achievement> {
    const ref = col.ach(userId).doc();
    const data = { userId, title: await encryptText(ins.title), achievementDate: ins.achievementDate, feedbackType: ins.feedbackType??"win", source: ins.source??"self", fromPerson: ins.fromPerson??null, isConfirmed: ins.isConfirmed??1, coachingResponse: null, xpEarned: 10, createdAt: toTimestamp(new Date()), dismissedAt: null, seasonId: null };
    await ref.set(data);
    const user = await this.getUser(userId);
    if (user) { const newXp=(user.xp||0)+10; await col.users().doc(userId).update({ xp: newXp, level: Math.floor(newXp/50)+1 }); const wins=await this.getAchievements(userId); if(wins.length===1) await this.awardBadge(userId,"first_achievement"); else if(wins.length===5) await this.awardBadge(userId,"five_achievements"); }
    return { ...toAch(ref.id, data), title: ins.title };
  }
  async getAchievement(id: string, userId: string) { const doc = await col.ach(userId).doc(id).get(); if(!doc.exists) return undefined; const a=toAch(doc.id,doc.data()!); return { ...a, title: await decryptText(a.title) }; }
  async updateAchievement(id: string, coachingResponse: string, userId: string) { await col.ach(userId).doc(id).update({ coachingResponse }); }
  async editAchievement(id: string, title: string, feedbackType: string, achievementDate: string, userId: string) { await col.ach(userId).doc(id).update({ title: await encryptText(title), feedbackType, achievementDate }); }
  async confirmAchievement(id: string, userId: string) { await col.ach(userId).doc(id).update({ isConfirmed: 1 }); }
  async deleteAchievement(id: string, userId: string) { await col.ach(userId).doc(id).update({ dismissedAt: toTimestamp(new Date()) }); }
  async restoreAchievement(id: string, userId: string) { await col.ach(userId).doc(id).update({ dismissedAt: null }); }
  async incrementCoachingCount(userId: string) { const u=await this.getUser(userId); const n=(u?.coachingCount??0)+1; await col.users().doc(userId).update({ coachingCount: n }); return n; }
  async updateUserPassword(id: string, pw: string) { await col.users().doc(id).update({ password: pw }); }
  async updateUserEmail(id: string, email: string) { await col.users().doc(id).update({ email: email.toLowerCase().trim() }); }
  async getUserByEmail(email: string) { const s=await col.users().where("email","==",email.toLowerCase().trim()).limit(1).get(); return s.empty ? undefined : toUser(s.docs[0].id, s.docs[0].data()); }
  async updateWeeklyReminder(id: string, enabled: boolean) { await col.users().doc(id).update({ weeklyReminder: enabled }); }
  async getAllUsersWithReminders() { const s=await col.users().where("weeklyReminder","==",true).get(); return s.docs.map(d=>toUser(d.id,d.data())).filter(u=>u.email); }
  async getBadges(userId: string) { const s=await col.badges(userId).get(); return s.docs.map(d=>({ id:d.id, userId:d.data().userId, type:d.data().type, awardedAt:toDate(d.data().awardedAt)??new Date() })); }
  async awardBadge(userId: string, type: string) { const e=await col.badges(userId).where("type","==",type).limit(1).get(); if(!e.empty) return; await col.badges(userId).add({ userId, type, awardedAt: toTimestamp(new Date()) }); }
  async getReviewDraft(userId: string) { const doc=await col.users().doc(userId).get(); const d=doc.data(); return { content: d?.reviewDraft??null, updatedAt: toDate(d?.reviewDraftUpdatedAt) }; }
  async saveReviewDraft(userId: string, content: string) { await col.users().doc(userId).update({ reviewDraft: content, reviewDraftUpdatedAt: toTimestamp(new Date()) }); }
  async clearReviewDraft(userId: string) { await col.users().doc(userId).update({ reviewDraft: null, reviewDraftUpdatedAt: null }); }
  async createSeason(userId: string, name: string, reviewContent: string | null): Promise<Season> { const ref=col.seasons(userId).doc(); const data={ userId, name, reviewContent:reviewContent??null, archivedAt:toTimestamp(new Date()) }; await ref.set(data); return toSeason(ref.id, data); }
  async getSeasons(userId: string) { const s=await col.seasons(userId).orderBy("archivedAt","desc").get(); return s.docs.map(d=>toSeason(d.id,d.data())); }
  async getSeason(id: string, userId: string) { const doc=await col.seasons(userId).doc(id).get(); return doc.exists ? toSeason(doc.id,doc.data()!) : undefined; }
  async archiveCurrentWins(userId: string, seasonId: string) { const s=await col.ach(userId).where("dismissedAt","==",null).where("seasonId","==",null).get(); const b=firestore.batch(); s.docs.forEach(d=>b.update(d.ref,{seasonId})); await b.commit(); }
  async getSeasonAchievements(userId: string, seasonId: string): Promise<Achievement[]> { const s=await col.ach(userId).where("seasonId","==",seasonId).orderBy("achievementDate","desc").get(); return Promise.all(s.docs.map(async d=>{ const a=toAch(d.id,d.data()); return { ...a, title: await decryptText(a.title) }; })); }
  async getProfile(userId: string) { const doc=await col.users().doc(userId).get(); if(!doc.exists) return undefined; const d=doc.data()!; return { role:d.role??null, careerJourney:d.careerJourney??null, team:d.team??null, company:d.company??null, profileContext:d.profileContext??null, profileCompletedAt:toDate(d.profileCompletedAt) }; }
  async updateProfile(userId: string, p: any) { const u: any={}; if(p.role!==undefined) u.role=p.role||null; if(p.careerJourney!==undefined) u.careerJourney=p.careerJourney||null; if(p.team!==undefined) u.team=p.team||null; if(p.company!==undefined) u.company=p.company||null; if(p.profileContext!==undefined) u.profileContext=p.profileContext||null; if(p.profileCompletedAt!==undefined) u.profileCompletedAt=toTimestamp(p.profileCompletedAt); await col.users().doc(userId).update(u); }
  async createGoal(userId: string, title: string): Promise<Goal> { const ref=col.goals(userId).doc(); const data={ userId, title, createdAt:toTimestamp(new Date()), archivedAt:null, seasonId:null }; await ref.set(data); return toGoal(ref.id, data); }
  async getGoals(userId: string) { const s=await col.goals(userId).where("archivedAt","==",null).where("seasonId","==",null).orderBy("createdAt","desc").get(); return s.docs.map(d=>toGoal(d.id,d.data())); }
  async archiveGoal(goalId: string, userId: string) { await col.goals(userId).doc(goalId).update({ archivedAt: toTimestamp(new Date()) }); }
  async archiveCurrentGoals(userId: string, seasonId: string) { const s=await col.goals(userId).where("archivedAt","==",null).where("seasonId","==",null).get(); const b=firestore.batch(); s.docs.forEach(d=>b.update(d.ref,{seasonId,archivedAt:toTimestamp(new Date())})); await b.commit(); }
  async tagAchievementToGoals(userId: string, achievementId: string, goalIds: string[]) { const e=await col.agLinks(userId).where("achievementId","==",achievementId).get(); const b=firestore.batch(); e.docs.forEach(d=>b.delete(d.ref)); goalIds.forEach(gid=>b.set(col.agLinks(userId).doc(),{achievementId,goalId:gid})); await b.commit(); }
  async getGoalProgress(userId: string) {
    const goals=await this.getGoals(userId);
    return Promise.all(goals.map(async goal => {
      const tagged=await col.agLinks(userId).where("goalId","==",goal.id).get();
      const winCount=tagged.size; let lastWinDate:Date|null=null;
      for(const link of tagged.docs) { const aDoc=await col.ach(userId).doc(link.data().achievementId).get(); if(aDoc.exists){ const d=new Date(aDoc.data()!.achievementDate); if(!lastWinDate||d>lastWinDate) lastWinDate=d; } }
      const now=Date.now(); const needsNudge=lastWinDate?(now-lastWinDate.getTime())/86400000>60:goal.createdAt?(now-goal.createdAt.getTime())/86400000>60:false;
      return { goal, winCount, lastWinDate, needsNudge };
    }));
  }
  async savePushSubscription(sub: InsertPushSubscription) { const e=await col.pushSubs(sub.userId).where("endpoint","==",sub.endpoint).limit(1).get(); if(!e.empty) return; await col.pushSubs(sub.userId).add({ ...sub, createdAt: toTimestamp(new Date()) }); }
  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> { const s=await col.pushSubs(userId).get(); return s.docs.map(d=>({ id:d.id, userId:d.data().userId, endpoint:d.data().endpoint, p256dh:d.data().p256dh, auth:d.data().auth, createdAt:toDate(d.data().createdAt)??new Date() })); }
  async deletePushSubscription(userId: string, endpoint: string) { const s=await col.pushSubs(userId).where("endpoint","==",endpoint).get(); const b=firestore.batch(); s.docs.forEach(d=>b.delete(d.ref)); await b.commit(); }
}

export const storage = new FirestoreStorage();
