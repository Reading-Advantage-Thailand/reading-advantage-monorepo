import { hasPermission, lookupPermission } from "@reading-advantage/auth";
import { describe, expect, it } from "vitest";
import { RPG_PERMISSIONS } from "../permissions.js";

describe("rpg permissions", () => {
  it("lets every role read its own rpg state and only a student equip", () => {
    expect(RPG_PERMISSIONS["rpg:read:own"]).toEqual(["STUDENT", "TEACHER", "ADMIN", "SYSTEM"]);
    expect(RPG_PERMISSIONS["rpg:equip:own"]).toEqual(["STUDENT"]);
  });

  it("registers both keys with the auth permission lookup", () => {
    expect(lookupPermission("rpg:read:own")).toEqual([...RPG_PERMISSIONS["rpg:read:own"]]);
    expect(lookupPermission("rpg:equip:own")).toEqual(["STUDENT"]);
    expect(hasPermission("STUDENT", "rpg:equip:own" as never)).toBe(true);
    expect(hasPermission("TEACHER", "rpg:equip:own" as never)).toBe(false);
  });
});
