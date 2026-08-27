import { act, cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../../../../messages/en.json";
import thMessages from "../../../../messages/th.json";
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

const moduleFixture = {
  id: "module-1",
  slug: "foundations",
  title: "Sales foundations",
  description: "Build sales foundations.",
  phase: "Foundations",
  lessons: [
    {
      id: "lesson-theory",
      title: "Theory lesson",
      type: "theory" as const,
      completed: false,
      isLocked: false,
      bestScore: null,
    },
    {
      id: "lesson-roleplay",
      title: "Roleplay lesson",
      type: "roleplay" as const,
      completed: false,
      isLocked: false,
      bestScore: null,
    },
    {
      id: "lesson-quiz",
      title: "Quiz lesson",
      type: "quiz" as const,
      completed: false,
      isLocked: false,
      bestScore: null,
    },
  ],
};

/**
 * Renders the module page with the selected translations and a resolved route parameter.
 * @param locale Supported page locale.
 * @param messages Messages for the selected locale.
 * @returns A promise that resolves after the page renders.
 */
async function renderModule(
  locale: "en" | "th",
  messages: typeof enMessages | typeof thMessages,
) {
  await act(async () => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Suspense fallback={<p>Loading module</p>}>
          <ModulePage params={Promise.resolve({ slug: moduleFixture.slug })} />
        </Suspense>
      </NextIntlClientProvider>,
    );
    await Promise.resolve();
  });
}

describe("Sales module lesson labels", () => {
  beforeEach(() => {
    mocks.moduleBySlug.mockReturnValue({
      data: moduleFixture,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders theory, roleplay, and quiz labels in Thai", async () => {
    await renderModule("th", thMessages);

    expect(await screen.findByText(thMessages.lesson.theory)).toBeTruthy();
    expect(screen.getByText(thMessages.lesson.roleplay)).toBeTruthy();
    expect(screen.getByText(thMessages.lesson.quiz)).toBeTruthy();
    expect(screen.queryByText("theory")).toBeNull();
    expect(screen.queryByText("roleplay")).toBeNull();
    expect(screen.queryByText("quiz")).toBeNull();
  });

  it("renders theory, roleplay, and quiz labels in English", async () => {
    await renderModule("en", enMessages);

    expect(await screen.findByText(enMessages.lesson.theory)).toBeTruthy();
    expect(screen.getByText(enMessages.lesson.roleplay)).toBeTruthy();
    expect(screen.getByText(enMessages.lesson.quiz)).toBeTruthy();
    expect(screen.queryByText("theory")).toBeNull();
    expect(screen.queryByText("roleplay")).toBeNull();
    expect(screen.queryByText("quiz")).toBeNull();
  });
});
