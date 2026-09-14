# Fix pass — sign-in bug, forgot password, and a security issue

## 1. The actual sign-in bug (root cause found and fixed)

**Symptom:** correct email/password, sign-in appears to do nothing or silently
bounces back to the sign-in page.

**Root cause:** sign-up does two things in sequence — (1) Firebase creates the
login, then (2) the server creates an organization and grants `orgId`/`role`
custom claims. If step 2 ever fails after step 1 succeeds (a network blip, or
the Firebase Admin credential issue you'd already hit), you get a real, working
Firebase login with **no organization attached**. That account can sign in
successfully — correct password, valid token — but every protected page
correctly treats "no orgId/role" as "not really signed in," so it silently
redirects back to `/sign-in` with no explanation.

**Fix, in three parts:**
- `app/api/session/route.ts` now explicitly detects "valid token, but no
  orgId/role" and returns a distinguishable error (`ACCOUNT_NOT_PROVISIONED`)
  instead of minting a session cookie that would just fail downstream anyway.
- A new `/complete-setup` page lets someone in this state finish creating
  their organization using their already-verified login — no need to
  re-register. It reuses the existing `/api/auth/sign-up` endpoint, which
  already safely handles "this account has no org yet."
- Both `sign-in` and `sign-up` now redirect to `/complete-setup` automatically
  the moment this state is detected, instead of showing a misleading "wrong
  password" message or leaving someone stuck on the sign-up form.

**If you already have an account stuck in this state**, just sign in with it
again — you'll be sent to Complete Setup automatically instead of bouncing.

## 2. Forgot password (was missing entirely)

- New `/forgot-password` page using Firebase's real `sendPasswordResetEmail`.
- Linked from the sign-in page, next to the password field.
- Uses the anti-enumeration pattern: shows the same "check your email" message
  whether or not the email actually has an account, so the page can't be used
  to discover which emails are registered. Genuine errors (rate-limited,
  malformed email) still surface normally.

## 3. Security issue found and removed

`app/api/debug/firebase-config/route.ts` was a **public, unauthenticated**
endpoint that returned your Firebase service account's client email, and
confirmed whether your private key was set along with its length and format.
Deleted entirely. If this was ever deployed live, rotate that service
account's key as a precaution.

## Verification

All of the above is covered by new tests, not just manual inspection:
- `tests/api/session.test.ts` — pins the exact `ACCOUNT_NOT_PROVISIONED` fix
- `tests/pages/sign-in.test.tsx` — forgot-password link + repair redirect
- `tests/pages/sign-up.test.tsx` — repair redirect after account-creation-then-provisioning-failure
- `tests/pages/forgot-password.test.tsx` — including the anti-enumeration cases
- `tests/pages/complete-setup.test.tsx` — the repair flow itself

**127/127 tests passing, 0 TypeScript errors, 0 ESLint errors, clean production
build (64 pages across 3 locales).** All re-verified from this exact code, not
carried over from an earlier claim.

## What this does NOT fix

This pass fixed a real bug in the app's own code. It did not and cannot fix
anything on the Firebase/Vercel configuration side — if your Firebase Admin
credentials are still misconfigured on Vercel, sign-up will still fail at step
2 above, just more gracefully now (routing to Complete Setup instead of
silently stranding the account). Worth double-checking your Vercel
environment variables against `.env.example` while you're in there.
