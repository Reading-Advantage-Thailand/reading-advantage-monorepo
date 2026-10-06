/**
 * Static checks for section 8 of docs/apk3d-cartridge.md, pure (no file system):
 *
 * - `scanKeys(source)`: every `t('...')` literal and every `.scope('...')` prefix in a source file
 *   (comments skipped).
 * - `missingKeys(catalog, scan, bases?)`: the `t()` keys that resolve under no combination of a
 *   base prefix (the game's catalog roots, since `context.i18n` is already scoped) and a scope
 *   prefix of the file.
 * - `literalTextAssignments(source)`: `textContent` / `innerText` / `innerHTML` assignments whose
 *   string or template literal contains words outside markup and `${}` expressions (view files
 *   must not).
 *
 * `tests/apk3d/i18n.test.ts` runs them over `src/games`, `src/host`, and `src/apk3d`.
 */
import type { Catalog } from '../contracts/i18n.js';
import { hasKey } from './catalog.js';

export interface KeyUse {
  key: string;
  line: number;
}

export interface KeyScan {
  /** Prefixes from `.scope('...')` calls, unique, in order of appearance. */
  scopes: string[];
  /** Keys from `t('...')` calls (a string literal first argument). */
  keys: KeyUse[];
}

const lineOf = (source: string, index: number) => source.slice(0, index).split('\n').length;

const SCOPE_CALL = /\.scope\(\s*(['"])([^'"\n]+)\1\s*\)/g;
/** `t('key'` with a word boundary before `t`: `t(`, `i18n.t(`, `(t(`; not `next(`. */
const T_CALL = /\bt\(\s*(['"])([^'"\n]+)\1/g;

// ---------------------------------------------------------------- literals

/** The end index (exclusive) of the quoted string that starts at `start` (a `'` or `"`). */
function readQuoted(source: string, start: number): number {
  const quote = source[start]!;
  let i = start + 1;
  while (i < source.length && source[i] !== quote && source[i] !== '\n') {
    if (source[i] === '\\') i++;
    i++;
  }
  return Math.min(i + 1, source.length);
}

/**
 * Reads the template literal that starts at `start` (a backtick). Returns its end (exclusive)
 * and its static text: the parts outside `${...}` plus the static text of nested templates.
 */
export function readTemplate(source: string, start: number): { end: number; staticText: string } {
  let text = '';
  let i = start + 1;
  while (i < source.length) {
    const c = source[i]!;
    if (c === '\\') {
      text += source[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (c === '`') return { end: i + 1, staticText: text };
    if (c === '$' && source[i + 1] === '{') {
      const inner = readExpression(source, i + 2);
      text += inner.staticText;
      i = inner.end;
      continue;
    }
    text += c;
    i++;
  }
  return { end: i, staticText: text };
}

/** Skips a `${ ... }` expression body from `start` (after the brace) to its closing brace. */
function readExpression(source: string, start: number): { end: number; staticText: string } {
  let depth = 1;
  let text = '';
  let i = start;
  while (i < source.length && depth > 0) {
    const c = source[i]!;
    if (c === "'" || c === '"') i = readQuoted(source, i);
    else if (c === '`') {
      const inner = readTemplate(source, i);
      text += ` ${inner.staticText} `;
      i = inner.end;
    } else {
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
  }
  return { end: i, staticText: text };
}

/**
 * The source with every line comment and block comment blanked (newlines kept, so line numbers
 * hold). String and template literals are skipped, so a `//` inside a string stays. Regular
 * expression literals are not parsed: a `//` inside one starts a comment (rare, harmless).
 */
export function stripComments(source: string): string {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i]!;
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end < 0 ? n : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    if (c === "'" || c === '"') {
      const end = readQuoted(source, i);
      out += source.slice(i, end);
      i = end;
      continue;
    }
    if (c === '`') {
      const { end } = readTemplate(source, i);
      out += source.slice(i, end);
      i = end;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// ---------------------------------------------------------------- keys

export function scanKeys(rawSource: string): KeyScan {
  const source = stripComments(rawSource);
  const scopes: string[] = [];
  for (const m of source.matchAll(SCOPE_CALL)) if (!scopes.includes(m[2]!)) scopes.push(m[2]!);
  const keys = [...source.matchAll(T_CALL)].map((m) => ({ key: m[2]!, line: lineOf(source, m.index) }));
  return { scopes, keys };
}

const joinKey = (...parts: string[]) => parts.filter(Boolean).join('.');

/**
 * Keys of `scan` that the catalog lacks under every `base + scope` prefix. `bases` are the
 * prefixes `context.i18n` may already carry (a game file: its catalog roots; the host: '').
 */
export function missingKeys(catalog: Catalog, scan: KeyScan, bases: readonly string[] = ['']): KeyUse[] {
  const scopes = ['', ...scan.scopes];
  return scan.keys.filter(
    ({ key }) => !bases.some((base) => scopes.some((scope) => hasKey(catalog, joinKey(base, scope, key)))),
  );
}

// ---------------------------------------------------------------- literal text in views

export interface LiteralTextAssignment {
  line: number;
  /** The words found, trimmed, for the failure message. */
  text: string;
}

const ASSIGNMENT = /\.(?:textContent|innerText|innerHTML)\s*\+?=\s*(?=['"`])/g;

/** The words of a literal's static text outside HTML tags and entities; empty when none. */
export function literalWords(staticText: string): string {
  return staticText
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[^\p{L}]+/gu, ' ')
    .trim();
}

export function literalTextAssignments(rawSource: string): LiteralTextAssignment[] {
  const source = stripComments(rawSource);
  const out: LiteralTextAssignment[] = [];
  for (const m of source.matchAll(ASSIGNMENT)) {
    const start = m.index + m[0].length;
    const literal =
      source[start] === '`'
        ? readTemplate(source, start).staticText
        : source.slice(start + 1, readQuoted(source, start) - 1);
    const text = literalWords(literal);
    if (/\p{L}{2,}/u.test(text)) out.push({ line: lineOf(source, m.index), text });
  }
  return out;
}
