import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MigrationConfig, MigrationMeta } from "drizzle-orm/migrator";

const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

interface JournalEntry {
  readonly breakpoints: boolean;
  readonly tag: string;
  readonly when: number;
}

interface MigrationJournal {
  readonly entries: readonly JournalEntry[];
}

/**
 * Reports whether a character can continue an unquoted PostgreSQL identifier.
 * @param character The character immediately adjacent to a possible token boundary.
 * @returns Whether PostgreSQL can treat the character as part of an identifier.
 */
function isIdentifierContinuation(character: string | undefined): boolean {
  return character !== undefined && /[_\p{L}\p{M}\p{N}$]/u.test(character);
}

/**
 * Finds a PostgreSQL dollar-quote delimiter at the current source offset.
 * @param source The SQL source being scanned.
 * @param offset The current character offset.
 * @returns The full delimiter, or null when the offset is not a delimiter.
 */
function readDollarQuoteDelimiter(
  source: string,
  offset: number,
): string | null {
  if (source[offset] !== "$") return null;
  if (isIdentifierContinuation(source[offset - 1])) return null;
  const match = /^\$(?:[_\p{L}][_\p{L}\p{M}\p{N}]*)?\$/u.exec(
    source.slice(offset),
  );
  return match?.[0] ?? null;
}

/**
 * Reports whether a single quote starts PostgreSQL's E-prefixed escape-string syntax.
 * @param source The SQL source being scanned.
 * @param quoteOffset The single-quote offset.
 * @returns Whether backslashes escape the next character in this string.
 */
function isEscapeStringStart(source: string, quoteOffset: number): boolean {
  const prefixOffset = quoteOffset - 1;
  if (prefixOffset < 0 || !/[Ee]/.test(source[prefixOffset] ?? "")) {
    return false;
  }
  const precedingCharacter = source[prefixOffset - 1];
  return !isIdentifierContinuation(precedingCharacter);
}

/**
 * Advances past a quoted SQL string or identifier with doubled-character escapes.
 * @param source The SQL source being scanned.
 * @param offset The opening quote offset.
 * @param quote The quote character to consume.
 * @returns The first offset after the quoted value.
 */
function skipQuotedValue(
  source: string,
  offset: number,
  quote: "'" | '"',
): number {
  const backslashEscapes =
    quote === "'" && isEscapeStringStart(source, offset);
  let cursor = offset + 1;
  while (cursor < source.length) {
    if (backslashEscapes && source[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (source[cursor] !== quote) {
      cursor += 1;
      continue;
    }
    if (source[cursor + 1] === quote) {
      cursor += 2;
      continue;
    }
    return cursor + 1;
  }
  return source.length;
}

/**
 * Advances past a possibly nested PostgreSQL block comment.
 * @param source The SQL source being scanned.
 * @param offset The opening block-comment offset.
 * @returns The first offset after the complete nested comment.
 */
function skipBlockComment(source: string, offset: number): number {
  let cursor = offset + 2;
  let depth = 1;
  while (cursor < source.length && depth > 0) {
    if (source.startsWith("/*", cursor)) {
      depth += 1;
      cursor += 2;
      continue;
    }
    if (source.startsWith("*/", cursor)) {
      depth -= 1;
      cursor += 2;
      continue;
    }
    cursor += 1;
  }
  return cursor;
}

/**
 * Splits a PostgreSQL migration only at Drizzle breakpoint comments outside quoted values and dollar-quoted bodies.
 * @param source The exact checked-in migration SQL.
 * @returns SQL statements suitable for sequential transactional execution.
 */
export function splitPostgresMigration(source: string): string[] {
  const statements: string[] = [];
  let statementStart = 0;
  let cursor = 0;

  while (cursor < source.length) {
    if (source.startsWith(STATEMENT_BREAKPOINT, cursor)) {
      statements.push(source.slice(statementStart, cursor));
      cursor += STATEMENT_BREAKPOINT.length;
      statementStart = cursor;
      continue;
    }

    const character = source[cursor];
    if (character === "'" || character === '"') {
      cursor = skipQuotedValue(source, cursor, character);
      continue;
    }

    if (source.startsWith("--", cursor)) {
      const newline = source.indexOf("\n", cursor + 2);
      cursor = newline === -1 ? source.length : newline + 1;
      continue;
    }

    if (source.startsWith("/*", cursor)) {
      cursor = skipBlockComment(source, cursor);
      continue;
    }

    const dollarQuote = readDollarQuoteDelimiter(source, cursor);
    if (dollarQuote) {
      const close = source.indexOf(dollarQuote, cursor + dollarQuote.length);
      cursor = close === -1 ? source.length : close + dollarQuote.length;
      continue;
    }

    cursor += 1;
  }

  statements.push(source.slice(statementStart));
  return statements;
}

/**
 * Reads the Drizzle migration journal while preserving each checked-in file's exact ledger hash.
 * @param config The migration folder and optional ledger configuration.
 * @returns Ordered migration metadata with PostgreSQL-aware statement boundaries.
 */
export function readPostgresMigrationFiles(
  config: MigrationConfig,
): MigrationMeta[] {
  const journalPath = join(config.migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(
    readFileSync(journalPath, "utf8"),
  ) as MigrationJournal;

  return journal.entries.map((entry) => {
    const migrationPath = join(config.migrationsFolder, `${entry.tag}.sql`);
    const source = readFileSync(migrationPath, "utf8");
    return {
      bps: entry.breakpoints,
      folderMillis: entry.when,
      hash: createHash("sha256").update(source).digest("hex"),
      sql: splitPostgresMigration(source),
    };
  });
}
