import { describe, it, expect } from "vitest";
import { hasPermission, lookupPermission, type Permission } from "../permissions.js";

// Defect: lookupPermission reads PERMISSIONS[key] on a plain object, so
// inherited Object.prototype names (toString, constructor) resolve to
// functions instead of undefined. hasPermission then calls
// Function#includes and throws a TypeError, not "Unknown permission".
describe("permission keys that match Object.prototype names", () => {
  it.fails("lookupPermission returns undefined for toString", () => {
    expect(lookupPermission("toString")).toBeUndefined();
  });

  it.fails("lookupPermission returns undefined for constructor", () => {
    expect(lookupPermission("constructor")).toBeUndefined();
  });

  it.fails("hasPermission reports an unknown permission for toString", () => {
    expect(() => hasPermission("ADMIN", "toString" as Permission)).toThrow(
      "Unknown permission: toString"
    );
  });
});
