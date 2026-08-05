import { NextResponse } from "next/server";
import { requireServerSession, SessionError } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { getTenantDoc } from "@/lib/tenant-db";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "response:write");

    const playbook = await getTenantDoc("playbooks", params.id, session.orgId);
    if (!playbook) {
      return NextResponse.json({ data: null, error: "Playbook not found" }, { status: 404 });
    }

    // Only ever write the two fields a "run" is allowed to change — never
    // `request.body` spread onto the document. This is the mass-assignment
    // guard from the Security Checklist made concrete.
    await adminDb().collection("playbooks").doc(params.id).update({
      status: "running",
      lastRunAt: new Date().toISOString(),
    });

    return NextResponse.json({ data: { id: params.id, status: "running" }, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to run playbook" }, { status: 500 });
  }
}
