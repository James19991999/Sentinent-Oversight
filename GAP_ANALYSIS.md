# Gap Analysis — Sentinel Oversight

Required up front by the Master Prompt and reconciled against the finished product below.

## What the Stitch export provided

Source: `stitch_unified_enterprise_cyber_defense.zip`, 8 screens:

| Export screen | Design system elements taken from it |
|---|---|
| `sentinel_oversight/DESIGN.md` | Full Material 3 color tokens, typography scale, spacing, radii — the canonical source for `tailwind.config.ts` |
| `threat_detection_dashboard` | Dark cyber-command visual language, severity color coding, radar/pulse iconography |
| `security_command_cyber_dashboard` | Dashboard card layout patterns, glass-panel treatment |
| `compliance_audits` | Framework/progress-bar presentation pattern |
| `response_automation` | Playbook list/status pattern |
| `employee_training_hub` | Training module card pattern |
| `secure_authentication_portal` | Auth screen layout (centered card, dark background) |
| `system_settings_security_profile` | Settings tab structure |

**Design fidelity**: colors, type scale, spacing, and border-radius values in `tailwind.config.ts` and `app/globals.css` are taken verbatim from `DESIGN.md`, not approximated. Icon set is Material Symbols Outlined, matching the export.

## What was authored to complete the product

The export is 8 static HTML mockups with placeholder content. Everything below was built new:

- **All application logic**: auth (sign-up/sign-in/session cookies), RBAC, multi-tenant data isolation, Stripe billing, every API route
- **Screens the export never showed**: empty states, error states, loading skeletons, 404 page, notifications settings tab, API nodes settings tab, preferences settings tab, billing page, marketing landing page (the export had no marketing/landing screen at all)
- **All real copy** — no Lorem Ipsum, no `[placeholder]` text anywhere in the shipped product
- **SEO infrastructure**: sitemap.xml, robots.txt, JSON-LD, generated OG image — none of this existed in the export
- **Firestore Security Rules, RBAC matrix, and tenant-scoping helpers** — the export is visual-only and contains no data model

## Final gap analysis (fully done / partial / stubbed / known bugs)

### Fully done — built, wired end to end, and covered by a passing test
- Sign-up (creates org + owner claims), sign-in (session cookie), sign-out
- RBAC permission matrix enforced server-side on every route (`lib/rbac.ts`) — 5/5 unit tests passing
- Tenant isolation at the app layer (`lib/tenant-db.ts`) — proven by a test that simulates a cross-tenant read and asserts it returns `null`, not the other org's data
- Firestore Security Rules written out explicitly (`lib/firestore-rules/firestore.rules`) enforcing the same boundary at the database layer
- Stripe webhook: signature verification (rejects unsigned/bad-signature requests) and idempotency (a replayed `event.id` is a no-op, proven by test)
- Mass-assignment guard on the Threats POST route: attacker-supplied `orgId`/`role` fields in the request body are proven, by test, to never reach the written document
- Role-filtered GET response on Threats (`assignedTo` stripped for members) — proven by test
- Open-redirect guard on the post-login redirect (`?redirect=`) — proven by test against protocol-relative and absolute-URL payloads
- All 8 core screens + settings' 4 sub-tabs + billing + 404, in the Stitch design language
- Full component library, all keyboard-accessible, zero jest-axe violations across every tested component/page
- Production build compiles cleanly; 0 TypeScript errors (strict mode); 0 ESLint errors

### Partial — implemented but with a real, documented limitation
- **Firestore Security Rules are written and reviewed but not test-executed.** The tenant-isolation test in `tests/integration/tenant-isolation.test.ts` proves the *app-layer* guard (`lib/tenant-db.ts`) works. Proving the *rules themselves* reject a cross-tenant read requires the Firebase Emulator Suite (`firebase emulator:start` + `@firebase/rules-unit-testing`), which is not installed or run in this environment. This is the single most important gap to close before calling isolation "proven," not just "written," at the database layer — see README "Before production."
- **CRUD API routes**: Threats has full GET/POST with role-filtering and mass-assignment guards, and is fully tested. Compliance, Training, and Response Automation currently read via the shared `fetchTenantRows` helper (same tenant-scoping guarantee) but only Threats and the playbook-run action have dedicated write routes with their own test coverage. The same pattern (zod schema, `assertPermission`, session-derived `orgId`) is established and ready to replicate for the other three — not yet duplicated 3x.
- **Member invite flow** (`/api/org/members`) is implemented and sets custom claims correctly, but has no test coverage yet (no automated test in this suite).

### Stubbed — present in the UI but not backed by a real integration
- **API Nodes settings tab** is an empty-state UI only; there's no actual log-source/SIEM/EDR ingestion pipeline behind it (that's a real integrations project, out of scope for a Stitch-to-SaaS conversion).
- **Notifications settings** form has no backend — toggles render and submit but don't persist or trigger real emails/webhooks yet.
- **Search bar in TopBar** is presentational — not wired to a real search index.
- **Seed/demo data**: the app renders real empty states when Firestore has no documents for an org (by design — see EmptyState components), but no seed script is included to populate demo threats/compliance/training data for a first-run demo.

### Known bugs / rough edges
- `next build` prints a `Failed to minify the stylesheet` warning for the Google Fonts `<link>` during this build only because this sandbox's network egress doesn't allow `fonts.googleapis.com`. This is a build-environment restriction, not an app bug — on Vercel (or any environment with normal internet access) this resolves cleanly. Documented in README.
- Component tests show a harmless React `act()` console warning originating from `next/link`'s internal `IntersectionObserver` prefetch logic under jsdom — cosmetic test noise, not a functional bug, and doesn't affect `toHaveNoViolations()` results.

## Audit findings — status

An independent adversarial audit (separate from this document's original authors)
re-ran the test suite from a clean install, attempted live HTTP attacks against a
running build, grepped the compiled bundle for leaked secrets, and ran a full-page
`axe-core` scan against the actual rendered HTML rather than trusting the component-level
jest-axe results. It found no security breach, but it did find real gaps. Each is
addressed below, not just noted:

| Finding | Severity | Status |
|---|---|---|
| Stripe webhook route had no error handling past signature verification — a downstream Firestore failure crashed to a bare 500 instead of the app's usual structured JSON error | Moderate | **Fixed.** Wrapped in try/catch, logged server-side only, regression-tested (`tests/api/stripe-webhook.test.ts`). |
| Page-level `axe-core` scan found 3 real landmark violations (`(auth)/layout.tsx` and `not-found.tsx` used bare `<div>`s instead of `<main>`; the skip-link sat outside any landmark on every page) that component-level jest-axe tests had missed entirely | Moderate | **Fixed.** All three now use proper landmarks; re-scanned the actual built HTML with `axe-core` directly (not just jest-axe) and confirmed 0 violations across all 4 static pages. Added `tests/pages/landmarks.test.tsx` as regression coverage at the page-composition level, not just per-component. |
| No rate limiting existed on any auth endpoint — confirmed live by 50 unthrottled requests | Moderate | **Fixed, with an honest caveat.** `/api/session` and `/api/auth/sign-up` are now rate-limited (`lib/rate-limit.ts`). It's an in-memory limiter — real protection for single-instance/dev use, not sufficient alone for a multi-instance serverless production deployment. See README "Rate limiting." |
| `npm audit` (not run in the original delivery) found 20 advisories in the dependency tree, 2 high-severity, against `next` and `undici` — no in-range patch exists for Next 14.x | Moderate, currently accepted with justification | **Documented, not silently fixed.** Reviewed every advisory's actual applicability to this app (most don't apply — no rewrites, no Pages Router, no WebSockets, no CSP nonces); removed one piece of genuinely unused attack surface (`next/image` remotePatterns config, since `next/image` isn't used anywhere in the app); documented the remaining accepted risk and the Next 16 migration as a required pre-launch item. See README "Security posture." |
| Icon font (Material Symbols) had no fallback and no failure handling — if the font fails to load, the raw ligature text ("radar", "verified_user", etc.) becomes visible, which the audit's own build environment had already demonstrated happening | Minor | **Fixed.** Icons are now hidden until `document.fonts` confirms the specific font loaded, revealed via an `icons-ready` class; a `<noscript>` block keeps them visible if JavaScript never runs, per this project's own "never hide content behind JS" rule. |
| Harmless `act()` console warnings from `next/link`'s internal prefetch logic in several tests | Cosmetic | Not fixed — genuinely cosmetic, doesn't affect any test's pass/fail result, and suppressing it risks masking a real future warning. Left as documented noise. |
| Tenant isolation and Firestore Security Rules still only verified at the mocked-unit-test level, not against a live Firebase project | Structural gap | **Not fixed — cannot be, from this environment.** No live Firebase/Stripe credentials exist here or in the original build environment. This remains the single most important pre-launch item; see README "Before production." |

## "Make it 100% ready" pass — what was actually closeable, and what wasn't

Asked directly whether this is 100% production-ready, the honest answer stayed no —
because part of "ready" requires verification against live Firebase/Stripe
infrastructure that has never existed in any environment this app has been built or
audited in. That can't be closed by writing more code, so it wasn't pretended away.
Everything that *could* be closed without live infrastructure, was:

- **Compliance, Training, and Response write APIs** — previously only Threats had the
  full zod-schema + RBAC + mass-assignment-guard pattern with its own tests. All three
  now have it (`/api/compliance`, `/api/training`, `/api/playbooks`), each independently
  tested for RBAC gating, mass-assignment protection, and cross-tenant write protection.
- **Notifications settings — real persistence, not a no-op form.** `/api/notifications`
  stores per-user preferences in Firestore (own Security Rule, own tests, own
  mass-assignment guard). The settings page now actually loads and saves real state
  instead of a static form that submitted nowhere. Real notification *delivery*
  (sending an email/push when a threat fires) is a separate, larger piece of work not
  attempted here — stated plainly in the README rather than implied as done.
- **Rate limiting made genuinely production-capable, not just documented as insufficient.**
  `lib/rate-limit.ts` now auto-selects real distributed Upstash Redis rate limiting when
  configured, with the in-memory version as the local-dev fallback — closing the
  specific "doesn't work on Vercel's multi-instance model" gap called out after the
  previous pass, with a test proving the distributed path is actually invoked.
- **Checked, not assumed, whether a safe non-breaking Next.js patch existed.** It
  doesn't — `npm view next versions` shows nothing newer than 14.2.35 in the 14.x line
  except 14.3.0 canary prereleases. Shipping a canary release to production was judged
  irresponsible, so this wasn't done.

**What stays open, and why blind-fixing it further would have been the wrong call:**
- The Next.js major-version migration (14→16) was deliberately not attempted in this
  pass. Next 15 changed route `params` to be asynchronous — a breaking change touching
  every one of this app's ~20 pages — and next-intl's compatibility with Next 16 was
  unverified. Attempting that blind, on top of everything else in this session, risked
  leaving a currently-working, well-tested app broken. That's a worse outcome than a
  documented, risk-reviewed, unpatched dependency.
- Live Firebase/Stripe verification remains categorically impossible without the user
  providing real credentials — restated here because it's the actual reason "100%
  ready" is not a claim this document makes, no matter how much other work closes
  around it.

## Internationalization, RTL, and visual polish pass — status

A later request asked for "global aesthetics and world-class standards," clarified as
both real internationalization and visual polish benchmarked against top-tier SaaS
design. Same standard applies here as everywhere else in this document: what's claimed
below was independently re-verified (fresh `npm ci`, `tsc`, lint, full test suite,
production build, and a live `axe-core` scan of the actual built HTML), not just written.

**Internationalization — real, not cosmetic:**
- Full routing restructure to `app/[locale]/...` using `next-intl`, covering all 15
  pages. Confirmed at the built-HTML level (not just in code): `dir="rtl"` on Arabic
  pages, correct `lang` per locale, real translated text rendering — not an English
  fallback — for English, Spanish, and Arabic. 53 static pages generated across 3 locales.
- RTL correctness swept across the codebase: every physical directional CSS class
  (`left-`, `ml-`, `border-l`, `text-left`, etc.) converted to logical properties
  (`start-`, `ms-`, `border-s`, `text-start`) so the layout actually mirrors in Arabic,
  not just the text direction.
- A new regression test class that didn't exist before: message-catalog parity tests
  (`tests/lib/i18n-messages.test.ts`) that fail if a translation key is missing,
  mistranslated to an empty string, or has mismatched interpolation placeholders across
  locales — catches a category of bug component tests can't.
- Two real bugs found and fixed during this pass, not just written around: a redirect
  double-locale-prefix bug (`/en/en/dashboard`) in the sign-in flow, and a root-layout
  conflict that would have nested two `<html>` tags — both caught by actually building
  and testing, not by inspection.
- **One structural gap knowingly left open, not hidden**: Next.js's auto-generated
  root-level 404 fallback (for a request that somehow bypasses the locale middleware
  entirely — not reachable through normal navigation, since the middleware matcher
  covers everything except `/api`, `/_next`, `/_vercel`, and dotted filenames) has no
  `lang` attribute or landmark region. A real fix attempt hit a hard Next.js constraint:
  a root `not-found.tsx` can't own its own `<html>` without a root `layout.tsx`, and
  adding one would double-nest `<html>` under the locale-owned layout. Properly fixing
  this means restructuring which layout owns the document shell — out of scope for this
  pass, left open rather than papered over.

**Visual polish — concrete, not vague "made it nicer":**
- Added a favicon and Apple touch icon — there was none at all before, generated
  programmatically from the app's own design tokens, confirmed as a real 32×32 PNG
  correctly linked in every page's `<head>`.
- Added `loading.tsx` for every data-fetching route (dashboard, threats, compliance,
  response, training, billing) — the `LoadingSkeleton` component existed from the
  original build but was never actually wired to anything; users saw a blank screen
  during navigation instead of a loading state.
- Added a baseline transition system (150ms, consistent easing) to every interactive
  element — colors and backgrounds were snapping instantly on hover/focus before, which
  reads as unfinished next to Stripe/Linear/Vercel-tier products.
- Added tactile press feedback to buttons (`active:scale-[0.98]`), consistent with the
  same tier of product.
- Put two design tokens that were defined but completely unused (`shadow-glow-cyan`,
  `shadow-glow-critical`) to actual use — the primary CTA now has a subtle glow, and the
  marketing hero has a restrained ambient-glow background (`aria-hidden`, decorative
  only) instead of being flat text on a flat background.
- Re-verified 0 accessibility violations after every visual change, including the new
  decorative hero elements.

## Test suite — final numbers (independently re-verified from a clean `npm ci`)
- **110/110 tests passing**, 27/27 suites (up from 86/22 — added tests for the three new
  write API routes, the notifications API, and both rate-limiter modes including the
  distributed Upstash path)
- **0 TypeScript errors** (`tsc --noEmit`, strict mode)
- **0 ESLint errors**
- **0 jest-axe violations** across every component/page test that includes an axe check
- **0 violations from an independent full-page `axe-core` scan of the actual built HTML**, across all three locales
- Production build (`next build`) completes successfully — 53 static pages across 3 locales, plus all API routes including the 3 newly added ones
