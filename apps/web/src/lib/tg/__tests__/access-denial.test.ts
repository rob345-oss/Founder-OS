import { describe, expect, it } from "vitest";

import { classifySuperAdminAccess } from "../access-denial";

describe("classifySuperAdminAccess", () => {
  it("distinguishes unauthenticated, forbidden, and transient", () => {
    expect(
      classifySuperAdminAccess({ loading: false, hasBearer: false, authorized: false, error: null }),
    ).toBe("unauthenticated");

    expect(
      classifySuperAdminAccess({
        loading: false,
        hasBearer: true,
        authorized: false,
        error: "Your account is signed in but does not have the super_admin role.",
      }),
    ).toBe("forbidden");

    expect(
      classifySuperAdminAccess({
        loading: false,
        hasBearer: true,
        authorized: false,
        error: "Authorization service is temporarily unavailable. Try again shortly.",
      }),
    ).toBe("transient");

    expect(
      classifySuperAdminAccess({
        loading: false,
        hasBearer: true,
        authorized: false,
        error: "Sign in with your Titanium Guardian Google account.",
      }),
    ).toBe("unauthenticated");
  });
});