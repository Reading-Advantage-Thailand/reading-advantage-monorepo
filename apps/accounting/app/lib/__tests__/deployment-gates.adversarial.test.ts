// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const grantsPath = new URL(
  "../../../scripts/accounting-runtime-grants.sql",
  import.meta.url,
);
const promotionScript = new URL(
  "../../../scripts/promote-accounting-candidate.sh",
  import.meta.url,
).pathname;
const trackedTables = [
  "ACCOUNTING_SUBMISSIONS",
  "ACCOUNTING_SUBMISSION_AUDIT_EVENTS",
];

interface ParsedSqlCommand {
  readonly sourceIndex: number;
  readonly tokens: readonly string[];
}

/** Converts an executable SQL fragment into normalized tokens. */
function sqlTokens(value: string): string[] {
  return Array.from(value.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g), (match) =>
    match[0].toUpperCase(),
  );
}

/** Reads SQL commands while ignoring comments and parsing executable string bodies. */
function parseSqlCommands(source: string, sourceOffset = 0): ParsedSqlCommand[] {
  const commands: ParsedSqlCommand[] = [];
  let statement = "";
  let statementIndex = sourceOffset;
  let index = 0;

  const addCommand = (value: string, commandIndex: number) => {
    const tokens = sqlTokens(value);
    if (tokens.length > 0) commands.push({ sourceIndex: commandIndex, tokens });
  };

  while (index < source.length) {
    const character = source[index] as string;
    const nextCharacter = source[index + 1];
    if (character === "-" && nextCharacter === "-") {
      const lineEnd = source.indexOf("\n", index + 2);
      index = lineEnd === -1 ? source.length : lineEnd + 1;
      statement += " ";
      continue;
    }
    if (character === "/" && nextCharacter === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      index = commentEnd === -1 ? source.length : commentEnd + 2;
      statement += " ";
      continue;
    }
    if (character === "'") {
      const literalIndex = sourceOffset + index;
      let literal = "";
      index += 1;
      while (index < source.length) {
        if (source[index] === "'" && source[index + 1] === "'") {
          literal += "'";
          index += 2;
          continue;
        }
        if (source[index] === "'") {
          index += 1;
          break;
        }
        literal += source[index];
        index += 1;
      }
      addCommand(literal, literalIndex);
      statement += " ";
      continue;
    }
    if (character === '"') {
      index += 1;
      while (index < source.length) {
        if (source[index] === '"' && source[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      statement += " ";
      continue;
    }
    if (character === "$") {
      const delimiter = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/u)?.[0];
      if (delimiter) {
        const bodyStart = index + delimiter.length;
        const bodyEnd = source.indexOf(delimiter, bodyStart);
        if (bodyEnd === -1) {
          index = source.length;
          statement += " ";
          continue;
        }
        commands.push(
          ...parseSqlCommands(
            source.slice(bodyStart, bodyEnd),
            sourceOffset + bodyStart,
          ),
        );
        index = bodyEnd + delimiter.length;
        statement += " ";
        continue;
      }
    }
    if (character === ";") {
      addCommand(statement, statementIndex);
      statement = "";
      statementIndex = sourceOffset + index + 1;
      index += 1;
      continue;
    }
    statement += character;
    index += 1;
  }
  addCommand(statement, statementIndex);
  return commands;
}

/** Runs the promotion script against a temporary acceptance note. */
function runPromotion(input: {
  readonly acceptanceNote: string;
  readonly candidateRevision: string;
}) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "accounting-promote-"));
  temporaryDirectories.push(temporaryDirectory);
  const notePath = join(temporaryDirectory, "acceptance-note.md");
  writeFileSync(notePath, input.acceptanceNote);
  return spawnSync("bash", [promotionScript], {
    encoding: "utf8",
    env: {
      ACCEPTANCE_NOTE: notePath,
      CANDIDATE_REVISION: input.candidateRevision,
      NODE_ENV: "test",
      PATH: process.env.PATH ?? "",
    },
  });
}

const temporaryDirectories: string[] = [];

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop() as string, {
      force: true,
      recursive: true,
    });
  }
});

describe("Accounting deployment gate adversarial checks", () => {
  it("parses grants so audit writes stay append-only and revokes precede grants", () => {
    const commands = parseSqlCommands(readFileSync(grantsPath, "utf8"));
    const directGrants = commands.filter(
      (command) => command.tokens[0] === "GRANT",
    );
    const tableGrants = directGrants.filter((command) =>
      trackedTables.some((table) => command.tokens.includes(table)),
    );

    expect(tableGrants).toHaveLength(2);
    expect(
      commands.some(
        (command) =>
          command.tokens[0] === "ALTER" && command.tokens[1] === "ROLE",
      ),
    ).toBe(false);

    const auditGrant = tableGrants.find((command) =>
      command.tokens.includes("ACCOUNTING_SUBMISSION_AUDIT_EVENTS"),
    );
    expect(auditGrant).toBeDefined();
    expect(auditGrant?.tokens).toEqual([
      "GRANT",
      "SELECT",
      "INSERT",
      "ON",
      "TABLE",
      "ACCOUNTING_SUBMISSION_AUDIT_EVENTS",
      "TO",
      "ACCOUNTING_RUNTIME",
    ]);
    expect(auditGrant?.tokens).not.toContain("UPDATE");
    expect(auditGrant?.tokens).not.toContain("DELETE");
    expect(auditGrant?.tokens).not.toContain("TRUNCATE");

    for (const grant of tableGrants) {
      expect(
        commands.some(
          (command) =>
            command.sourceIndex < grant.sourceIndex &&
            command.tokens[0] === "REVOKE" &&
            command.tokens.includes("ALL") &&
            command.tokens.some((token) => token === "TABLE" || token === "TABLES"),
        ),
      ).toBe(true);
    }
  });

  it.each([
    ["whitespace-only", " \t\r\n"],
    ["status substring", "status: passable\n"],
    ["wrong status casing", "Status: pass\n"],
    ["CRLF status", "status: pass\r\n"],
  ])("rejects a %s acceptance-note bypass before gcloud can run", (_name, note) => {
    const result = runPromotion({
      acceptanceNote: note,
      candidateRevision: "candidate-revision",
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Acceptance note must contain status: pass.");
  });

  it("rejects an empty candidate revision before gcloud can run", () => {
    const result = runPromotion({
      acceptanceNote: "status: pass\n",
      candidateRevision: "",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("CANDIDATE_REVISION is required");
  });
});
