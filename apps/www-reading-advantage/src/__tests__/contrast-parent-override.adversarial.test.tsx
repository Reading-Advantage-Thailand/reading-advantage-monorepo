/**
 * ADVERSARIAL (ADV-15): the contrast helper reads jsdom's computed
 * background-color, which pre-resolves var() from the :root token map and
 * ignores an ancestor's inline custom property override. A correctly-cased
 * parent override of --color-slate-900 does not change the layer the ratio
 * is computed from, so a component that fixes contrast through an inline
 * token override passes the contrast check with the wrong colour.
 * Route-to-Green: resolve var() from the element cascade (cascaded value +
 * effectiveCustomProperty) instead of trusting jsdom's pre-resolved computed
 * background-color.
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
    const layer = readBackgroundLayer(rendered.getByTestId("child"));
    expect(
      layer.color?.r,
      "jsdom pre-resolves var() from :root, so the override is lost and the ratio uses the wrong colour",
    ).toBe(255);
  });
});
