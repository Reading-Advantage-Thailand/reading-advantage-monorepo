/**
 * A small brace-aware CSS reader for the look tests (Phase 2, test strategy P2.2).
 *
 * It reads comments, strings, `url()` values, nested `@media` blocks, and `@keyframes` blocks, so
 * a test can ask for the last `height` of one selector inside one media block without a line
 * grep (anti-pattern A1 and A7: a word in a comment or in a string is not a rule). It reads no
 * file by itself. The tests call it on a string, so a self-test can run on a broken copy.
 */

/** One declaration of a rule. */
export interface CssDeclaration {
  /** The lower-case property name. */
  property: string;
  /** The value text, trimmed, without `!important`. */
  value: string;
  /** Whether the declaration ends with `!important`. */
  important: boolean;
}

/** One rule of a style sheet, with the media conditions that enclose it. */
export interface CssRule {
  /** The selector list text, or `@keyframes <name>` or `@font-face` for those blocks. */
  selector: string;
  /** The declarations of the rule, in source order. */
  declarations: CssDeclaration[];
  /** The enclosing `@media` and `@supports` conditions, outermost first, normalized. */
  media: string[];
  /** Whether the rule is a `@keyframes` block or lives inside one. */
  keyframes: boolean;
}

/**
 * Removes the comments of a style sheet and keeps the string contents.
 * @param css The style sheet text.
 * @returns The text without comments.
 */
export function stripCssComments(css: string): string {
  let out = "";
  let index = 0;
  let quote: string | null = null;
  while (index < css.length) {
    const char = css[index]!;
    if (quote) {
      out += char;
      if (char === "\\") {
        out += css[index + 1] ?? "";
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      out += char;
      index += 1;
      continue;
    }
    if (char === "/" && css[index + 1] === "*") {
      const end = css.indexOf("*/", index + 2);
      index = end === -1 ? css.length : end + 2;
      out += " ";
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

/**
 * Normalizes a media condition: lower case, single spaces, one space after each colon.
 * @param condition The text after `@media`.
 * @returns The normalized condition.
 */
export function normalizeMedia(condition: string): string {
  return condition
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*/g, ": ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
}

/**
 * Finds the end of one prelude or declaration: the first of the stop characters at depth 0,
 * outside strings and parentheses.
 * @param text The text.
 * @param from The start index.
 * @param stops The stop characters.
 * @returns The index of the stop character, or -1.
 */
function findStop(text: string, from: number, stops: string): number {
  let quote: string | null = null;
  let paren = 0;
  for (let index = from; index < text.length; index++) {
    const char = text[index]!;
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(") paren += 1;
    else if (char === ")") paren = Math.max(0, paren - 1);
    else if (paren === 0 && stops.includes(char)) return index;
  }
  return -1;
}

/**
 * Finds the brace that closes the block that opens at `open`.
 * @param text The text.
 * @param open The index of the opening brace.
 * @returns The index of the matching closing brace, or the text length.
 */
function matchBrace(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = open; index < text.length; index++) {
    const char = text[index]!;
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return text.length;
}

/**
 * Reads the declarations of one block body. A nested block (CSS nesting) is skipped.
 * @param body The text between the braces.
 * @returns The declarations.
 */
function readDeclarations(body: string): CssDeclaration[] {
  const result: CssDeclaration[] = [];
  let index = 0;
  while (index < body.length) {
    const brace = findStop(body, index, "{;");
    if (brace === -1) {
      pushDeclaration(result, body.slice(index));
      break;
    }
    if (body[brace] === "{") {
      index = matchBrace(body, brace) + 1;
      continue;
    }
    pushDeclaration(result, body.slice(index, brace));
    index = brace + 1;
  }
  return result;
}

/**
 * Adds one `property: value` text to a declaration list.
 * @param target The list.
 * @param text The declaration text.
 */
function pushDeclaration(target: CssDeclaration[], text: string): void {
  const colon = text.indexOf(":");
  if (colon === -1) return;
  const property = text.slice(0, colon).trim().toLowerCase();
  if (!property) return;
  let value = text.slice(colon + 1).trim();
  const important = /!\s*important\s*$/i.test(value);
  if (important) value = value.replace(/!\s*important\s*$/i, "").trim();
  target.push({ property, value, important });
}

/**
 * Parses a style sheet into a flat rule list.
 * @param css The style sheet text.
 * @returns The rules in source order. An `@media` block adds its inner rules with the media
 *   condition; a `@keyframes` block adds one rule for the block and one for each step.
 */
export function parseCss(css: string): CssRule[] {
  const text = stripCssComments(css);
  const rules: CssRule[] = [];
  parseBlock(text, 0, text.length, [], false, rules);
  return rules;
}

/**
 * Parses the rules between two indexes.
 * @param text The comment-free text.
 * @param from The start index.
 * @param to The end index.
 * @param media The enclosing media conditions.
 * @param keyframes Whether the block lives inside a `@keyframes` block.
 * @param out The rule list.
 */
function parseBlock(
  text: string,
  from: number,
  to: number,
  media: string[],
  keyframes: boolean,
  out: CssRule[],
): void {
  let index = from;
  while (index < to) {
    while (index < to && /\s/.test(text[index]!)) index += 1;
    if (index >= to) return;
    const stop = findStop(text, index, "{;");
    if (stop === -1 || stop >= to) return;
    const prelude = text.slice(index, stop).trim();
    if (text[stop] === ";") {
      index = stop + 1;
      continue;
    }
    const close = Math.min(matchBrace(text, stop), to);
    const inner = [stop + 1, close] as const;
    const lower = prelude.toLowerCase();
    if (/^@(media|supports|container|layer)\b/.test(lower)) {
      const condition = normalizeMedia(prelude.replace(/^@\w+/, ""));
      const next = /^@layer\b/.test(lower) ? media : [...media, condition];
      parseBlock(text, inner[0], inner[1], next, keyframes, out);
    } else if (/^@(-\w+-)?keyframes\b/.test(lower)) {
      out.push({ selector: prelude, declarations: [], media: [...media], keyframes: true });
      parseBlock(text, inner[0], inner[1], media, true, out);
    } else {
      out.push({
        selector: prelude,
        declarations: readDeclarations(text.slice(inner[0], inner[1])),
        media: [...media],
        keyframes,
      });
    }
    index = close + 1;
  }
}

/**
 * Splits a selector list on its top-level commas.
 * @param selector The selector list text.
 * @returns The selectors, trimmed and with single spaces.
 */
export function selectorParts(selector: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | null = null;
  for (let index = 0; index < selector.length; index++) {
    const char = selector[index]!;
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    // A comma inside brackets or parentheses is not a list separator.
    if (char === '"' || char === "'") quote = char;
    else if (char === "[" || char === "(") depth += 1;
    else if (char === "]" || char === ")") depth = Math.max(0, depth - 1);
    else if (char === "," && depth === 0) {
      parts.push(selector.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(selector.slice(start));
  return parts.map((part) => part.trim().replace(/\s+/g, " ")).filter(Boolean);
}

/**
 * Returns the last compound of one selector: the part after the last combinator.
 * @param selector One selector (no comma).
 * @returns The last compound selector, with single quotes turned into double quotes.
 */
export function lastCompound(selector: string): string {
  let depth = 0;
  let last = 0;
  for (let index = 0; index < selector.length; index++) {
    const char = selector[index]!;
    if (char === "[" || char === "(") depth += 1;
    else if (char === "]" || char === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (char === " " || char === ">" || char === "+" || char === "~")) last = index + 1;
  }
  return selector.slice(last).trim().replace(/'/g, '"');
}

/**
 * Reports whether one selector list holds a selector whose last compound is one of the targets.
 * @param selector The selector list text.
 * @param targets The accepted last compounds, double-quoted.
 * @returns Whether a part matches.
 */
export function selectorEndsWith(selector: string, targets: readonly string[]): boolean {
  return selectorParts(selector).some((part) => targets.includes(lastCompound(part)));
}

/**
 * Finds the last declaration of one property among the rules that match.
 * @param rules The parsed rules.
 * @param match The rule filter.
 * @param property The lower-case property name.
 * @returns The last declaration in source order, or `undefined`.
 */
export function lastDeclaration(
  rules: readonly CssRule[],
  match: (rule: CssRule) => boolean,
  property: string,
): CssDeclaration | undefined {
  let found: CssDeclaration | undefined;
  for (const rule of rules) {
    if (rule.keyframes || !match(rule)) continue;
    for (const declaration of rule.declarations) {
      if (declaration.property === property) found = declaration;
    }
  }
  return found;
}

/**
 * Reads a length as pixels.
 * @param value The value text, for example `48px` or `3rem`.
 * @returns The pixel count (1 rem is 16 px), or `null` for any other value.
 */
export function lengthPx(value: string): number | null {
  const match = /^(-?\d*\.?\d+)(px|rem)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * (match[2] === "rem" ? 16 : 1);
}
