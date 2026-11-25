/**
 * ADVERSARIAL probes for the contrast helper. ADV-15 (closed): the helper
 * fails closed and throws when an element or ancestor declares a --color-*
 * token inline, because jsdom pre-resolves var() from :root and the helper
 * cannot know which colour a browser would paint. ADV-17 (open): the guard
 * scans only the compiled stylesheet at module load, so a colour-token rule
 * injected through a <style> element at test time is not seen and the helper
 * computes from :root instead of throwing. Route-to-Green: scan the document
 * stylesheets present at read time, or hook injected styles.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readBackgroundLayer } from "./fixtures/contrast";

afterEach(cleanup);

describe("contrast helper custom property cascade", () => {
  it("ignores a case-variant inline override (custom properties are case-sensitive)", () => {
    const rendered = render(
      <div>
        <div className="bg-slate-900" data-testid="child" />
      </div>,
    );
    rendered.container
      .querySelector("div")!
      .setAttribute("style", "--Color-slate-900: #ff0000");
    const layer = readBackgroundLayer(rendered.getByTestId("child"));
    expect(layer.color, "the layer must paint").not.toBeNull();
    expect(
      layer.color!.r,
      "compiled slate-900 (#0f172a) wins, not the case-variant red",
    ).toBeLessThan(50);
  });

  it("uses the var() fallback when the property is unset", () => {
    const rendered = render(
      <div>
        <div
          data-testid="child"
          style={{ backgroundColor: "var(--zz-missing-prop, #123456)" }}
        />
      </div>,
    );
    const layer = readBackgroundLayer(rendered.getByTestId("child"));
    expect(layer.color, "fallback resolves, no throw").not.toBeNull();
    expect(layer.color!.r).toBe(0x12);
    expect(layer.color!.g).toBe(0x34);
    expect(layer.color!.b).toBe(0x56);
  });

  it("honours a correctly-cased inline override on the parent (ADV-15)", () => {
    const rendered = render(
      <div>
        <div className="bg-slate-900" data-testid="child" />
      </div>,
    );
    rendered.container
      .querySelector("div")!
      .setAttribute("style", "--color-slate-900: #ff0000");
    expect(() => readBackgroundLayer(rendered.getByTestId("child"))).toThrow(
      /--color-slate-900/,
    );
  });

  it("throws when an injected class rule declares a colour token (ADV-17)", () => {
    const style = document.createElement("style");
    style.textContent = ".adv-token-override { --color-slate-900: #ff0000; }";
    document.head.appendChild(style);
    try {
      const rendered = render(
        <div className="adv-token-override">
          <div className="bg-slate-900" data-testid="child" />
        </div>,
      );
      expect(() => readBackgroundLayer(rendered.getByTestId("child"))).toThrow(
        /--color-slate-900/,
      );
    } finally {
      style.remove();
    }
  });
});
