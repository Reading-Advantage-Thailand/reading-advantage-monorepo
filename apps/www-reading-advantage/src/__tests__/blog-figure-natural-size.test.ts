import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * Behavior tests for the blog figure picture rules. The shipped stylesheet is
 * a real file. Each case applies one declaration block to a probe element and
 * reads the computed style a browser would produce. No source module text and
 * no rendered class names are asserted.
 */
const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(join(APP_ROOT, "src/app/[locale]/globals.css"), "utf8");

/**
 * Applies one real stylesheet rule to a probe and snapshots computed values.
 * @param selector The stylesheet selector whose declarations are applied.
 * @param properties The computed properties to read back.
 * @returns A map of property name to computed value.
 */
function computedValues(
  selector: string,
  properties: readonly string[],
): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const declarations =
    start < 0
      ? ""
      : css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const testid = `probe-${Math.random().toString(36).slice(2)}`;
  const style = document.createElement("style");
  style.textContent = `[data-testid="${testid}"] { ${declarations} }`;
  document.head.appendChild(style);
  const probe = document.createElement("img");
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

describe("blog figure natural size (computed behavior)", () => {
  it("renders a single figure picture with sizing declarations", () => {
    const values = computedValues("& .blog-figure img", [
      "display",
      "width",
      "max-width",
    ]);
    expect(values.display).toBe("block");
    expect(values.width).toBe("auto");
    expect(values["max-width"]).toBe("100%");
  });

  it("keeps the natural width and shrinks to the column", () => {
    const values = computedValues("& .blog-figure img", [
      "width",
      "max-width",
      "height",
    ]);
    expect(values.width).toBe("auto");
    expect(values["max-width"]).toBe("100%");
    expect(values.height).toBe("auto");
  });

  it("centers the picture", () => {
    const values = computedValues("& .blog-figure img", [
      "display",
      "margin-inline",
    ]);
    expect(values.display).toBe("block");
    expect(values["margin-inline"]).toBe("auto");
  });

  it("leaves the gallery grid picture on a cropped four-by-three box", () => {
    const values = computedValues("& .blog-gallery-grid img", [
      "height",
      "aspect-ratio",
      "object-fit",
    ]);
    expect(values.height).toBe("100%");
    expect(values["aspect-ratio"]).toBe("4 / 3");
    expect(values["object-fit"]).toBe("cover");
  });
});
