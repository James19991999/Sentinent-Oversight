/**
 * The main rate-limit.test.ts covers the in-memory fallback path (the
 * default in this environment, since no Upstash credentials exist here).
 * This file proves the OTHER path actually activates and gets called
 * when the two env vars are present — not just that the Upstash SDK
 * import compiles. Uses jest.resetModules() + env vars set before
 * require() because the module decides which path to use at import time.
 */
const mockLimit = jest.fn();

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation(() => ({ limit: mockLimit })),
    { slidingWindow: jest.fn() }
  ),
}));

describe("checkRateLimit (distributed mode — Upstash env vars present)", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockLimit.mockReset();
    process.env = {
      ...ORIGINAL_ENV,
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("reports the distributed limiter as active once env vars are set", async () => {
    const { isDistributedRateLimitActive } = await import("@/lib/rate-limit");
    expect(isDistributedRateLimitActive()).toBe(true);
  });

  it("actually calls the Upstash limiter instead of the in-memory one", async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60_000 });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const result = await checkRateLimit("session:1.2.3.4", 10);

    expect(mockLimit).toHaveBeenCalledWith("session:1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("surfaces a block from the Upstash limiter with a retry-after derived from its reset time", async () => {
    const resetAt = Date.now() + 15_000;
    mockLimit.mockResolvedValue({ success: false, remaining: 0, reset: resetAt });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const result = await checkRateLimit("session:1.2.3.4", 10);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(15);
  });
});
