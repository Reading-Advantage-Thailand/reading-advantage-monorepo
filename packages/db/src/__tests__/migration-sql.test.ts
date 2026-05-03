import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("migration SQL", () => {
  it("does not reference removed auth schema objects", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0002_quick_skreet.sql"),
      "utf8"
    );

    expect(sql).not.toContain("verification_tokens");
    expect(sql).not.toContain("provider_account_id");
    expect(sql).not.toContain('"provider"');
    expect(sql).toContain('"accounts_user_provider_unique"');
    expect(sql).toContain('"user_id","provider_id"');
  });
});
