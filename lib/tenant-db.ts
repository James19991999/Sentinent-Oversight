import "server-only";
import { adminDb } from "./firebase-admin";
import type { Query, DocumentData } from "firebase-admin/firestore";

/**
 * Every read/write in the app goes through this helper instead of a raw
 * `adminDb().collection(name)`. It bakes the orgId filter into the query
 * itself, so a route can't accidentally return another tenant's rows even
 * if it forgets to filter — there is no code path that reaches Firestore
 * for these collections without an orgId already applied.
 *
 * This is the *app-layer* half of tenant isolation. The Firestore Security
 * Rules in lib/firestore-rules/firestore.rules are the true boundary of
 * record — they enforce the same scoping even if a client bypassed this
 * server code entirely (e.g. a compromised API key hitting Firestore
 * directly). Belt and suspenders, not either/or.
 */
export function tenantCollection(collectionName: string, orgId: string): Query<DocumentData> {
  if (!orgId) {
    throw new Error("tenantCollection() called without an orgId — refusing to build an unscoped query.");
  }
  return adminDb().collection(collectionName).where("orgId", "==", orgId);
}

/** Fetches a single doc and verifies it belongs to the caller's org before returning it. */
export async function getTenantDoc(collectionName: string, docId: string, orgId: string) {
  const snap = await adminDb().collection(collectionName).doc(docId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data || data.orgId !== orgId) {
    // Document exists but belongs to a different tenant — treat exactly
    // like "not found" so we don't leak existence across tenants.
    return null;
  }
  return { id: snap.id, ...data };
}
