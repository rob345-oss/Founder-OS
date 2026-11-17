import { describe, expect, it } from "vitest";

import { parseCrmPhoneEntry } from "../contact-phone";

describe("contact phone normalization", () => {
  it("parses US national number with country code", () => {
    const n = parseCrmPhoneEntry("US", "2025550100", "+1");
    expect(n.valid).toBe(true);
    expect(n.e164).toBe("+12025550100");
    expect(n.countryCallingCode).toBe("+1");
  });

  it("parses Spain mobile", () => {
    const n = parseCrmPhoneEntry("ES", "612345678", "+34");
    expect(n.valid).toBe(true);
    expect(n.countryCallingCode).toBe("+34");
    expect(n.e164?.startsWith("+34")).toBe(true);
  });

  it("handles extension metadata", () => {
    const n = parseCrmPhoneEntry("US", "2025550100", "+1", "99");
    expect(n.extension).toBe("99");
    expect(n.e164).toContain(";ext=99");
  });

  it("distinguishes US area code from country code in storage", () => {
    const us = parseCrmPhoneEntry("US", "4155550100", "+1");
    const es = parseCrmPhoneEntry("ES", "415555010", "+34");
    expect(us.countryCallingCode).toBe("+1");
    expect(es.countryCallingCode).toBe("+34");
    expect(us.e164).not.toBe(es.e164);
  });
});