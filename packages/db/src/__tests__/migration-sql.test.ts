import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("migration SQL", () => {
  it("0002 only adds constraints on columns that exist in the 0000 schema", () => {
    const sql0002 = readFileSync(
      join(process.cwd(), "drizzle/0002_quick_skreet.sql"),
      "utf8"
    );

    expect(sql0002).not.toContain("verification_tokens");
    expect(sql0002).not.toContain("provider_account_id");
    expect(sql0002).not.toContain('"provider"');
    expect(sql0002).not.toContain('"accounts"');
    expect(sql0002).toContain('"classroom_students_unique"');
    expect(sql0002).toContain('"student_assignments_unique"');
    expect(sql0002).toContain('"lesson_progress_user_lesson_unique"');
    expect(sql0002).toContain('"student_answers_unique"');
  });

  it("0003 adds the accounts_user_provider_unique constraint after creating provider_id column", () => {
    const sql0003 = readFileSync(
      join(process.cwd(), "drizzle/0003_slow_firebrand.sql"),
      "utf8"
    );

    expect(sql0003).toContain('"accounts_user_provider_unique"');
    expect(sql0003).toContain('ADD COLUMN "provider_id"');
  });

  it("0003 adds username columns (initially nullable, hardened in 0004)", () => {
    const sql0003 = readFileSync(
      join(process.cwd(), "drizzle/0003_slow_firebrand.sql"),
      "utf8"
    );

    expect(sql0003).toContain('ADD COLUMN "username"');
    expect(sql0003).toContain('ADD COLUMN "display_username"');
    expect(sql0003).toContain('"users_username_unique"');
    expect(sql0003).toContain('"users_display_username_unique"');
  });

  it("0004 backfills username/display_username and enforces NOT NULL", () => {
    const sql0004 = readFileSync(
      join(process.cwd(), "drizzle/0004_sturdy_forge.sql"),
      "utf8"
    );

    expect(sql0004).toContain('SET "username" = COALESCE');
    expect(sql0004).toContain('SET "display_username" = COALESCE');
    expect(sql0004).toContain('ALTER COLUMN "username" SET NOT NULL');
    expect(sql0004).toContain('ALTER COLUMN "display_username" SET NOT NULL');
  });

  it("0015 creates the four science M:N junction tables with composite PKs", () => {
    const sql0015 = readFileSync(
      join(process.cwd(), "drizzle/0015_science_junction_tables.sql"),
      "utf8"
    );

    expect(sql0015).toContain('CREATE TABLE IF NOT EXISTS "science_lesson_standards"');
    expect(sql0015).toContain('CREATE TABLE IF NOT EXISTS "science_unit_lessons"');
    expect(sql0015).toContain('CREATE TABLE IF NOT EXISTS "science_class_students"');
    expect(sql0015).toContain('CREATE TABLE IF NOT EXISTS "science_question_standards"');

    expect(sql0015).toContain('PRIMARY KEY ("lesson_id", "standard_id")');
    expect(sql0015).toContain('PRIMARY KEY ("unit_id", "lesson_id")');
    expect(sql0015).toContain('PRIMARY KEY ("class_id", "student_id")');
    expect(sql0015).toContain('PRIMARY KEY ("question_id", "standard_id")');

    expect(sql0015).toContain('REFERENCES "science_lessons"("id")');
    expect(sql0015).toContain('REFERENCES "science_standards"("id")');
    expect(sql0015).toContain('REFERENCES "science_curriculum_units"("id")');
    expect(sql0015).toContain('REFERENCES "science_classes"("id")');
    expect(sql0015).toContain('REFERENCES "users"("id")');
    expect(sql0015).toContain('REFERENCES "science_quiz_questions"("id")');

    // Every FK is cascade-on-delete (matches Prisma implicit-join behavior)
    const cascadeCount = (sql0015.match(/ON DELETE CASCADE/g) || []).length;
    expect(cascadeCount).toBe(8); // 4 tables × 2 FKs each
  });
});
