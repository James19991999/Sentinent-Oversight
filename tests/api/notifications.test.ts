/**
 * @jest-environment node
 */
const mockRequireServerSession = jest.fn();
jest.mock("@/lib/session", () => ({
  requireServerSession: () => mockRequireServerSession(),
  SessionError: class SessionError extends Error {
    status = 401;
  },
}));

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet, set: mockSet }));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: () => ({ collection: () => ({ doc: mockDoc }) }),
}));

import { GET, PUT } from "@/app/api/notifications/route";
import { SessionError } from "@/lib/session";

function makeRequest(body: unknown) {
  return new Request("https://sentineloversight.app/api/notifications", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Notification preferences API route", () => {
  beforeEach(() => {
    mockRequireServerSession.mockReset();
    mockGet.mockReset();
    mockSet.mockReset();
    mockDoc.mockClear();
  });

  it("GET returns sensible defaults when no document exists yet", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    mockGet.mockResolvedValue({ exists: false });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.criticalThreatAlerts).toBe(true);
    expect(body.data.playbookRunResults).toBe(false);
  });

  it("GET always reads the document keyed by the caller's own uid, not a client-supplied id", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "the-real-uid", email: "a@b.com", orgId: "org-a", role: "member" });
    mockGet.mockResolvedValue({ exists: false });
    await GET();
    expect(mockDoc).toHaveBeenCalledWith("the-real-uid");
  });

  it("PUT writes only the session's own uid/orgId, ignoring any client-supplied values (mass-assignment guard)", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    const res = await PUT(
      makeRequest({
        criticalThreatAlerts: false,
        complianceDriftWarnings: false,
        playbookRunResults: true,
        weeklyTrainingReminders: true,
        uid: "SOMEONE-ELSE", // attacker-supplied — must be ignored
        orgId: "SOMEONE-ELSES-ORG", // attacker-supplied — must be ignored
      })
    );
    expect(res.status).toBe(200);
    const written = mockSet.mock.calls[0][0];
    expect(written.uid).toBe("u1");
    expect(written.orgId).toBe("org-a");
    expect(written.playbookRunResults).toBe(true);
  });

  it("PUT rejects a payload with a non-boolean field", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    const res = await PUT(
      makeRequest({
        criticalThreatAlerts: "yes", // wrong type
        complianceDriftWarnings: false,
        playbookRunResults: false,
        weeklyTrainingReminders: false,
      })
    );
    expect(res.status).toBe(400);
  });

  it("GET rejects an unauthenticated request", async () => {
    mockRequireServerSession.mockRejectedValue(new SessionError("Not authenticated"));
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
