import type { ComponentProps } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ManagedService from "@/app/[locale]/(marketing)/services/managed-service/page";

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn(async (scope: string) => (key: string) =>
    `${scope}.${key}`,
  ),
}));

vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img">) => <img {...props} />,
}));

afterEach(cleanup);

describe("Managed Service overview layout", () => {
  it("uses the specified asymmetric desktop split", async () => {
    const rendered = render(await ManagedService());
    const grid = rendered.container.querySelector("#overview .grid");
    const columns = grid ? Array.from(grid.children) : [];

    expect(grid).toHaveClass("lg:grid-cols-12");
    expect(columns[0]).toHaveClass("lg:col-span-7");
    expect(columns[1]).toHaveClass("lg:col-span-5");
  });
});
