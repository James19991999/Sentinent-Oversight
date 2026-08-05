import "server-only";
import { tenantCollection } from "./tenant-db";

export async function fetchTenantRows<T>(collectionName: string, orgId: string): Promise<{ rows: T[]; error: string | null }> {
  try {
    const snap = await tenantCollection(collectionName, orgId).get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : "Failed to load data" };
  }
}
