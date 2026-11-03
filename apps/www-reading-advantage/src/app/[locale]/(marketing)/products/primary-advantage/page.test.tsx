import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import PrimaryAdvantage from "@/app/[locale]/(marketing)/products/primary-advantage/page";

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn((scope: string) =>
    Promise.resolve((key: string) => {
      if (key.endsWith(".image")) {
        return "/images/placeholder.png";
      }
      return `${scope}.${key}`;
    }),
  ),
}));

afterEach(() => {
  cleanup();
});

/** The ten containers of the page, in page order. */
const CONTAINER_IDS = [
  "pa-hero",
  "pa-section-1",
  "pa-section-2",
  "pa-section-3",
  "pa-section-4",
  "pa-section-5",
  "pa-section-6",
  "pa-section-7",
  "pa-section-8",
  "pa-closing",
] as const;

/** Test ids that only the old page used. */
const OLD_TEST_IDS = [
  "cefr-timeline",
  "reversed-split",
  "overlapping-section",
  "stat-card",
] as const;

async function renderPage(): Promise<void> {
  const element = await PrimaryAdvantage({
    params: Promise.resolve({ locale: "en" }),
  });
  render(element);
}

function findAll(testId: string): Element[] {
  return Array.from(document.querySelectorAll(`[data-testid="${testId}"]`));
}

describe("PrimaryAdvantage", () => {
  it("renders each of the 10 containers exactly once", async () => {
    await renderPage();
    const counts = Object.fromEntries(
      CONTAINER_IDS.map((id) => [id, findAll(id).length]),
    );
    expect(counts, "containers: 10, each with count 1").toEqual(
      Object.fromEntries(CONTAINER_IDS.map((id) => [id, 1])),
    );
  });

  it("renders the containers in page order: hero, sections 1 to 8, closing", async () => {
    await renderPage();
    const elements = CONTAINER_IDS.map((id) => findAll(id)[0]);
    expect(
      elements.every((el) => el !== undefined),
      "Every container must exist before the order check.",
    ).toBe(true);
    for (let i = 1; i < elements.length; i++) {
      const follows =
        elements[i - 1].compareDocumentPosition(elements[i]) &
        Node.DOCUMENT_POSITION_FOLLOWING;
      expect(
        follows,
        `${CONTAINER_IDS[i]} must follow ${CONTAINER_IDS[i - 1]}`,
      ).toBeTruthy();
    }
  });

  it("renders no test id of the old page", async () => {
    await renderPage();
    const found = OLD_TEST_IDS.filter((id) => findAll(id).length > 0);
    expect(found, "old data-testid values still on the page").toEqual([]);
  });
});
