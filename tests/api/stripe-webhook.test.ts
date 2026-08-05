/**
 * @jest-environment node
 */
/**
 * Covers two Security Checklist items:
 * "Stripe webhooks verify signatures; handlers are idempotent."
 */
const mockConstructEvent = jest.fn();

jest.mock("@/lib/stripe", () => ({
  stripe: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
  STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
}));

const mockEventDocGet = jest.fn();
const mockEventDocSet = jest.fn();
const mockRunTransaction = jest.fn();
const mockOrgUpdate = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: () => ({
    collection: (name: string) => {
      if (name === "stripe_events") {
        return { doc: () => ({ get: mockEventDocGet, set: mockEventDocSet }) };
      }
      if (name === "organizations") {
        return {
          doc: () => ({ update: mockOrgUpdate }),
          where: () => ({
            limit: () => ({
              get: async () => ({ docs: [{ ref: { update: mockOrgUpdate } }] }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    },
    runTransaction: mockRunTransaction,
  }),
}));

import { POST } from "@/app/api/webhooks/stripe/route";

function makeRequest(body: string, signature: string | null) {
  return new Request("https://sentineloversight.app/api/webhooks/stripe", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  });
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    mockConstructEvent.mockReset();
    mockRunTransaction.mockReset();
    mockOrgUpdate.mockReset();
  });

  it("rejects requests with no signature header", async () => {
    const res = await POST(makeRequest("{}", null));
    expect(res.status).toBe(400);
  });

  it("rejects requests whose signature fails verification", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("signature mismatch");
    });
    const res = await POST(makeRequest("{}", "bad-signature"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid signature/i);
  });

  it("processes a new checkout.session.completed event exactly once", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { orgId: "org-a" }, customer: "cus_1", subscription: "sub_1" } },
    });
    mockRunTransaction.mockImplementation(async (fn) =>
      fn({ get: async () => ({ exists: false }), set: mockEventDocSet })
    );

    const res = await POST(makeRequest("{}", "good-signature"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.duplicate).toBeUndefined();
    expect(mockOrgUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ stripeCustomerId: "cus_1", subscriptionStatus: "active" })
    );
  });

  it("treats a replayed event.id as a safe no-op (idempotency)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: { metadata: { orgId: "org-a" }, customer: "cus_1", subscription: "sub_1" } },
    });
    // Ledger already has this event — transaction reports "already processed".
    mockRunTransaction.mockImplementation(async (fn) =>
      fn({ get: async () => ({ exists: true }), set: mockEventDocSet })
    );

    const res = await POST(makeRequest("{}", "good-signature"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.duplicate).toBe(true);
    // Because it was a duplicate, the org must NOT be updated a second time.
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it("returns a structured 500 instead of crashing when Firestore fails downstream of signature verification", async () => {
    // Regression test for an audit finding: a valid, correctly-signed
    // event whose Firestore write fails (transient outage, permissions,
    // anything) must not produce an unhandled exception / bare response
    // with no body — every other route in this app returns
    // { data: null, error: "..." } on failure, and this route must too.
    mockConstructEvent.mockReturnValue({
      id: "evt_2",
      type: "checkout.session.completed",
      data: { object: { metadata: { orgId: "org-a" }, customer: "cus_1", subscription: "sub_1" } },
    });
    mockRunTransaction.mockRejectedValue(new Error("Firestore unavailable"));

    const res = await POST(makeRequest("{}", "good-signature"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.data).toBeNull();
    expect(typeof body.error).toBe("string");
    // The internal error detail must never leak into the response body.
    expect(body.error).not.toMatch(/Firestore unavailable/);
  });
});
