import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession, SessionError } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { tenantCollection } from "@/lib/tenant-db";
import { adminDb } from "@/lib/firebase-admin";
import type { ResponsePlaybook } from "@/lib/types";

// Only these fields can ever be written by a client — never a raw spread
// of the request body onto the document (mass-assignment guard).
const CreatePlaybookSchema = z.object({
  name: z.string().trim().min(1).max(200),
  trigger: z.string().trim().min(1).max(300),
  meanTimeToRespondMinutes: z.number().int().min(0).max(10_000),
});

export async function GET() {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "response:read");

    const snap = await tenantCollection("playbooks", session.orgId).get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ResponsePlaybook);

    return NextResponse.json({ data: rows, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to load playbooks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    // Defining a new playbook is an authoring action, gated the same as
    // Threats/Compliance authoring — distinct from response:write, which
    // (per lib/rbac.ts) also covers members triggering an existing
    // playbook's run. Only owner/admin can create the playbook itself.
    assertPermission(session.role, "response:write");
    if (session.role === "member") {
      return NextResponse.json({ data: null, error: "Only owners and admins can create playbooks" }, { status: 403 });
    }

    const parsed = CreatePlaybookSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid playbook payload" }, { status: 400 });
    }

    const docRef = adminDb().collection("playbooks").doc();
    const record: ResponsePlaybook = {
      id: docRef.id,
      orgId: session.orgId, // always the session's org — never client-supplied
      status: "idle",
      ...parsed.data,
    };
    await docRef.set(record);

    return NextResponse.json({ data: record, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to create playbook" }, { status: 500 });
  }
}
