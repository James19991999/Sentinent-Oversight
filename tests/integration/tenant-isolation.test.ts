/**
 * This is the test required by the Master Prompt Definition of Done:
 * "Tenant isolation proven by a failing-to-cross-tenant-read test, not
 * just rules existing on paper."
 *
 * It exercises the app-layer half of isolation (lib/tenant-db.ts) against
 * a mocked Firestore, simulating org-b attempting to read a document that
 * belongs to org-a. The Firestore Security Rules in
 * lib/firestore-rules/firestore.rules enforce the same boundary again at
 * the database layer; those rules are not executed by this test suite
 * because doing so requires the Firebase Emulator Suite, which is not
 * running in this environment. That gap is called out explicitly in the
 * Gap Analysis rather than silently assumed — see README "Known gaps".
 */
import { getTenantDoc, tenantCollection } from "@/lib/tenant-db";

const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet }));
const mockWhere = jest.fn();
const mockCollection = jest.fn(() => ({ doc: mockDoc, where: mockWhere }));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: () => ({ collection: mockCollection }),
}));

describe("tenant isolation — getTenantDoc", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockDoc.mockClear();
    mockCollection.mockClear();
  });

  it("returns null when the document belongs to a different org (cross-tenant read blocked)", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      id: "threat-1",
      data: () => ({ orgId: "org-a", title: "Exfil attempt" }),
    });

    // org-b tries to read a document that actually belongs to org-a.
    const result = await getTenantDoc("threats", "threat-1", "org-b");

    expect(result).toBeNull();
  });

  it("returns the document when the org matches", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      id: "threat-1",
      data: () => ({ orgId: "org-a", title: "Exfil attempt" }),
    });

    const result = await getTenantDoc("threats", "threat-1", "org-a");

    expect(result).toEqual({ id: "threat-1", orgId: "org-a", title: "Exfil attempt" });
  });

  it("returns null for a nonexistent document without leaking existence", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const result = await getTenantDoc("threats", "nope", "org-a");
    expect(result).toBeNull();
  });
});

describe("tenant isolation — tenantCollection", () => {
  it("always applies an orgId filter to the query", () => {
    tenantCollection("threats", "org-a");
    expect(mockWhere).toHaveBeenCalledWith("orgId", "==", "org-a");
  });

  it("refuses to build an unscoped query when orgId is missing", () => {
    expect(() => tenantCollection("threats", "")).toThrow(/without an orgId/);
  });
});
