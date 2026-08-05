import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ data: null, error: "Missing webhook signature or secret" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    // Signature verification — the whole point of a webhook secret. A
    // request that doesn't verify is rejected outright, never processed.
    event = stripe().webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ data: null, error: "Invalid signature" }, { status: 400 });
  }

  // Everything past this point talks to Firestore and can fail for reasons
  // that have nothing to do with the request itself (transient outage,
  // permission error, etc). An audit of this route found that failure
  // wasn't handled here, unlike every other route in the app — a bad
  // Firestore call crashed to a bare 500 with no JSON body instead of the
  // structured `{ data, error }` shape used everywhere else. Stripe will
  // still retry on a 5xx (that's correct and desired), but the response
  // itself must never be an unhandled exception.
  try {
    const eventRef = adminDb().collection("stripe_events").doc(event.id);

    // Idempotency: Stripe retries webhooks on timeout/5xx, so the same
    // event.id can arrive more than once. A processed-events ledger, keyed
    // by event.id with a transaction, makes re-delivery a safe no-op
    // instead of double-applying a subscription state change.
    const alreadyProcessed = await adminDb().runTransaction(async (tx) => {
      const existing = await tx.get(eventRef);
      if (existing.exists) return true;
      tx.set(eventRef, { type: event.type, receivedAt: new Date().toISOString() });
      return false;
    });

    if (alreadyProcessed) {
      return NextResponse.json({ data: { received: true, duplicate: true }, error: null });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId ?? session.client_reference_id;
        if (orgId && session.customer && session.subscription) {
          await adminDb().collection("organizations").doc(orgId).update({
            stripeCustomerId: String(session.customer),
            stripeSubscriptionId: String(session.subscription),
            plan: "pro",
            subscriptionStatus: "active",
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgsQuery = await adminDb()
          .collection("organizations")
          .where("stripeSubscriptionId", "==", subscription.id)
          .limit(1)
          .get();
        const orgDoc = orgsQuery.docs[0];
        if (orgDoc) {
          await orgDoc.ref.update({
            subscriptionStatus: event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
          });
        }
        break;
      }
      default:
        // Unhandled event types are acknowledged, not errored — Stripe
        // only needs a 2xx to stop retrying.
        break;
    }

    return NextResponse.json({ data: { received: true }, error: null });
  } catch (err) {
    // Logged server-side for debugging; never reflected into the response
    // body, so nothing about the failure (stack trace, internal error
    // text) reaches whoever/whatever is calling this endpoint.
    console.error(`[stripe-webhook] failed to process event ${event.id} (${event.type}):`, err);
    return NextResponse.json(
      { data: null, error: "Failed to process webhook event" },
      { status: 500 }
    );
  }
}
