import {
  act,
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../../../messages/en.json";
import ModulePage from "./page";

const mocks = vi.hoisted(() => ({
  moduleBySlug: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    sales: {
      moduleBySlug: { useQuery: mocks.moduleBySlug },
    },
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

/**
 * Creates a lesson fixture accepted by the module page.
 * @param overrides Field overrides applied to the base lesson.
 * @returns A lesson response accepted by the module page.
 */
function createLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: "lesson-1",
    title: "Discovery Basics",
    type: "theory",
    completed: false,
    isLocked: false,
    bestScore: null,
    ...overrides,
  };
}

/**
 * Creates a module fixture holding one lesson.
 * @param lessons Lessons rendered by the module page.
 * @returns A module response accepted by the module page.
 */
function createModule(lessons: Array<ReturnType<typeof createLesson>>) {
  return {
    slug: "foundations",
    title: "Foundations",
    description: "Sales foundations",
    phase: "Foundations",
    lessons,
  };
}

/**
 * Renders the module page with English translations.
 * The page suspends on its route params, so the render must be awaited.
 */
async function renderModulePage() {
  await act(async () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ModulePage params={Promise.resolve({ slug: "foundations" })} />
      </NextIntlClientProvider>,
    );
  });
}

describe("Module lesson list accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("links an unlocked lesson to its lesson page", async () => {
    mocks.moduleBySlug.mockReturnValue({
      data: createModule([createLesson()]),
      isLoading: false,
      error: null,
    });

    await renderModulePage();

    expect(screen.getByText("1. Discovery Basics")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Discovery Basics/ }),
    ).toHaveAttribute("href", "/lesson/lesson-1");
  });

  it("renders a locked lesson as a focusable disabled card with a visible reason", async () => {
    mocks.moduleBySlug.mockReturnValue({
      data: createModule([createLesson({ isLocked: true })]),
      isLoading: false,
      error: null,
    });

    await renderModulePage();

    const lockedCard = screen.getByRole("button", {
      name: /Discovery Basics/,
    });
    expect(lockedCard.getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByText(enMessages.lesson.lockedLessonDescription),
    ).toBeTruthy();
  });
});
