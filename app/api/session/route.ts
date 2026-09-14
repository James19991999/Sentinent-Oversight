import { NextResponse } from "next/server";
import { adminAuth, getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { sessionCookieOptions } from "@/lib/session-cookie";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days
const RATE_LIMIT_PER_MINUTE = 10;

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(`session:${getClientIp(request)}`, RATE_LIMIT_PER_MINUTE);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { data: null, error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const idToken = body?.idToken as string | undefined;
  if (!idToken) {
    return NextResponse.json({ data: null, error: "Missing idToken" }, { status: 400 });
  }

  const adminConfigError = getFirebaseAdminConfigError();
  if (adminConfigError) {
    return NextResponse.json({ data: null, error: adminConfigError }, { status: 503 });
  }

  let decoded;
  try {
    // Verifying the ID token before minting a session cookie prevents a
    // forged/expired token from producing a valid session.
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ data: null, error: "Invalid or expired token" }, { status: 401 });
  }

  // A real, reproducible bug this fixes: sign-up does two things in
  // sequence — create the Firebase Auth user, then call /api/auth/sign-up
  // to create an organization and grant orgId/role custom claims. If the
  // second step ever fails (a network blip, a transient Firebase Admin
  // credential issue, the user closing the tab) after the first one
  // succeeded, the result is a real, working login with no organization
  // attached. That account could sign in successfully — correct password,
  // valid token — and then get silently redirected straight back to
  // /sign-in with no error message, because every protected page
  // correctly treats "no orgId/role" as "not really signed in." From the
  // user's side that looked indistinguishable from sign-in just not
  // working at all.
  //
  // Catching it here, before minting a cookie that would be useless
  // downstream anyway, means the sign-in page can detect this specific
  // case and send the person to /complete-setup to finish provisioning
  // their existing account, instead of a silent dead end.
  const claims = decoded as { orgId?: string; role?: string };
  if (!claims.orgId || !claims.role) {
    return NextResponse.json(
      { data: null, error: "ACCOUNT_NOT_PROVISIONED", code: "ACCOUNT_NOT_PROVISIONED" },
      { status: 409 }
    );
  }

  try {
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_EXPIRY_MS });

    const response = NextResponse.json({ data: { ok: true }, error: null });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionCookie,
      sessionCookieOptions(SESSION_EXPIRY_MS / 1000)
    );
    return response;
  } catch (err) {
    // Provide more specific error messages for debugging deployment issues
    let message = "Invalid or expired token";

    if (err instanceof Error) {
      const errorMsg = err.message.toLowerCase();

      if (errorMsg.includes("firebase") && (errorMsg.includes("credential") || errorMsg.includes("auth"))) {
        message = "Firebase authentication error. Verify your credentials are correctly configured in the deployment environment.";
      }
    }

    return NextResponse.json({ data: null, error: message }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ data: { ok: true }, error: null });
  response.cookies.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
  return response;
}
