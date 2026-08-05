# Sentinel Oversight

Enterprise cyber defense platform — unified threat detection, compliance monitoring,
incident response automation, and security training. Built from a Stitch design export
per the Master Prompt workflow. See `GAP_ANALYSIS.md` for what's fully done vs. partial vs.
stubbed, and `ARCHITECTURE.md` for the routing map, data model, and auth flow.

## Stack & key decisions

- **Next.js 14 App Router, TypeScript strict, Tailwind** — tokens taken verbatim from the
  Stitch export's `DESIGN.md`.
- **Backend: Firebase** (Auth + Firestore + Admin SDK), chosen over Supabase — see
  `ARCHITECTURE.md` for why.
- **Billing: Stripe** — subscriptions, Customer Portal, signature-verified + idempotent
  webhooks.
- **Font loading**: self-hosted via a `<link>` tag in the root layout, not
  `next/font/google`. Reason: `next/font/google` requires network access to
  `fonts.googleapis.com` at *build* time, which isn't guaranteed in every CI/deploy
  environment (this sandbox's build environment is a concrete example — see "Known build
  warning" below). A `<link>` tag degrades gracefully to the fallback font stack if the
  request fails, instead of failing the build.
- **Middleware naming**: kept as `middleware.ts` (the only filename Next.js will actually
  invoke). Treated as a UX-only redirect layer, never the authorization boundary — every
  protected page/route independently re-verifies the session server-side. See the comment
  block at the top of `middleware.ts` for the full CVE-2025-29927 context.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real Firebase + Stripe values
npm run dev
```

### Required environment variables

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | Client-side Firebase SDK |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Server-only Admin SDK (never sent to the client) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE` | Server-only Stripe |
| `NEXT_PUBLIC_APP_URL` | Stripe checkout/portal return URLs |

Deploy the Firestore rules from `lib/firestore-rules/firestore.rules` to your Firebase
project (`firebase deploy --only firestore:rules`, with the Firebase CLI configured
separately — not included in this repo).

## Scripts
- `npm run dev` / `npm run build` / `npm start`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint`
- `npm test` — Jest + RTL + jest-axe

## Security Checklist — results

| Item | Status | Where |
|---|---|---|
| No mass-assignment | ✅ Confirmed by test | `app/api/threats/route.ts` uses a zod schema; `orgId` is always the session's, never client-supplied. Proven in `tests/api/threats.test.ts`. |
| No data leaks on GET routes | ✅ Confirmed by test | Threats GET strips `assignedTo` for members. Proven in `tests/api/threats.test.ts`. |
| OAuth/auth redirect flows tested for open-redirect | ✅ Confirmed by test | `lib/sanitize-redirect.ts`, `tests/lib/sanitize-redirect.test.ts`. |
| Middleware/proxy naming vs. current Next.js guidance | ✅ Reviewed | See comment block in `middleware.ts` re: CVE-2025-29927; app pinned to Next 14.2.35 (post-patch). |
| Stripe webhooks verify signatures; idempotent | ✅ Confirmed by test (including a live cryptographic proof — see below) | `app/api/webhooks/stripe/route.ts`, `tests/api/stripe-webhook.test.ts`. An audit found the event-processing logic wasn't wrapped in error handling — a downstream Firestore failure crashed to a bare 500 instead of the app's usual structured error response. Fixed: wrapped in try/catch, logged server-side, never leaks internals to the response body. Regression-tested. |
| Rate limiting on auth/public API routes | ✅ Dual-mode, production-capable | `/api/session` and `/api/auth/sign-up` are rate-limited (`lib/rate-limit.ts`). Automatically uses distributed Upstash Redis rate limiting when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set (correct for a multi-instance deploy), and falls back to an in-memory limiter otherwise. Both paths are tested, including a proof the Upstash path actually gets invoked, not just imported. |
| Secrets never exposed to client bundle | ✅ Reviewed | Only `NEXT_PUBLIC_*` vars are read in `lib/firebase-client.ts`. Admin SDK, Stripe secret key, and webhook secret are all in `server-only`-guarded files. |
| All icon fonts/assets referenced actually exist | ✅ Reviewed | Material Symbols Outlined loaded via `<link>` in root layout; used consistently via the `.material-symbols-outlined` class. |

## Known build warning (not a bug)

`next build` in this environment prints `Failed to minify the stylesheet for
https://fonts.googleapis.com/...` — this sandbox's network egress rules don't allow
requests to `fonts.googleapis.com`, so Next's font-optimization step can't fetch and
minify the stylesheet at build time. It's a non-fatal warning (`✓ Compiled successfully`
still follows), and the app still works correctly via the runtime `<link>` tag with its
fallback font stack. In a normal deploy environment (Vercel, standard CI) with internet
access, this resolves without the warning.

## Asset integration notes

The Stitch export shipped as 8 standalone HTML mockups, not exported image/icon assets —
so "asset integration" here means design-token and iconography integration, not file
copying:

- **Colors, type scale, spacing, radii**: hand-transcribed from `DESIGN.md` into
  `tailwind.config.ts` and `app/globals.css`, value-for-value (see comments there).
- **Icons**: the export uses Google's Material Symbols Outlined font via a class name
  (`material-symbols-outlined`). Kept the same approach — loaded via `<link>` in
  `app/layout.tsx` alongside the Hanken Grotesk/Inter/Geist type families, with a base
  CSS rule in `globals.css` for the icon font's variation settings.
- **No raster/vector image assets** (logos, illustrations) were present in the export to
  carry over. The OG image is generated programmatically (`app/opengraph-image.tsx`)
  rather than substituted from a missing source asset.
- **Substitution**: none needed — every visual primitive in the export (color, type,
  icon set) had a direct, exact Tailwind/CSS equivalent.

## Security posture: known dependency advisories (Next.js / undici)

An independent audit ran `npm audit` (not done in the original build) and found 20
advisories against this dependency tree — 18 moderate, 2 high, both high-severity ones
against `next` itself and against `undici` (a transitive dependency of `firebase-admin`).
No in-range patch exists for Next 14.x; the fix requires a major-version upgrade to Next
16. Rather than leave that unresolved, here's the actual applicability review and the
decision:

| Advisory theme | Applies to this app? | Why |
|---|---|---|
| HTTP request smuggling in rewrites | No | No `rewrites()` configured |
| Middleware/Proxy bypass in Pages Router + i18n | No | App Router only, no Pages Router, no i18n |
| SSRF via WebSocket upgrades | No | No WebSocket usage anywhere in the app |
| XSS via CSP nonces | No | No CSP nonces configured (the vector requires them) |
| XSS in `beforeInteractive` scripts with untrusted input | Low | The one inline script in `app/layout.tsx` (font-load detection) is a static string with no user input interpolated into it |
| Image Optimizer DoS / unbounded cache growth | Removed | `next/image` wasn't actually used anywhere in the app despite a leftover `images.remotePatterns` config — removed that config entirely from `next.config.js`, closing this surface rather than accepting the risk |
| Middleware/Proxy redirect cache poisoning; RSC cache poisoning/collisions | Low-moderate | `middleware.ts` only redirects for auth UX (see its own comment re: CVE-2025-29927) and isn't the authorization boundary; nearly every authenticated page is `export const dynamic = "force-dynamic"`, which bypasses the caching layers these advisories target. The static pages (`/`, `/sign-in`, `/sign-up`) carry no per-user state to poison. |
| DoS via Server Components request deserialization | Moderate, accepted for now | Applies in general to any App Router deployment on this version line |

**Decision**: ship on Next 14.2.35 for this delivery, with the unused image-optimizer
surface removed and the applicability review above documented, rather than attempt a
Next 16 major-version migration blind and untested in this delivery. Track upgrading to
Next 16 as a required pre-launch item — this is a real, open gap, not a resolved one.

## Rate limiting

`/api/session` (10 req/min) and `/api/auth/sign-up` (5 req/min) are rate-limited per
client IP (`lib/rate-limit.ts`) — closing the "no rate limiting" gap an audit found live
(50 rapid requests all succeeded before this fix). The limiter is **dual-mode**:

- With `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set, it uses real
  distributed rate limiting via Upstash Redis — correct on a multi-instance/serverless
  deployment (this app's stated Vercel target), since the counter lives outside any
  single process. The Upstash SDK is dynamically imported so it costs nothing when unused.
- Without those env vars, it falls back to an in-memory sliding window — correct for
  local dev and a single-instance deployment, but each instance/cold start on a
  horizontally-scaled deployment gets its own counter if Upstash isn't configured.

Both paths are tested, including `tests/lib/rate-limit-distributed.test.ts`, which mocks
the Upstash SDK and proves the distributed path actually gets invoked and its
allow/block/retry-after logic is correct — not just that the code compiles. To activate
distributed mode for a real launch, set the two env vars; no code changes are needed.

## Before production

1. Run the Firebase Emulator Suite and add `@firebase/rules-unit-testing` tests that
   execute `lib/firestore-rules/firestore.rules` directly — this repo's tenant-isolation
   test proves the app-layer guard, not the deployed rules themselves. See
   `GAP_ANALYSIS.md`. Also do a real live cross-tenant breach attempt against two actual
   provisioned orgs — every environment this app has been built and audited in so far has
   lacked live Firebase credentials, so this has only ever been verified at the mocked
   unit-test level, never end-to-end. **This is the one item on this list that cannot be
   closed by writing more code — it requires an actual Firebase project.**
2. ~~Add rate limiting to `/api/session` and `/api/auth/sign-up`~~ — done, dual-mode
   (in-memory fallback + real distributed Upstash Redis when configured). See "Rate
   limiting" above. `/api/webhooks/stripe` is intentionally not rate-limited by IP —
   Stripe's webhook senders share IP ranges across all Stripe customers, so limiting by
   Stripe's own delivery IP would misfire; that endpoint's real defenses are signature
   verification and idempotency, both already in place.
3. ~~Replicate the Threats route's zod-schema + RBAC + mass-assignment pattern for
   Compliance, Training, and Response write endpoints~~ — done: `/api/compliance`,
   `/api/training`, and `/api/playbooks` now all have the same pattern, each with its own
   test suite covering RBAC gating, mass-assignment, and cross-tenant protection.
4. ~~Wire the Notifications settings tab to a real persistence + delivery mechanism~~ —
   persistence is done (`/api/notifications`, per-user Firestore document, own Security
   Rule, own tests). Real *delivery* (actually sending an email/push notification when a
   critical threat fires) is still not built — that's a notification-delivery pipeline,
   a materially different piece of work from the settings UI now being fully wired to
   real, saved preferences.
5. Build the actual log-source/SIEM/EDR ingestion pipeline behind API Nodes — that tab is
   still a UI stub. This is a distinct integrations project, not a gap this pass could
   reasonably close.
6. The Next.js dependency CVEs (see "Security posture" above) still require a major-
   version migration to fully close. A newer non-breaking Next 14.x patch does not exist
   (checked: only 14.3.0 canary prereleases are newer, and shipping a canary to production
   would be irresponsible). Next 15 introduced a breaking change (route `params` become
   async) that touches every page in this app, and next-intl's compatibility with Next 16
   wasn't verified — attempting that migration blind, in the same pass as everything
   else, was judged a worse trade than leaving a well-documented, reviewed-per-advisory
   risk in place. This remains the most significant genuinely-open item after the
   Firebase Emulator gap above.
