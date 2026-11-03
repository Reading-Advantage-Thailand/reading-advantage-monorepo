import { hasPermission, lookupPermission } from "@reading-advantage/auth";
import { describe, expect, it } from "vitest";
import { READING_PERMISSIONS } from "../permissions.js";

describe("reading permissions", () => {
  it("registers every reading key with the same roles as the constant", () => {
    for (const [key, roles] of Object.entries(READING_PERMISSIONS)) {
      expect(lookupPermission(key)).toEqual([...roles]);
    }
  });

  it("keeps the system dashboard SYSTEM-only and segments for ADMIN and SYSTEM", () => {
    expect(hasPermission("ADMIN", "system:dashboard:read" as never)).toBe(false);
    expect(hasPermission("SYSTEM", "system:dashboard:read" as never)).toBe(true);
    expect(hasPermission("ADMIN", "admin:segments:read" as never)).toBe(true);
    expect(hasPermission("TEACHER", "admin:segments:read" as never)).toBe(false);
    expect(hasPermission("STUDENT", "admin:license:read:own" as never)).toBe(true);
  });
});
