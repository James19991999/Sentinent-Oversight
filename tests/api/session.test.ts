/**
 * @jest-environment node
 */
/**
 * Regression coverage for a real bug: sign-up creates the Firebase Auth
 * user first, then calls /api/auth/sign-up to create an organization and
 * grant orgId/role custom claims. If that second step ever fails after
 * the first succeeded, the result was a real, working login with no
 * organization — which could sign in successfully (correct password!)
 * and then get silently bounced back to /sign-in with no explanation,
 * because every protected page correctly treats "no orgId/role" as "not
 * signed in." This test pins the fix: the session route must detect that
 * state explicitly and return a distinguishable error instead of either
 * minting a useless cookie or returning a generic "invalid token" error
 * that looks like a wrong password.
 */
const mockVerifyIdToken = jest.fn();
const mockCreateSessionCookie = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
    createSessionCookie: mockCreateSessionCookie,
  }),
  getFirebaseAdminConfigError: () => null,
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true, remaining: 9, retryAfterSeconds: 0 }),
  getClientIp: () => "127.0.0.1",
}));

import { POST } from "@/app/api/session/route";

function makeRequest(body: unknown) {
  return new Request("https://example.com/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Session route — ACCOUNT_NOT_PROVISIONED detection", () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
    mockCreateSessionCookie.mockReset();
  });

  it("returns ACCOUNT_NOT_PROVISIONED and does NOT mint a cookie when orgId is missing", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1", email: "a@b.com", role: "owner" }); // no orgId
    const res = await POST(makeRequest({ idToken: "valid-token" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe("ACCOUNT_NOT_PROVISIONED");
    expect(mockCreateSessionCookie).not.toHaveBeenCalled();
  });

  it("returns ACCOUNT_NOT_PROVISIONED when role is missing", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a" }); // no role
    const res = await POST(makeRequest({ idToken: "valid-token" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe("ACCOUNT_NOT_PROVISIONED");
    expect(mockCreateSessionCookie).not.toHaveBeenCalled();
  });

  it("mints a session cookie normally when both orgId and role are present", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1", email: "a@b.com", orgId: "org-a", role: "owner" });
    mockCreateSessionCookie.mockResolvedValue("a-real-session-cookie");

    const res = await POST(makeRequest({ idToken: "valid-token" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.ok).toBe(true);
    expect(mockCreateSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("still rejects a genuinely invalid token with a normal error, not ACCOUNT_NOT_PROVISIONED", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Firebase ID token has expired"));
    const res = await POST(makeRequest({ idToken: "garbage" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.code).toBeUndefined();
    expect(body.error).toBe("Invalid or expired token");
  });
});
