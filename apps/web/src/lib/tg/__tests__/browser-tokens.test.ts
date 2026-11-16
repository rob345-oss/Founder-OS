/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";

import { getStoredTgAccessToken, migrateLegacyTgSessionTokens } from "../browser-tokens";

describe("getStoredTgAccessToken", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("reads access_token from localStorage", () => {
    window.localStorage.setItem("access_token", "jwt-1");
    window.localStorage.setItem("refresh_token", "r1");
    expect(getStoredTgAccessToken()).toBe("jwt-1");
  });

  it("migrates legacy sessionStorage tokens", () => {
    window.sessionStorage.setItem("access_token", "legacy-jwt");
    window.sessionStorage.setItem("refresh_token", "legacy-r");
    migrateLegacyTgSessionTokens();
    expect(window.localStorage.getItem("access_token")).toBe("legacy-jwt");
    expect(getStoredTgAccessToken()).toBe("legacy-jwt");
  });
});