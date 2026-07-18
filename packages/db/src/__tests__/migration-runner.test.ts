import { describe, expect, it } from "vitest";
import { splitPostgresMigration } from "../migration-files.js";

describe("PostgreSQL migration statement splitting", () => {
  it("keeps breakpoint comments inside dollar-quoted blocks in one statement", () => {
    const migration = [
      "CREATE TABLE example (id integer);",
      "--> statement-breakpoint",
      "DO $$ BEGIN",
      "  IF true THEN",
      "    ALTER TABLE example ADD COLUMN value text;",
      "--> statement-breakpoint",
      "  END IF;",
      "--> statement-breakpoint",
      "END $$;",
      "--> statement-breakpoint",
      "CREATE INDEX example_value_idx ON example (value);",
    ].join("\n");

    expect(splitPostgresMigration(migration)).toEqual([
      "CREATE TABLE example (id integer);\n",
      [
        "\nDO $$ BEGIN",
        "  IF true THEN",
        "    ALTER TABLE example ADD COLUMN value text;",
        "--> statement-breakpoint",
        "  END IF;",
        "--> statement-breakpoint",
        "END $$;",
        "",
      ].join("\n"),
      "\nCREATE INDEX example_value_idx ON example (value);",
    ]);
  });

  it("does not interpret dollar markers inside strings or comments as procedural blocks", () => {
    const migration = [
      "SELECT '$$'; -- $$ is documentation, not a delimiter",
      "--> statement-breakpoint",
      "SELECT 1;",
    ].join("\n");

    expect(splitPostgresMigration(migration)).toHaveLength(2);
  });

  it("keeps breakpoints inside E strings with backslash-escaped quotes", () => {
    const migration = String.raw`SELECT E'escaped \' quote
--> statement-breakpoint
still inside the escape string';
--> statement-breakpoint
SELECT 1;`;

    const statements = splitPostgresMigration(migration);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("--> statement-breakpoint");
    expect(statements[1]).toContain("SELECT 1;");
  });

  it("keeps breakpoints inside nested block comments", () => {
    const migration = `/* outer comment
  /* nested comment
--> statement-breakpoint
  */
--> statement-breakpoint
*/
SELECT 1;
--> statement-breakpoint
SELECT 2;`;

    const statements = splitPostgresMigration(migration);
    expect(statements).toHaveLength(2);
    expect(statements[0]?.match(/--> statement-breakpoint/g)).toHaveLength(2);
    expect(statements[1]).toContain("SELECT 2;");
  });

  it("keeps breakpoints inside Unicode-tagged dollar quotes", () => {
    const migration = `DO $ทดสอบ_é2$
BEGIN
--> statement-breakpoint
  RAISE NOTICE 'still inside the body';
END
$ทดสอบ_é2$;
--> statement-breakpoint
SELECT 1;`;

    const statements = splitPostgresMigration(migration);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("--> statement-breakpoint");
    expect(statements[1]).toContain("SELECT 1;");
  });

  it.each(["foo", "ทดสอบ"])(
    "does not start a dollar quote after the identifier %s",
    (identifier) => {
      const migration = `SELECT ${identifier}$tag$;
--> statement-breakpoint
SELECT 1;`;

      const statements = splitPostgresMigration(migration);
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain(`${identifier}$tag$`);
      expect(statements[1]).toContain("SELECT 1;");
    },
  );

  it.each([
    ["punctuation", "SELECT ($tag$", "$tag$);"],
    ["whitespace", "SELECT $tag$", "$tag$;"],
  ])("starts a dollar quote after %s", (_boundary, prefix, suffix) => {
    const migration = `${prefix}
--> statement-breakpoint
still inside the body
${suffix}
--> statement-breakpoint
SELECT 1;`;

    const statements = splitPostgresMigration(migration);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("--> statement-breakpoint");
    expect(statements[1]).toContain("SELECT 1;");
  });
});
