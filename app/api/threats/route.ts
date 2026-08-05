import { NextResponse } from "next/server";
import { z } from "zod";
import { requireServerSession, SessionError } from "@/lib/session";
import { assertPermission, can, RbacError } from "@/lib/rbac";
import { tenantCollection } from "@/lib/tenant-db";
import { adminDb } from "@/lib/firebase-admin";
import type { ThreatEvent } from "@/lib/types";

// Only these fields can ever be written by a client — never a raw spread
// of the request body onto the document (mass-assignment guard).
const CreateThreatSchema = z.object({
  title: z.string().trim().min(1).max(200),
  severity: z.enum(["critical", "high", "medium", "low"]),
  sourceIp: z.string().trim().min(1).max(64),
  vector: z.string().trim().min(1).max(200),
});

export async function GET() {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "threats:read");

    const snap = await tenantCollection("threats", session.orgId).get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ThreatEvent);

    // Role-filtered response: members see everything except who it's
    // currently assigned to internally (kept for admin/owner triage only).
    const filtered = can(session.role, "threats:write")
      ? rows
      : rows.map(({ assignedTo, ...rest }) => rest);

    return NextResponse.json({ data: filtered, error: null });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to load threats" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireServerSession();
    assertPermission(session.role, "threats:write");

    const parsed = CreateThreatSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid threat payload" }, { status: 400 });
    }

    const docRef = adminDb().collection("threats").doc();
    const record: ThreatEvent = {
      id: docRef.id,
      orgId: session.orgId, // always the session's org — never client-supplied
      status: "active",
      detectedAt: new Date().toISOString(),
      ...parsed.data,
    };
    await docRef.set(record);

    return NextResponse.json({ data: record, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof SessionError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    if (err instanceof RbacError) return NextResponse.json({ data: null, error: err.message }, { status: err.status });
    return NextResponse.json({ data: null, error: "Failed to create threat" }, { status: 500 });
  }
}
