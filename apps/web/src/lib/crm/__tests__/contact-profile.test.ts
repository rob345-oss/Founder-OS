import { describe, expect, it } from "vitest";

import {
  composeFullName,
  emptyContactProfile,
  ensureSinglePrimary,
  parseContactProfile,
  resolveScalarsFromProfile,
  sanitizeProfileForStorage,
  validateContactProfile,
} from "../contact-profile";

describe("contact profile", () => {
  it("composes full name from parts", () => {
    const p = emptyContactProfile();
    p.identity.firstName = "Ada";
    p.identity.lastName = "Lovelace";
    expect(composeFullName(p.identity)).toBe("Ada Lovelace");
  });

  it("enforces single primary email", () => {
    const p = emptyContactProfile();
    p.emails = [
      { id: "a", address: "a@x.com", label: "work", isPrimary: true },
      { id: "b", address: "b@x.com", label: "personal", isPrimary: true },
    ];
    const fixed = ensureSinglePrimary(p.emails);
    expect(fixed.filter((e) => e.isPrimary)).toHaveLength(1);
  });

  it("resolves scalar fields for persistence", () => {
    const p = emptyContactProfile();
    p.identity.firstName = "Test";
    p.identity.lastName = "User";
    p.identity.company = "Acme";
    p.emails = [{ id: "e1", address: "test@example.com", label: "work", isPrimary: true }];
    const scalars = resolveScalarsFromProfile(p);
    expect(scalars.primaryEmail).toBe("test@example.com");
    expect(scalars.fullName).toBe("Test User");
    expect(scalars.organization).toBe("Acme");
  });

  it("validates email requirements", () => {
    const p = emptyContactProfile();
    p.emails = [{ id: "e1", address: "", label: "work", isPrimary: true }];
    const errors = validateContactProfile(p);
    expect(errors.emails).toBeTruthy();
  });

  it("round-trips profile storage", () => {
    const raw = sanitizeProfileForStorage(emptyContactProfile());
    expect(parseContactProfile(raw).version).toBe(1);
  });
});