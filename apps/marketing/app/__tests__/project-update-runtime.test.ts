import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const marketingRoot = resolve(import.meta.dirname, "../..");

describe("Marketing project update runtime contract", () => {
  it("grants and exercises only the required video-project UPDATE privilege", () => {
    const grants = readFileSync(
      resolve(marketingRoot, "scripts/marketing-runtime-grants.sql"),
      "utf8",
    );
    const probe = readFileSync(
      resolve(marketingRoot, "scripts/marketing-runtime-probe.sql"),
      "utf8",
    );

    expect(grants).toContain(
      "GRANT SELECT, INSERT, UPDATE ON TABLE video_projects TO marketing_runtime;",
    );
    expect(probe).toContain(
      "has_table_privilege(current_user, 'video_projects', 'SELECT,INSERT,UPDATE')",
    );
    expect(probe).toContain("UPDATE video_projects SET script = script");
  });
});
