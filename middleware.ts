import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale } from "./i18n/config";

/**
 * IMPORTANT — this file is named `middleware.ts` because that is the only
 * filename Next.js's App Router will actually invoke as edge middleware.
 * An earlier build in this pattern experimented with renaming it, which
 * silently disables it — Next does not look anywhere else. Keep it here.
 *
 * What this middleware does and does NOT do:
 * - It runs next-intl's locale-detection/routing first (redirects
 *   `/dashboard` to `/en/dashboard` etc, based on the `Accept-Language`
 *   header or a previously-set locale cookie).
 * - It then does a cheap, unauthenticated cookie-presence check purely to
 *   redirect signed-out users away from protected routes and signed-in
 *   users away from the auth routes, for a smoother UX.
 * - It does NOT verify the session cookie (that requires the Admin SDK,
 *   which cannot run on the Edge runtime) and it is NOT trusted as an
 *   authorization boundary. Following the CVE-2025-29927 middleware
 *   bypass research (a spoofable internal header could skip middleware
 *   entirely on vulnerable Next versions), every protected server
 *   component and API route independently calls
 *   requireServerSession()/getServerSession() and re-checks RBAC via
 *   lib/rbac.ts. This app pins next@14.2.35, which post-dates the patched
 *   releases for that CVE, but we still treat middleware as a UX layer,
 *   not a security layer, on principle.
 */
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});

const PROTECTED_SEGMENTS = ["dashboard", "threats", "compliance", "response", "training", "settings", "billing"];
const AUTH_SEGMENTS = ["sign-in", "sign-up"];

export function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  // If next-intl decided to redirect (e.g. adding the missing locale
  // prefix), let that redirect happen first — the auth check below needs
  // the locale-prefixed path to correctly identify the route.
  if (intlResponse.headers.get("location")) {
    return intlResponse;
  }

  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean); // ["en", "dashboard", ...]
  const [, routeSegment] = segments; // segments[0] is the locale
  const hasSessionCookie = request.cookies.has("__session");

  const isProtected = routeSegment ? PROTECTED_SEGMENTS.includes(routeSegment) : false;
  const isAuthRoute = routeSegment ? AUTH_SEGMENTS.includes(routeSegment) : false;
  const locale = segments[0] ?? defaultLocale;

  if (isProtected && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-in`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  // Run on every path except Next internals, API routes (not localized),
  // and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
