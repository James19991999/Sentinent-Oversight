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
const mockUpdate = jest.fn();
const mockDocGet = jest.fn();
const mockDoc = jest.fn(() => ({ id: "training-new", set: mockSet, get: mockDocGet, update: mockUpdate }));
jest.mock("@/lib/tenant-db", () => ({
  tenantCollection: () => ({ get: mockGet }),
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: () => ({ collection: () => ({ doc: mockDoc }) }),
}));

import { GET, POST, PATCH } from "@/app/api/training/route";

function makeRequest(body: unknown, method = "POST") {
  return new Request("https://sentineloversight.app/api/training", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Training API route", () => {
  beforeEach(() => {
    mockRequireServerSession.mockReset();
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockDocGet.mockReset();
  });

  it("POST rejects a member (lacks training:write) with 403", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    const res = await POST(makeRequest({ title: "Phishing 101", category: "Awareness", durationMinutes: 20 }));
    expect(res.status).toBe(403);
  });

  it("POST ignores an attacker-supplied completionRate at creation (mass-assignment guard — always starts at 0)", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "admin" });
    const res = await POST(
      makeRequest({ title: "Phishing 101", category: "Awareness", durationMinutes: 20, completionRate: 100 })
    );
    expect(res.status).toBe(201);
    const written = mockSet.mock.calls[0][0];
    expect(written.completionRate).toBe(0);
    expect(written.orgId).toBe("org-a");
  });

  it("PATCH (marking progress) is allowed for a member — this is intentionally not gated by training:write", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ orgId: "org-a" }) });
    const res = await PATCH(makeRequest({ id: "module-1", completionRate: 100 }, "PATCH"));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ completionRate: 100 });
  });

  it("PATCH refuses to update a module belonging to a different org, even for a member", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-b", role: "member" });
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ orgId: "org-a" }) });
    const res = await PATCH(makeRequest({ id: "module-1", completionRate: 100 }, "PATCH"));
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("GET returns the tenant's modules", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    mockGet.mockResolvedValue({ docs: [{ id: "m1", data: () => ({ orgId: "org-a", title: "X" }) }] });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});
