import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Permission } from "../permissions.js";

type PermissionsModule = typeof import("../permissions.js");

let mod: PermissionsModule;

beforeEach(async () => {
  vi.resetModules();
  mod = await import("../permissions.js");
});

describe("registerDomainModulePermissions and lookupPermission", () => {
  it("returns central roles when no module is registered", () => {
    expect(mod.lookupPermission("class:join")).toEqual(["STUDENT"]);
  });

  it("returns undefined for an unknown key", () => {
    expect(mod.lookupPermission("nope:missing")).toBeUndefined();
  });

  it("finds a key that only a module registers", () => {
    mod.registerDomainModulePermissions({
      moduleName: "widgets",
      keys: [{ key: "widget:make", roles: ["TEACHER"] }],
    });

    expect(mod.lookupPermission("widget:make")).toEqual(["TEACHER"]);
  });

  it("lets a module override a central key", () => {
    mod.registerDomainModulePermissions({
      moduleName: "classes",
      keys: [{ key: "class:join", roles: ["TEACHER"] }],
    });

    expect(mod.lookupPermission("class:join")).toEqual(["TEACHER"]);
  });

  it("uses the last registered module for a duplicate key", () => {
    mod.registerDomainModulePermissions({
      moduleName: "first",
      keys: [{ key: "dup:key", roles: ["STUDENT"] }],
    });
    mod.registerDomainModulePermissions({
      moduleName: "second",
      keys: [{ key: "dup:key", roles: ["ADMIN"] }],
    });

    expect(mod.lookupPermission("dup:key")).toEqual(["ADMIN"]);
  });

  it("falls back to an earlier module when a later one lacks the key", () => {
    mod.registerDomainModulePermissions({
      moduleName: "first",
      keys: [{ key: "a:key", roles: ["STUDENT"] }],
    });
    mod.registerDomainModulePermissions({
      moduleName: "second",
      keys: [{ key: "b:key", roles: ["ADMIN"] }],
    });

    expect(mod.lookupPermission("a:key")).toEqual(["STUDENT"]);
    expect(mod.lookupPermission("b:key")).toEqual(["ADMIN"]);
  });

  it("keeps an empty role list from a module and denies every role", () => {
    mod.registerDomainModulePermissions({
      moduleName: "locked",
      keys: [{ key: "class:create", roles: [] }],
    });

    expect(mod.lookupPermission("class:create")).toEqual([]);
    expect(mod.hasPermission("ADMIN", "class:create")).toBe(false);
    expect(mod.hasPermission("SYSTEM", "class:create")).toBe(false);
  });
});

describe("hasPermission with module keys", () => {
  it("grants and denies a module-only key by role", () => {
    mod.registerDomainModulePermissions({
      moduleName: "avatar",
      keys: [{ key: "avatar:write", roles: ["STUDENT"] }],
    });

    expect(mod.hasPermission("STUDENT", "avatar:write" as Permission)).toBe(true);
    expect(mod.hasPermission("TEACHER", "avatar:write" as Permission)).toBe(false);
  });

  it("throws for a key that neither a module nor the central map defines", () => {
    expect(() => mod.hasPermission("ADMIN", "ghost:key" as Permission)).toThrow(
      "Unknown permission: ghost:key"
    );
  });

  it("denies a role that the central map leaves out", () => {
    expect(mod.hasPermission("TEACHER", "class:join")).toBe(false);
    expect(mod.hasPermission("SALES_REP", "class:read")).toBe(false);
  });
});
