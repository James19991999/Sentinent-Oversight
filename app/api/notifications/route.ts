import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession, SessionError } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import type { NotificationPreferences } from "@/lib/types";

const DEFAULTS: Omit<NotificationPreferences, "uid" | "orgId" | "updatedAt"> = {
  criticalThreatAlerts: true,
  complianceDriftWarnings: true,
  playbookRunResults: false,
  weeklyTrainingReminders: false,
};

// Only these fields can ever be written — never a raw spread of the
// request body (mass-assignment guard), and never a client-supplied uid
// or orgId, both of which always come from the verified session.
const UpdateSchema = z.object({
  criticalThreatAlerts: z.boolean(),
  complianceDriftWarnings: z.boolean(),
  playbookRunResults: z.boolean(),
  weeklyTrainingReminders: z.boolean(),
});

export async function GET() {
  try {
    const session = await requireServerSession();
    const snap = await adminDb().collection("notification_preferences").doc(session.uid).get();

    if (!snap.exists) {
      return NextResponse.json({ data: { uid: session.uid, orgId: session.orgId, ...DEFAULTS }, error: null });
    }

    const data = snap.data();
    // Defense in depth: even though the doc is keyed by the caller's own
    // uid (so this should be structurally impossible), refuse to return
    // a document that somehow belongs to a different org.
    if (data?.orgId !== session.orgId) {
      return NextResponse.json({ data: null, error: "Preferences not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { id: snap.id, ...data }, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to load notification preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireServerSession();

    const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid preferences payload" }, { status: 400 });
    }

    const record: NotificationPreferences = {
      uid: session.uid, // always the session's own uid — never client-supplied
      orgId: session.orgId, // always the session's org — never client-supplied
      updatedAt: new Date().toISOString(),
      ...parsed.data,
    };

    // A user can only ever write their own preferences doc — the doc id
    // is the session's own uid, not something the client passes in.
    await adminDb().collection("notification_preferences").doc(session.uid).set(record);

    return NextResponse.json({ data: record, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to save notification preferences" }, { status: 500 });
  }
}
