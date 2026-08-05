import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb, getFirebaseAdminConfigError } from "@/lib/firebase-admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const SignUpSchema = z.object({
  idToken: z.string().min(1),
  orgName: z.string().trim().min(2).max(80),
});

const RATE_LIMIT_PER_MINUTE = 5;

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(`sign-up:${getClientIp(request)}`, RATE_LIMIT_PER_MINUTE);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { data: null, error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const parsed = SignUpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "Invalid sign-up payload" }, { status: 400 });
  }

  const adminConfigError = getFirebaseAdminConfigError();
  if (adminConfigError) {
    return NextResponse.json({ data: null, error: adminConfigError }, { status: 503 });
  }

  const { idToken, orgName } = parsed.data;

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ data: null, error: "Invalid or expired token" }, { status: 401 });
  }

  // Guard against re-provisioning: if this uid already has org claims, don't
  // silently overwrite them (would let a signed-in user spin up a second
  // org and reassign their own role).
  if (decoded.orgId) {
    return NextResponse.json({ data: null, error: "This account is already provisioned." }, { status: 409 });
  }

  const orgRef = adminDb().collection("organizations").doc();
  const now = new Date().toISOString();

  await orgRef.set({
    id: orgRef.id,
    name: orgName,
    plan: "trial",
    subscriptionStatus: "trialing",
    createdAt: now,
  });

  await adminDb().collection("members").doc(decoded.uid).set({
    uid: decoded.uid,
    email: decoded.email ?? "",
    displayName: decoded.name ?? decoded.email ?? "Owner",
    role: "owner",
    orgId: orgRef.id,
    createdAt: now,
  });

  // Only Admin SDK — never reachable from the client — can set these claims.
  await adminAuth().setCustomUserClaims(decoded.uid, { orgId: orgRef.id, role: "owner" });

  return NextResponse.json({ data: { orgId: orgRef.id }, error: null });
}
