import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import StorytimeAdvantage from "@/app/[locale]/(marketing)/products/storytime-advantage/page";
import { CONTAINER_IDS } from "@/__tests__/fixtures/storytime-page-expected";

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve((key: string) => `${scope}.${key}`),
  ),
}));

afterEach(cleanup);

async function renderPage(): Promise<void> {
  render(await StorytimeAdvantage({ params: Promise.resolve({ locale: "en" }) }));
}

describe("StorytimeAdvantage page structure", () => {
  it("renders the seven required containers once and in order", async () => {
    await renderPage();
    const found = Array.from(document.querySelectorAll("[data-testid^='st-']"))
      .map((element) => element.getAttribute("data-testid"));
    expect(found).toEqual(CONTAINER_IDS);
    for (const id of CONTAINER_IDS) {
      expect(document.querySelectorAll(`[data-testid="${id}"]`)).toHaveLength(1);
    }
  });

  it("uses no games or demo container", async () => {
    await renderPage();
    expect(document.querySelector("[data-testid*='game'], [data-testid*='demo']")).toBeNull();
  });
});
