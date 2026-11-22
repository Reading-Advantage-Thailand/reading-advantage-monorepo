import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

/*
 * Shared helper for look tests. It compiles the app's real globals.css with the
 * app's own Tailwind toolchain and resolves utility classes to the CSS rules the
 * app ships. No hand-written class map and no TypeScript source text is used.
 */

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CSS_PATH = join(APP_ROOT, "src/app/[locale]/globals.css");

const result = await postcss([tailwindcss({ base: APP_ROOT })])
  .process(readFileSync(CSS_PATH, "utf8"), { from: CSS_PATH });
const compiled = result.css;

/** The real compiled stylesheet, available for direct declaration reads. */
export const compiledCss: string = compiled;

const parsed = postcss.parse(compiled);

/** Escapes a class token for exact selector matching in the compiled CSS. */
function escapeClass(className: string): string {
  return className.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

/**
 * Returns the declarations the real stylesheet ships for one utility class.
 * @param className A class token as it appears on a rendered element.
 * @returns The CSS declarations, including those inside media or support blocks.
 */
export function declarationsForClass(className: string): string {
  const selector = `.${escapeClass(className)}`;
  const found: string[] = [];
  parsed.walkRules((rule) => {
    if (!rule.selectors.some((candidate) => candidate.trim() === selector)) return;
    rule.walkDecls((declaration) => {
      const text = declaration.toString().trim();
      if (!found.includes(text)) found.push(text);
    });
  });
  return found.join(";");
}

/**
 * Resolves the declarations of rendered classes and reads them through jsdom.
 * @param classNames The class tokens of a rendered element.
 * @param properties The CSS properties to read.
 * @param tag The probe element tag, defaulting to a div.
 * @returns A map of property name to computed value.
 */
export function computedFromClasses(
  classNames: Iterable<string>,
  properties: readonly string[],
  tag = "div",
): Record<string, string> {
  const declarations = Array.from(classNames)
    .map(declarationsForClass)
    .filter(Boolean)
    .join(";");
  const testid = `real-css-${Math.random().toString(36).slice(2)}`;
  const style = document.createElement("style");
  style.setAttribute("data-real-css", "1");
  style.textContent = `[data-testid="${testid}"] { ${declarations} }`;
  document.head.appendChild(style);
  const probe = document.createElement(tag);
  probe.setAttribute("data-testid", testid);
  document.body.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  const result: Record<string, string> = {};
  for (const property of properties) {
    result[property] = computed.getPropertyValue(property);
  }
  document.body.removeChild(probe);
  style.remove();
  return result;
}

/**
 * Reads the real CSS behavior of a rendered element's own classes.
 * @param element A rendered element.
 * @param properties The CSS properties to read.
 * @param baseOnly When true, skips responsive and other variant classes.
 * @returns A map of property name to computed value.
 */
export function computedForElement(
  element: Element,
  properties: readonly string[],
  baseOnly = false,
): Record<string, string> {
  const tokens = Array.from(element.classList).filter(
    (token) => !baseOnly || !token.includes(":"),
  );
  return computedFromClasses(tokens, properties);
}
