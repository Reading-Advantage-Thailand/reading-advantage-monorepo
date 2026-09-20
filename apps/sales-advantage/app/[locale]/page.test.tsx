import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../messages/en.json";
import HomePage from "./page";

const mocks = vi.hoisted(() => ({
  dashboard: vi.fn(),
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    sales: {
      dashboard: { useQuery: mocks.dashboard },
    },
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Creates a dashboard module fixture with the requested lesson progress.
 * @param completedLessons Number of completed lessons.
 * @param lessonCount Total number of lessons.
 * @returns A module response accepted by the dashboard page.
 */
function createModule(completedLessons: number, lessonCount: number) {
  return {
    id: "module-1",
    slug: "foundations",
    title: "Foundations",
    description: "Sales foundations",
    phase: "Foundations",
    lessonCount,
    completedLessons,
    progress: lessonCount === 0 ? 0 : (completedLessons / lessonCount) * 100,
    isLocked: false,
    prerequisiteModuleSlug: null,
  };
}

/**
 * Creates a locked dashboard module fixture.
 * @param overrides Field overrides applied to the base module.
 * @returns A locked module response accepted by the dashboard page.
 */
function createLockedModule(
  overrides: { prerequisiteModuleSlug?: string | null } = {},
) {
  return {
    ...createModule(0, 5),
    isLocked: true,
    ...overrides,
  };
}

/**
 * Renders the dashboard with English translations.
 * @returns The rendered dashboard utilities.
 */
function renderDashboard() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <HomePage />
    </NextIntlClientProvider>,
  );
}

describe("Sales dashboard progress summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows aggregate progress after a lesson is completed", () => {
    mocks.dashboard.mockReturnValue({
      data: [createModule(1, 5)],
      isLoading: false,
      error: null,
    });

    renderDashboard();

    expect(screen.getByText("1 of 5 lessons complete")).toBeTruthy();
    expect(
      screen.getByRole("progressbar", {
        name: "1 of 5 lessons complete",
      }),
    ).toBeTruthy();
    expect(screen.queryByText(enMessages.dashboard.noProgress)).toBeNull();
  });

  it("shows the empty summary before any lesson is completed", () => {
    mocks.dashboard.mockReturnValue({
      data: [createModule(0, 5)],
      isLoading: false,
      error: null,
    });

    renderDashboard();

    expect(screen.getByText(enMessages.dashboard.noProgress)).toBeTruthy();
  });

  it("renders a locked module as a focusable disabled card with a visible reason", () => {
    mocks.dashboard.mockReturnValue({
      data: [createLockedModule({ prerequisiteModuleSlug: "intro" })],
      isLoading: false,
      error: null,
    });

    renderDashboard();

    const lockedCard = screen.getByRole("button", { name: /Foundations/ });
    expect(lockedCard.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Complete intro first")).toBeTruthy();
  });

  it("shows the generic lock reason when no prerequisite module exists", () => {
    mocks.dashboard.mockReturnValue({
      data: [createLockedModule()],
      isLoading: false,
      error: null,
    });

    renderDashboard();

    const lockedCard = screen.getByRole("button", { name: /Foundations/ });
    expect(lockedCard.getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByText(
        enMessages.lesson.lockedModuleDescription,
      ),
    ).toBeTruthy();
  });
});
