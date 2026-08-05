import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession, SessionError } from "@/lib/session";
import { assertPermission, RbacError } from "@/lib/rbac";
import { tenantCollection } from "@/lib/tenant-db";
import { adminDb } from "@/lib/firebase-admin";
import type { ComplianceFramework } from "@/lib/types";

// Only these fields can ever be written by a client — never a raw spread
// of the request body onto the document (mass-assignment guard).
const CreateComplianceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  status: z.enum(["compliant", "in-progress", "at-risk"]),
  completion: z.number().int().min(0).max(100),
});

const UpdateComplianceSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["compliant", "in-progress", "at-risk"]).optional(),
  completion: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "compliance:read");

    const snap = await tenantCollection("compliance", session.orgId).get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ComplianceFramework);

    return NextResponse.json({ data: rows, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to load compliance frameworks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "compliance:write");

    const parsed = CreateComplianceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid compliance framework payload" }, { status: 400 });
    }

    const docRef = adminDb().collection("compliance").doc();
    const record: ComplianceFramework = {
      id: docRef.id,
      orgId: session.orgId, // always the session's org — never client-supplied
      lastAuditedAt: new Date().toISOString(),
      ...parsed.data,
    };
    await docRef.set(record);

    return NextResponse.json({ data: record, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to create compliance framework" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "compliance:write");

    const parsed = UpdateComplianceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid update payload" }, { status: 400 });
    }
    const { id, ...updates } = parsed.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ data: null, error: "No fields to update" }, { status: 400 });
    }

    // Verify the document belongs to the caller's org BEFORE writing —
    // never trust the id alone. Firestore's .update() would happily write
    // to any doc by id regardless of tenant if we skipped this check.
    const docRef = adminDb().collection("compliance").doc(id);
    const existing = await docRef.get();
    if (!existing.exists || existing.data()?.orgId !== session.orgId) {
      return NextResponse.json({ data: null, error: "Compliance framework not found" }, { status: 404 });
    }

    await docRef.update({ ...updates, lastAuditedAt: new Date().toISOString() });
    return NextResponse.json({ data: { id, ...updates }, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to update compliance framework" }, { status: 500 });
  }
}
