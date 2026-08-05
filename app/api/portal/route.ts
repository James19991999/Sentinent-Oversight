import { NextResponse } from "next/server";
import { requireServerSession, SessionError } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function POST() {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "billing:write");

    const orgSnap = await adminDb().collection("organizations").doc(session.orgId).get();
    const stripeCustomerId = orgSnap.data()?.stripeCustomerId as string | undefined;
    if (!stripeCustomerId) {
      return NextResponse.json({ data: null, error: "No billing account on file yet" }, { status: 400 });
    }

    const portalSession = await stripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return NextResponse.json({ data: { url: portalSession.url }, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to open billing portal" }, { status: 500 });
  }
}
