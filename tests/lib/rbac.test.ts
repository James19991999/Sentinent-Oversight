import { can, assertPermission, RbacError } from "@/lib/rbac";

describe("rbac.can", () => {
  it("grants owner every permission members have and more", () => {
    expect(can("owner", "billing:write")).toBe(true);
    expect(can("owner", "members:remove")).toBe(true);
    expect(can("owner", "threats:write")).toBe(true);
  });

  it("denies member write access to threats", () => {
    expect(can("member", "threats:write")).toBe(false);
    expect(can("member", "threats:read")).toBe(true);
  });

  it("denies admin billing:write and members:remove", () => {
    expect(can("admin", "billing:write")).toBe(false);
    expect(can("admin", "members:remove")).toBe(false);
  });

  it("denies member access to settings:write and billing:write", () => {
    expect(can("member", "settings:write")).toBe(false);
    expect(can("member", "billing:write")).toBe(false);
  });

  it("allows member to trigger response playbooks (response:write)", () => {
    expect(can("member", "response:write")).toBe(true);
  });
});

describe("rbac.assertPermission", () => {
  it("does not throw when the role has the permission", () => {
    expect(() => assertPermission("owner", "billing:write")).not.toThrow();
  });

  it("throws an RbacError with status 403 when the role lacks the permission", () => {
    expect(() => assertPermission("member", "billing:write")).toThrow(RbacError);
    try {
      assertPermission("member", "billing:write");
    } catch (err) {
      expect(err).toBeInstanceOf(RbacError);
      expect((err as RbacError).status).toBe(403);
    }
  });
});
