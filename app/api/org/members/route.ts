import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession, SessionError } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { tenantCollection } from "@/lib/tenant-db";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { OrgMember } from "@/lib/types";

const InviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member"]), // an invite can never mint another owner
});

export async function GET() {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "members:read");

    const snap = await tenantCollection("members", session.orgId).get();
    const rows = snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }) as OrgMember);
    return NextResponse.json({ data: rows, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to load members" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "members:write");

    const parsed = InviteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid invite payload" }, { status: 400 });
    }

    // Look up (or lazily create, in an unverified state) the invited user
    // by email, then set org/role claims scoped to the inviter's org only
    // — never a client-supplied orgId.
    let invitedUser;
    try {
      invitedUser = await adminAuth().getUserByEmail(parsed.data.email);
    } catch {
      invitedUser = await adminAuth().createUser({ email: parsed.data.email });
    }

    await adminAuth().setCustomUserClaims(invitedUser.uid, {
      orgId: session.orgId,
      role: parsed.data.role,
    });

    await adminDb()
      .collection("members")
      .doc(invitedUser.uid)
      .set({
        uid: invitedUser.uid,
        email: parsed.data.email,
        displayName: parsed.data.email,
        role: parsed.data.role,
        orgId: session.orgId,
        createdAt: new Date().toISOString(),
      });

    return NextResponse.json({ data: { uid: invitedUser.uid }, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to invite member" }, { status: 500 });
  }
}
