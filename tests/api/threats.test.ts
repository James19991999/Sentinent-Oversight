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
const mockDoc = jest.fn(() => ({ id: "threat-new", set: mockSet }));
jest.mock("@/lib/tenant-db", () => ({
  tenantCollection: () => ({ get: mockGet }),
}));
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: () => ({ collection: () => ({ doc: mockDoc }) }),
}));

import { GET, POST } from "@/app/api/threats/route";

function makeRequest(body: unknown) {
  return new Request("https://sentineloversight.app/api/threats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Threats API route", () => {
  beforeEach(() => {
    mockRequireServerSession.mockReset();
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it("GET strips assignedTo for members (role-filtered response, no data leak)", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    mockGet.mockResolvedValue({
      docs: [{ id: "t1", data: () => ({ orgId: "org-a", title: "X", assignedTo: "someone@internal" }) }],
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].assignedTo).toBeUndefined();
  });

  it("GET keeps assignedTo for admin/owner", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "admin" });
    mockGet.mockResolvedValue({
      docs: [{ id: "t1", data: () => ({ orgId: "org-a", title: "X", assignedTo: "someone@internal" }) }],
    });

    const res = await GET();
    const body = await res.json();
    expect(body.data[0].assignedTo).toBe("someone@internal");
  });

  it("POST rejects a member (lacks threats:write) with 403", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "member" });
    const res = await POST(makeRequest({ title: "x", severity: "low", sourceIp: "1.1.1.1", vector: "phishing" }));
    expect(res.status).toBe(403);
  });

  it("POST rejects a payload with an invalid severity value", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "admin" });
    const res = await POST(makeRequest({ title: "x", severity: "apocalyptic", sourceIp: "1.1.1.1", vector: "phishing" }));
    expect(res.status).toBe(400);
  });

  it("POST ignores extraneous/unexpected fields instead of writing them (mass-assignment guard)", async () => {
    mockRequireServerSession.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "admin" });
    const res = await POST(
      makeRequest({
        title: "Suspicious login",
        severity: "high",
        sourceIp: "10.0.0.1",
        vector: "credential stuffing",
        orgId: "SOMEONE-ELSES-ORG", // attempted cross-tenant write
        role: "owner", // attempted privilege escalation
      })
    );
    expect(res.status).toBe(201);
    const written = mockSet.mock.calls[0][0];
    expect(written.orgId).toBe("org-a"); // server's session org, not the attacker-supplied one
    expect(written.role).toBeUndefined(); // extraneous field never reached the document
  });
});
