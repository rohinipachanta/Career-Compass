import { Store } from "express-session";
import { firestore } from "./firestore-admin";
const COLLECTION = "sessions";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
export class FirestoreSessionStore extends Store {
  async get(sid: string, cb: (err: any, session?: any) => void) {
    try {
      const doc = await firestore.collection(COLLECTION).doc(sid).get();
      if (!doc.exists) return cb(null, null);
      const data = doc.data()!;
      if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
        await doc.ref.delete(); return cb(null, null);
      }
      return cb(null, JSON.parse(data.session));
    } catch (err) { cb(err); }
  }
  async set(sid: string, session: any, cb?: (err?: any) => void) {
    try {
      await firestore.collection(COLLECTION).doc(sid).set({
        session: JSON.stringify(session),
        expiresAt: new Date(Date.now() + TTL_MS),
        updatedAt: new Date(),
      });
      cb?.();
    } catch (err) { cb?.(err); }
  }
  async destroy(sid: string, cb?: (err?: any) => void) {
    try { await firestore.collection(COLLECTION).doc(sid).delete(); cb?.(); } catch (err) { cb?.(err); }
  }
  async touch(sid: string, session: any, cb?: (err?: any) => void) { return this.set(sid, session, cb); }
}
