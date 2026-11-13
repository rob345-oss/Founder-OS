import { describe, expect, it } from "vitest";

import { isSuperAdminProfile } from "../tg-client";

describe("isSuperAdminProfile", () => {
  it("accepts application_role super_admin", () => {
    expect(isSuperAdminProfile({ id: "1", email: "a@b.com", application_role: "super_admin" })).toBe(true);
  });

  it("accepts roles array", () => {
    expect(isSuperAdminProfile({ id: "1", email: "a@b.com", roles: ["user", "super_admin"] })).toBe(true);
  });

  it("rejects regular users", () => {
    expect(isSuperAdminProfile({ id: "1", email: "a@b.com", application_role: "user", roles: ["user"] })).toBe(false);
  });
});
