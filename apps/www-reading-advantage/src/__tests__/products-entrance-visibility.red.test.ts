import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import B2BSolutions from "@/components/products/b2b-solutions";
import { declarationsForClass } from "./fixtures/real-css";

/*
 * Behavior tests for A-59: marketing content stays visible while entrance
 * motion plays. The cases apply the real stylesheet declarations to a probe or
 * render the real component and read computed values. No source module text and
 * no rendered class names are asserted.
 */
const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(join(APP_ROOT, "src/app/[locale]/globals.css"), "utf8");

/** Returns the declarations of the first rule matching a pattern. */
function declarationsOf(pattern: RegExp): string {
  const match = pattern.exec(css);
  return match ? match[1] : "";
}

/** Applies declarations to a probe and snapshots selected computed values. */
function computedValues(
  declarations: string,
  properties: readonly string[],
): Record<string, string> {
  const testid = `probe-${Math.random().toString(36).slice(2)}`;
  const style = document.createElement("style");
  style.textContent = `[data-testid="${testid}"] { ${declarations} }`;
  document.head.appendChild(style);
  const probe = document.createElement("div");
  probe.setAttribute("data-testid", testid);
  document.body.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  const result: Record<string, string> = {};
  for (const property of properties) {
    result[property] = computed.getPropertyValue(property);
  }
  document.body.removeChild(probe);
  document.head.removeChild(style);
  return result;
}

afterEach(() => cleanup());

describe("entrance animation visibility guards (A-59, computed behavior)", () => {
  it("forces full opacity and no animation under reduced motion", () => {
    const reduceBlocks = [
      ...css.matchAll(
        /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/g,
      ),
    ].map((match) => match[1]);
    const animateBlock = reduceBlocks.find((block) =>
      /\.animate-in\s*\{/.test(block),
    );
    const block = /\.animate-in\s*\{([^}]*)\}/.exec(animateBlock ?? "")?.[1] ?? "";
    const values = computedValues(block, [
      "animation",
      "opacity",
      "transform",
    ]);
    expect(values.animation).toBe("none");
    expect(values.opacity).toBe("1");
    expect(values.transform).toBe("none");
  });

  it("keeps entrance motion from hiding content at the default setting", () => {
    const block = declarationsOf(/\.animate-in\s*\{([^}]*)\}/);
    const values = computedValues(block, ["--tw-enter-opacity"]);
    expect(values["--tw-enter-opacity"].trim()).toBe("1");
  });

  it("renders the workbook image without a permanent blur or fade", async () => {
    render(await B2BSolutions());
    const image = screen.getByAltText("Blended learning approach");
    const declarations = Array.from(image.classList).map((token) => ({
      token,
      css: declarationsForClass(token),
    }));
    const blurred = declarations
      .filter(({ css }) => /blur\(/.test(css))
      .map(({ token }) => token);
    const faded = declarations
      .filter(({ css }) => /(?:^|;)\s*opacity:\s*0?\.\d+/.test(css))
      .map(({ token }) => token);
    expect(blurred, "workbook image must carry no blur utility").toEqual([]);
    expect(faded, "workbook image must carry no fade utility").toEqual([]);
  });
});
