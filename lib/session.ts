import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";
import type { Role } from "./types";

export interface ServerSession {
  uid: string;
  email: string;
  orgId: string;
  role: Role;
}

const SESSION_COOKIE = "__session";

/**
 * Verifies the session cookie against Firebase Admin and reads orgId/role
 * from custom claims set at sign-up/invite time — never from a request
 * body or query param. This is what every API route calls before doing
 * anything tenant-scoped.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
    const orgId = decoded.orgId as string | undefined;
    const role = decoded.role as Role | undefined;
    if (!orgId || !role) return null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      orgId,
      role,
    };
  } catch {
    // Expired, revoked, or malformed cookie — treat as signed out.
    return null;
  }
}

export async function requireServerSession(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    throw new SessionError("Not authenticated");
  }
  return session;
}

export class SessionError extends Error {
  status = 401 as const;
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
