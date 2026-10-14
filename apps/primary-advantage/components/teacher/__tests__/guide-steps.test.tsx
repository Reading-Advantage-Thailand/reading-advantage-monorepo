// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { testMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children?: ReactNode; href: string }) => <a href={href}>{children}</a>,
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/actions/class-books", () => ({ markStepDoneAction: vi.fn() }));

import { GuideOverlay } from "../guide-overlay";
import { GuideSteps } from "../guide-steps";

const step = (n: number, period: number) => ({ step: n, title: `Step ${n}`, period, teacherActions: [], teacherLanguage: [], studentActions: [], watchFor: [], scriptMd: null });
const guide = [{ period: 1, steps: [step(1, 1), step(2, 1)] }, { period: 3, steps: [step(9, 3), step(10, 3)] }];
const en = testMessages.en.TeacherUi.classBook;
const t = createTranslator({ locale: "en", messages: testMessages.en, namespace: "TeacherUi.classBook" }) as unknown as ComponentProps<typeof GuideSteps>["t"];
const PROJECTOR = "/teacher/class-roster/c/books/b/lessons/2/projector#projector-games";

afterEach(cleanup);

describe("GuideSteps games link", () => {
  it("links steps 9 and 10 to the projector games and gives step 1 no games link", () => {
    render(<GuideSteps guide={guide} t={t} projectorHref={PROJECTOR} />);
    const links = screen.getAllByRole("link", { name: en.guide.games });
    expect(links.map((a) => a.getAttribute("href"))).toEqual([PROJECTOR, PROJECTOR]);
  });

  it("keeps the game challenges for every game step without a projector link", () => {
    render(<GuideSteps guide={guide} t={t} />);
    const links = screen.getAllByRole("link", { name: en.guide.games });
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/teacher/game-challenges", "/teacher/game-challenges"]);
  });
});

describe("GuideOverlay games link", () => {
  const overlay = (steps: ReturnType<typeof step>[]) => (
    <NextIntlClientProvider locale="en" messages={testMessages.en}>
      <GuideOverlay classBookId="b" lessonNumber={2} steps={steps} stepsDone={[1]} projectorHref={PROJECTOR} />
    </NextIntlClientProvider>
  );

  it("links step 9 to the projector games", () => {
    render(overlay([step(1, 1), step(9, 3)]));
    // The overlay opens on the first step the class has not done: step 9.
    expect(screen.getByRole("link", { name: en.guide.games })).toHaveAttribute("href", PROJECTOR);
  });

  it("gives step 1 no games link", () => {
    render(<NextIntlClientProvider locale="en" messages={testMessages.en}><GuideOverlay classBookId="b" lessonNumber={2} steps={[step(1, 1), step(2, 1)]} stepsDone={[]} projectorHref={PROJECTOR} /></NextIntlClientProvider>);
    expect(screen.queryByRole("link", { name: en.guide.games })).toBeNull();
  });
});
