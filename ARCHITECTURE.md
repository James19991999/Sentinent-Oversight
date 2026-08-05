# Architecture Overview — Sentinel Oversight

## Stack
- **Framework**: Next.js 14.2.35, App Router, TypeScript strict mode
- **Styling**: Tailwind CSS, design tokens sourced from the Stitch `DESIGN.md`
- **Backend**: **Firebase** (Auth + Firestore + Admin SDK) — chosen over Supabase because
  the Stitch export's product shape (org-scoped RBAC, custom-claims-driven access) maps
  directly onto Firebase custom claims + Security Rules, and this matches the stack used
  in prior builds of this pattern (see `saas-builds` history), keeping deployment/ops
  consistent across the portfolio.
- **Billing**: Stripe (Checkout, Customer Portal, webhooks)
- **Testing**: Jest, React Testing Library, jest-axe

## Routing map

```
/app
  /(marketing)/page.tsx          → Landing (static, SEO'd)
  /(auth)/sign-in/page.tsx       → Sign in (static shell, client form)
  /(auth)/sign-up/page.tsx       → Sign up + org creation
  /(app)/dashboard/page.tsx      → Command Center overview
  /(app)/threats/page.tsx        → Threat Detection table
  /(app)/compliance/page.tsx     → Compliance Audits
  /(app)/response/page.tsx       → Response Automation (playbooks)
  /(app)/training/page.tsx       → Training Hub
  /(app)/settings/security       → Security settings
  /(app)/settings/notifications  → Notification preferences
  /(app)/settings/api-nodes      → Integration nodes (stubbed)
  /(app)/settings/preferences    → Personal preferences
  /(app)/billing/page.tsx        → Subscription + Stripe actions
  /not-found.tsx                 → 404
  /api/session                   → POST mints session cookie, DELETE clears it
  /api/auth/sign-up              → Creates org, sets owner custom claims
  /api/threats                   → GET (role-filtered) / POST (mass-assignment guarded)
  /api/playbooks/[id]/run        → POST triggers a playbook run
  /api/org/members               → GET / POST (invite)
  /api/checkout                  → POST creates a Stripe Checkout session
  /api/portal                    → POST creates a Stripe Customer Portal session
  /api/webhooks/stripe           → POST, signature-verified + idempotent
  /sitemap.xml, /robots.txt, /opengraph-image → generated
```

Every route under `(app)` is gated twice: `middleware.ts` redirects for UX only, and
`app/(app)/layout.tsx` calls `getServerSession()` — the real gate — before rendering
anything.

## Data model (Firestore, all collections tenant-scoped by `orgId`)

```
organizations/{orgId}
  { id, name, plan, stripeCustomerId?, stripeSubscriptionId?, subscriptionStatus?, createdAt }

members/{uid}
  { uid, email, displayName, role: owner|admin|member, orgId, createdAt }

threats/{id}
  { id, orgId, title, severity, status, sourceIp, vector, detectedAt, assignedTo? }

compliance/{id}
  { id, orgId, name, status, completion, lastAuditedAt }

playbooks/{id}
  { id, orgId, name, trigger, status, lastRunAt?, meanTimeToRespondMinutes }

training/{id}
  { id, orgId, title, category, completionRate, durationMinutes }

stripe_events/{eventId}
  { type, receivedAt }   — idempotency ledger for the webhook handler
```

`orgId` and `role` live in the Firebase Auth **custom claims** on each user's ID token —
never in a cookie value or request body the client controls. They're set exclusively by
Admin-SDK-only code (`/api/auth/sign-up`, `/api/org/members`).

## Auth flow

1. **Sign-up**: client calls Firebase `createUserWithEmailAndPassword` → gets an ID token
   → POSTs it to `/api/auth/sign-up` with an org name → server verifies the token, creates
   the `organizations` doc, creates the `members` doc, and calls
   `adminAuth().setCustomUserClaims(uid, { orgId, role: "owner" })` → client force-refreshes
   its ID token (now carrying the claims) → POSTs to `/api/session` to mint an httpOnly
   session cookie → redirected to `/dashboard`.
2. **Sign-in**: client calls `signInWithEmailAndPassword` → POSTs the resulting ID token to
   `/api/session` → cookie set → redirected to the sanitized `?redirect=` target or
   `/dashboard`.
3. **Every server request**: `getServerSession()` reads the `__session` cookie, calls
   `adminAuth().verifySessionCookie()`, and pulls `orgId`/`role` out of the verified token's
   claims — never trusting anything the client sent directly.
4. **Every API route**: calls `requireServerSession()` then `assertPermission(role, ...)`
   from `lib/rbac.ts` before touching data. UI-level hiding of buttons/nav items
   (`can()` in `Sidebar.tsx`) is a convenience layer on top of this, never a substitute.
5. **Sign-out**: client calls Firebase `signOut()`, then `DELETE /api/session` clears the
   cookie.

## Tenant isolation — two independent layers

1. **App layer** (`lib/tenant-db.ts`): every Firestore query used by a page or route goes
   through `tenantCollection()`/`getTenantDoc()`, which bake the `orgId` filter into the
   query itself. There is no code path to these collections that skips the filter.
2. **Database layer** (`lib/firestore-rules/firestore.rules`): the actual security
   boundary of record. Rules check `request.auth.token.orgId` against each document's
   `orgId` field and `request.auth.token.role` against an explicit allow-list per
   collection, with a default-deny catch-all at the bottom.

See `GAP_ANALYSIS.md` for what's proven by an automated test vs. written-but-not-emulator-tested.
