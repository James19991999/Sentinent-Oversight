import { sanitizeRedirect } from "@/lib/sanitize-redirect";

const FALLBACK = "/en/dashboard";

describe("sanitizeRedirect", () => {
  it("allows a normal relative path", () => {
    expect(sanitizeRedirect("/en/threats", FALLBACK)).toBe("/en/threats");
  });

  it("falls back to the caller-supplied fallback for null/undefined", () => {
    expect(sanitizeRedirect(null, FALLBACK)).toBe(FALLBACK);
    expect(sanitizeRedirect(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeRedirect("//evil.com/phish", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects absolute URLs with a scheme", () => {
    expect(sanitizeRedirect("https://evil.com", FALLBACK)).toBe(FALLBACK);
    expect(sanitizeRedirect("javascript://evil.com", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects paths that don't start with a slash", () => {
    expect(sanitizeRedirect("evil.com", FALLBACK)).toBe(FALLBACK);
  });

  it("allows nested relative paths with a locale prefix", () => {
    expect(sanitizeRedirect("/es/settings/security", FALLBACK)).toBe("/es/settings/security");
  });

  it("respects whatever fallback the caller provides, per locale", () => {
    expect(sanitizeRedirect(null, "/ar/dashboard")).toBe("/ar/dashboard");
  });
});
