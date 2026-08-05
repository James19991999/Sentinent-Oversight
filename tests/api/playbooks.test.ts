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
const mockDoc = jest.fn(() => ({ id: "playbook-new", set: mockSet }));
jest.mock("@/lib/tenant-db", () => ({
  tenantCollection: () => ({ get: mockGet }),
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: () => ({ collection: () => ({ doc: mockDoc }) }),
}));

import { GET, POST } from "@/app/api/playbooks/route";

function makeRequest(body: unknown) {
  return new Request("https://sentineloversight.app/api/playbooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Playbooks API route", () => {
  beforeEach(() => {
    mockRequireServerSession.mockReset();
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it("POST rejects a member — only owner/admin can author a playbook definition", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    const res = await POST(makeRequest({ name: "Contain credential stuffing", trigger: "5+ failed logins", meanTimeToRespondMinutes: 10 }));
    expect(res.status).toBe(403);
  });

  it("POST creates a playbook with status 'idle' and the session's orgId, ignoring any client-supplied status/orgId", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "owner" });
    const res = await POST(
      makeRequest({
        name: "Contain credential stuffing",
        trigger: "5+ failed logins",
        meanTimeToRespondMinutes: 10,
        status: "success", // attacker-supplied — must be ignored
        orgId: "SOMEONE-ELSES-ORG", // attacker-supplied — must be ignored
      })
    );
    expect(res.status).toBe(201);
    const written = mockSet.mock.calls[0][0];
    expect(written.status).toBe("idle");
    expect(written.orgId).toBe("org-a");
  });

  it("POST rejects an invalid meanTimeToRespondMinutes value", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "owner" });
    const res = await POST(
      makeRequest({ name: "X", trigger: "Y", meanTimeToRespondMinutes: -5 })
    );
    expect(res.status).toBe(400);
  });

  it("GET returns the tenant's playbooks", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    mockGet.mockResolvedValue({ docs: [{ id: "p1", data: () => ({ orgId: "org-a", name: "X" }) }] });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});
