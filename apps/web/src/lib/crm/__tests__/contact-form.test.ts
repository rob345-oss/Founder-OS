import { describe, expect, it } from "vitest";

import {
  buildFullName,
  contactPreferencesFromForm,
  pipelineAndRelationshipFromLifecycle,
  resolvePrimaryEmail,
  validateContactForm,
  type ContactFormInput,
} from "../contact-form";

const base: ContactFormInput = {
  contactType: "general_contact",
  lifecycle: "new_lead",
  leadSource: "manual",
};

describe("contact form", () => {
  it("builds full name from parts", () => {
    expect(buildFullName({ firstName: "Jane", lastName: "Doe" })).toBe("Jane Doe");
  });

  it("uses synthetic founder-os email when email omitted", () => {
    const email = resolvePrimaryEmail({ ...base, firstName: "Jane", lastName: "Doe" }, { suffix: "fixed1234" });
    expect(email).toBe("jane-doe.fixed1234@founder-os.local");
  });

  it("requires email or phone", () => {
    expect(validateContactForm(base).ok).toBe(false);
    expect(validateContactForm({ ...base, phone: "+1 555 0100" }).ok).toBe(true);
  });

  it("maps lifecycle to pipeline and relationship", () => {
    expect(pipelineAndRelationshipFromLifecycle("qualified")).toEqual({
      relationshipStatus: "interested",
      pipelineStage: "qualified",
    });
  });

  it("maps preference fields", () => {
    expect(
      contactPreferencesFromForm({
        ...base,
        preferredChannel: "email",
        doNotContact: true,
        preferenceNotes: "Call after 5pm",
      }),
    ).toEqual({ preferredChannel: "email", doNotContact: true, notes: "Call after 5pm" });
  });
});