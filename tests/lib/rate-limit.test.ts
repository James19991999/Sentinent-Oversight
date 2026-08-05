import { checkRateLimit, isDistributedRateLimitActive } from "@/lib/rate-limit";

describe("checkRateLimit (in-memory mode — no Upstash env vars set in test env)", () => {
  it("is not using the distributed limiter when Upstash env vars are absent", () => {
    expect(isDistributedRateLimitActive()).toBe(false);
  });

  it("allows requests up to the limit", async () => {
    const key = `test-${Date.now()}-a`;
    for (let i = 0; i < 5; i++) {
      expect((await checkRateLimit(key, 5)).allowed).toBe(true);
    }
  });

  it("blocks the request once the limit is exceeded within the window", async () => {
    const key = `test-${Date.now()}-b`;
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(key, 3);
    }
    const result = await checkRateLimit(key, 3);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `test-${Date.now()}-c1`;
    const keyB = `test-${Date.now()}-c2`;
    for (let i = 0; i < 3; i++) await checkRateLimit(keyA, 3);
    // keyA is now exhausted; keyB should be unaffected.
    expect((await checkRateLimit(keyA, 3)).allowed).toBe(false);
    expect((await checkRateLimit(keyB, 3)).allowed).toBe(true);
  });

  it("reports decreasing remaining count as the window fills", async () => {
    const key = `test-${Date.now()}-d`;
    expect((await checkRateLimit(key, 5)).remaining).toBe(4);
    expect((await checkRateLimit(key, 5)).remaining).toBe(3);
  });
});
