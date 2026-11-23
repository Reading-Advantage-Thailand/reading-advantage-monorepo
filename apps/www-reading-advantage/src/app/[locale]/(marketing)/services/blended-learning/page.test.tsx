import type { ComponentProps } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BlendedLearning from "@/app/[locale]/(marketing)/services/blended-learning/page";
import { computedForElement } from "@/__tests__/fixtures/real-css";

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn(async (scope: string) => (key: string) =>
    `${scope}.${key}`,
  ),
}));

vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img">) => <img {...props} />,
}));

afterEach(cleanup);

describe("Blended Learning overview layout", () => {
  it("uses the specified asymmetric desktop split", async () => {
    const rendered = render(await BlendedLearning());
    const grid = rendered.container.querySelector("#overview .grid");
    const columns = grid ? Array.from(grid.children) : [];

    expect(
      grid instanceof HTMLElement
        ? computedForElement(grid, ["grid-template-columns"])[
            "grid-template-columns"
          ]
        : "",
    ).toBe("repeat(12, minmax(0, 1fr))");
    expect(
      columns[0] instanceof HTMLElement
        ? computedForElement(columns[0], ["grid-column"])["grid-column"]
        : "",
    ).toBe("span 7 / span 7");
    expect(
      columns[1] instanceof HTMLElement
        ? computedForElement(columns[1], ["grid-column"])["grid-column"]
        : "",
    ).toBe("span 5 / span 5");
  });
});
