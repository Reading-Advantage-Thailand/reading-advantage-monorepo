/**
 * Phase 1 (primary_student_login_20261003): class login sessions, student
 * credentials, and the nullable `sessions.auth_strength` column.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { primaryClassLoginSessions, primaryStudentCredentials } from "../schema/primary.js";
import { sessions } from "../schema/users.js";
import { classrooms } from "../schema/classrooms.js";
import * as schema from "../schema/index.js";
import { sentinelProbes } from "../sentinels.js";

const REGISTRY = readFileSync(
  new URL("../../../domain/src/tenant-registry.ts", import.meta.url),
  "utf8",
);
const TAG = "0062_primary_student_login";

function cols(table: Parameters<typeof getTableConfig>[0]) {
  return Object.fromEntries(getTableConfig(table).columns.map((c) => [c.name, c]));
}

describe("primary_class_login_sessions", () => {
  const c = cols(primaryClassLoginSessions);

  it("is exported from the schema barrel", () => {
    expect(schema.primaryClassLoginSessions).toBe(primaryClassLoginSessions);
  });

  it("stores a code hash and no plain code", () => {
    expect(Object.keys(c).sort()).toEqual(
      ["classroom_id", "closed_at", "code_hash", "created_at", "expires_at", "id", "school_id", "starts_at", "teacher_id"].sort(),
    );
    expect(c.code_hash!.notNull).toBe(true);
    expect(c.school_id!.notNull).toBe(true);
    expect(c.closed_at!.notNull).toBe(false);
  });

  it("allows one open session per class", () => {
    const idx = getTableConfig(primaryClassLoginSessions).indexes.find(
      (i) => i.config.name === "primary_class_login_sessions_open_class_idx",
    );
    expect(idx?.config.unique).toBe(true);
    expect(idx?.config.where).toBeDefined();
  });
});

describe("primary_student_credentials", () => {
  const c = cols(primaryStudentCredentials);

  it("is exported from the schema barrel", () => {
    expect(schema.primaryStudentCredentials).toBe(primaryStudentCredentials);
  });

  it("stores only hashes and lockout state", () => {
    expect(Object.keys(c).sort()).toEqual(
      ["card_token_hash", "created_at", "failed_count", "id", "locked_until", "picture_hash", "rotated_at", "school_id", "updated_at", "user_id"].sort(),
    );
    expect(c.failed_count!.notNull).toBe(true);
    expect(c.failed_count!.default).toBe(0);
    expect(c.picture_hash!.notNull).toBe(false);
    expect(c.card_token_hash!.notNull).toBe(false);
  });

  it("has one credential per user and a unique card token hash", () => {
    expect(c.user_id!.isUnique).toBe(true);
    expect(c.card_token_hash!.isUnique).toBe(true);
  });
});

describe("sessions.auth_strength", () => {
  it("is a nullable text column", () => {
    const col = cols(sessions).auth_strength!;
    expect(col.getSQLType()).toBe("text");
    expect(col.notNull).toBe(false);
  });
});

describe("migration 0062", () => {
  const file = readdirSync(new URL("../../drizzle/", import.meta.url)).find((f) => f.startsWith("0062_"));
  const sql = file ? readFileSync(new URL(`../../drizzle/${file}`, import.meta.url), "utf8") : "";

  it("is named primary_student_login", () => {
    expect(file).toBe(`${TAG}.sql`);
  });

  it("only creates the new tables and adds one nullable column", () => {
    const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    for (const s of statements) {
      expect(s).toMatch(/^(CREATE TABLE "primary_|CREATE (UNIQUE )?INDEX "primary_|ALTER TABLE "primary_[a-z_]+" ADD CONSTRAINT|ALTER TABLE "sessions" ADD COLUMN "auth_strength" text;)/);
    }
    expect(sql).not.toMatch(/DROP|NOT NULL DEFAULT.*sessions/i);
  });

  it("has a sentinel", () => {
    expect(sentinelProbes[TAG]).toBeDefined();
    expect(JSON.stringify(sentinelProbes[TAG])).toContain("primary_class_login_sessions");
    expect(JSON.stringify(sentinelProbes[TAG])).toContain("primary_student_credentials");
    expect(JSON.stringify(sentinelProbes[TAG])).toContain("sessions.auth_strength");
  });
});

describe("tenant classification", () => {
  it("classifies both tables FLAT", () => {
    expect(REGISTRY).toMatch(/register\(primaryClassLoginSessions, "FLAT"\)/);
    expect(REGISTRY).toMatch(/register\(primaryStudentCredentials, "FLAT"\)/);
  });
});

describe("migration 0063 (run 2a)", () => {
  const TAG63 = "0063_primary_student_login_settings";
  const file = readdirSync(new URL("../../drizzle/", import.meta.url)).find((f) => f.startsWith("0063_"));
  const sql = file ? readFileSync(new URL(`../../drizzle/${file}`, import.meta.url), "utf8") : "";

  it("adds classrooms.picture_password_enabled as boolean NOT NULL DEFAULT true", () => {
    const col = cols(classrooms).picture_password_enabled!;
    expect(col.getSQLType()).toBe("boolean");
    expect(col.notNull).toBe(true);
    expect(col.default).toBe(true);
  });

  it("makes open class codes unique", () => {
    const idx = getTableConfig(primaryClassLoginSessions).indexes.find(
      (i) => i.config.name === "primary_class_login_sessions_open_code_idx",
    );
    expect(idx?.config.unique).toBe(true);
    expect(idx?.config.where).toBeDefined();
  });

  it("is additive only and has a sentinel", () => {
    expect(file).toBe(`${TAG63}.sql`);
    expect(sql).not.toMatch(/DROP/i);
    expect(sql).toContain('ALTER TABLE "classrooms" ADD COLUMN "picture_password_enabled" boolean DEFAULT true NOT NULL');
    expect(sentinelProbes[TAG63]).toBeDefined();
  });
});
