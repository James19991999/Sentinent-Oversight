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

  try {
    // Verifying the ID token before minting a session cookie prevents a
    // forged/expired token from producing a valid session.
    await adminAuth().verifyIdToken(idToken);
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
      
      if (errorMsg.includes("claims") || errorMsg.includes("org")) {
        message = "Your account is not properly configured. Please contact support.";
      } else if (errorMsg.includes("firebase") && (errorMsg.includes("credential") || errorMsg.includes("auth"))) {
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
