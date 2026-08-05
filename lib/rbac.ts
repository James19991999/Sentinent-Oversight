import type { Role } from "./types";

/**
 * Server-side permission checks. UI gating (hiding a nav item or button)
 * is a UX nicety only — every API route re-checks these before touching
 * data. Hiding a button is never treated as a substitute for this.
 */
export type Permission =
  | "threats:read"
  | "threats:write"
  | "compliance:read"
  | "compliance:write"
  | "response:read"
  | "response:write"
  | "training:read"
  | "training:write"
  | "settings:read"
  | "settings:write"
  | "billing:read"
  | "billing:write"
  | "members:read"
  | "members:write"
  | "members:remove";

const MATRIX: Record<Role, Permission[]> = {
  owner: [
    "threats:read",
    "threats:write",
    "compliance:read",
    "compliance:write",
    "response:read",
    "response:write",
    "training:read",
    "training:write",
    "settings:read",
    "settings:write",
    "billing:read",
    "billing:write",
    "members:read",
    "members:write",
    "members:remove",
  ],
  admin: [
    "threats:read",
    "threats:write",
    "compliance:read",
    "compliance:write",
    "response:read",
    "response:write",
    "training:read",
    "training:write",
    "settings:read",
    "settings:write",
    "billing:read",
    "members:read",
    "members:write",
  ],
  member: [
    "threats:read",
    "compliance:read",
    "response:read",
    "response:write",
    "training:read",
    "settings:read",
    "members:read",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new RbacError(`Role "${role}" lacks permission "${permission}"`);
  }
}

export class RbacError extends Error {
  status = 403 as const;
  constructor(message: string) {
    super(message);
    this.name = "RbacError";
  }
}
