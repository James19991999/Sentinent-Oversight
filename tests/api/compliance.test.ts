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
const mockDoc = jest.fn(() => ({ id: "compliance-new", set: mockSet, get: mockDocGet, update: mockUpdate }));
jest.mock("@/lib/tenant-db", () => ({
  tenantCollection: () => ({ get: mockGet }),
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: () => ({ collection: () => ({ doc: mockDoc }) }),
}));

import { GET, POST, PATCH } from "@/app/api/compliance/route";

function makeRequest(body: unknown, method = "POST") {
  return new Request("https://sentineloversight.app/api/compliance", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Compliance API route", () => {
  beforeEach(() => {
    mockRequireServerSession.mockReset();
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockDocGet.mockReset();
  });

  it("GET succeeds for every role, since compliance:read is granted to all roles", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    mockGet.mockResolvedValue({ docs: [] });
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("POST rejects a member (lacks compliance:write) with 403", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    const res = await POST(makeRequest({ name: "SOC 2", status: "in-progress", completion: 40 }));
    expect(res.status).toBe(403);
  });

  it("POST ignores an attacker-supplied orgId (mass-assignment guard)", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "admin" });
    const res = await POST(
      makeRequest({ name: "SOC 2", status: "in-progress", completion: 40, orgId: "SOMEONE-ELSES-ORG" })
    );
    expect(res.status).toBe(201);
    const written = mockSet.mock.calls[0][0];
    expect(written.orgId).toBe("org-a");
  });

  it("POST rejects an out-of-range completion value", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "admin" });
    const res = await POST(makeRequest({ name: "SOC 2", status: "in-progress", completion: 150 }));
    expect(res.status).toBe(400);
  });

  it("PATCH refuses to update a document belonging to a different org", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-b", role: "admin" });
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ orgId: "org-a" }) });
    const res = await PATCH(makeRequest({ id: "framework-1", completion: 90 }, "PATCH"));
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("PATCH succeeds for a document in the caller's own org", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "admin" });
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ orgId: "org-a" }) });
    const res = await PATCH(makeRequest({ id: "framework-1", completion: 90 }, "PATCH"));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ completion: 90 }));
  });
});
