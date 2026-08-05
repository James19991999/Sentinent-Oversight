/**
 * Only allow same-app, single-segment-rooted relative paths as a redirect
 * target. Rejects protocol-relative ("//evil.com"), absolute URLs, and
 * anything with a scheme — the classic open-redirect vectors.
 *
 * `fallback` must be a complete, already-locale-prefixed path (e.g.
 * "/en/dashboard") — callers are responsible for building it from the
 * current locale, since this function has no locale context of its own.
 */
export function sanitizeRedirect(target: string | null | undefined, fallback: string): string {
  if (!target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("://")) {
    return fallback;
  }
  return target;
}
