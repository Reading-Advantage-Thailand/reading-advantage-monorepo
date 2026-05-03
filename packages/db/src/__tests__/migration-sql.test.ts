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
});
