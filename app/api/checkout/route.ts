import { NextResponse } from "next/server";
import { requireServerSession, SessionError } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function POST() {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "billing:write");

    const orgRef = adminDb().collection("organizations").doc(session.orgId);
    const orgSnap = await orgRef.get();
    const org = orgSnap.data();

    const checkoutSession = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PLAN_PRICE_IDS.pro, quantity: 1 }],
      customer: org?.stripeCustomerId,
      customer_email: org?.stripeCustomerId ? undefined : session.email,
      client_reference_id: session.orgId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=cancelled`,
      metadata: { orgId: session.orgId },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ data: null, error: "Stripe did not return a checkout URL" }, { status: 502 });
    }

    return NextResponse.json({ data: { url: checkoutSession.url }, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to start checkout" }, { status: 500 });
  }
}
