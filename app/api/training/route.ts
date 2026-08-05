import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession, SessionError } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { tenantCollection } from "@/lib/tenant-db";
import { adminDb } from "@/lib/firebase-admin";
import type { TrainingModule } from "@/lib/types";

// Only these fields can ever be written by a client — never a raw spread
// of the request body onto the document (mass-assignment guard).
const CreateTrainingSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(600),
});

const UpdateTrainingSchema = z.object({
  id: z.string().trim().min(1),
  completionRate: z.number().int().min(0).max(100),
});

export async function GET() {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "training:read");

    const snap = await tenantCollection("training", session.orgId).get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TrainingModule);

    return NextResponse.json({ data: rows, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to load training modules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "training:write");

    const parsed = CreateTrainingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid training module payload" }, { status: 400 });
    }

    const docRef = adminDb().collection("training").doc();
    const record: TrainingModule = {
      id: docRef.id,
      orgId: session.orgId, // always the session's org — never client-supplied
      completionRate: 0,
      ...parsed.data,
    };
    await docRef.set(record);

    return NextResponse.json({ data: record, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to create training module" }, { status: 500 });
  }
}

// Any authenticated member of the org can mark their own progress — this
// is intentionally NOT gated behind training:write (that permission
// governs authoring modules, not completing them). See lib/rbac.ts.
export async function PATCH(request: Request) {
  try {
    const session = await requireServerSession();

    const parsed = UpdateTrainingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid update payload" }, { status: 400 });
    }
    const { id, completionRate } = parsed.data;

    const docRef = adminDb().collection("training").doc(id);
    const existing = await docRef.get();
    if (!existing.exists || existing.data()?.orgId !== session.orgId) {
      return NextResponse.json({ data: null, error: "Training module not found" }, { status: 404 });
    }

    await docRef.update({ completionRate });
    return NextResponse.json({ data: { id, completionRate }, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to update training module" }, { status: 500 });
  }
}
