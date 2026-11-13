import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../tg-client", () => ({
  fetchTgAuthMe: vi.fn(),
  isSuperAdminProfile: (me: { application_role?: string; roles?: string[] }) => {
    const role = (me.application_role ?? "").toLowerCase();
    if (role === "super_admin") return true;
    return (me.roles ?? []).map((r) => r.toLowerCase()).includes("super_admin");
  },
}));

import { fetchTgAuthMe } from "../tg-client";
import { requireCrmSuperAdmin } from "../guard";

describe("requireCrmSuperAdmin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(fetchTgAuthMe).mockReset();
  });

  it("returns 401 without bearer", async () => {
    const req = new NextRequest("http://localhost/api/crm/session");
    const guard = await requireCrmSuperAdmin(req);
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(401);
  });

  it("returns 403 when TG role is not super_admin", async () => {
    vi.mocked(fetchTgAuthMe).mockResolvedValue({
      ok: true,
      data: { id: "1", email: "user@test.com", application_role: "user", roles: ["user"] },
    });
    const req = new NextRequest("http://localhost/api/crm/session", {
      headers: { Authorization: "Bearer fake" },
    });
    const guard = await requireCrmSuperAdmin(req);
    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(403);
  });

  it("allows super_admin", async () => {
    vi.mocked(fetchTgAuthMe).mockResolvedValue({
      ok: true,
      data: { id: "1", email: "admin@test.com", application_role: "super_admin", roles: ["super_admin"] },
    });
    const req = new NextRequest("http://localhost/api/crm/session", {
      headers: { Authorization: "Bearer fake" },
    });
    const guard = await requireCrmSuperAdmin(req);
    expect(guard.ok).toBe(true);
  });
});
