import { describe, expect, it } from "vitest";

describe("CRM session client errors", () => {
  it("maps HTTP statuses to actionable messages", async () => {
    const { sessionErrorMessage } = await import("../session-fetch");
    expect(sessionErrorMessage(401, {})).toMatch(/Sign in/i);
    expect(sessionErrorMessage(403, {})).toMatch(/super_admin/i);
    expect(sessionErrorMessage(503, { error: "upstream" })).toMatch(/temporarily unavailable/i);
    expect(sessionErrorMessage(400, { error: "bad" })).toBe("bad");
  });
});
