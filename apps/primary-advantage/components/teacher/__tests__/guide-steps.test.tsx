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
import { scriptWithoutPictures } from "../guide-script";
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

// The start of the Workbooks step 1 script (Teacher guide/step-1.md), with its two picture lines.
const SCRIPT = [
  "# Step 1: Introduction (Interest & Orientation)",
  "",
  "---",
  "",
  "## What teachers project on screen:",
  "",
  "![App screenshot showing the introduction screen with title, image, and star rating](app step 1.png)",
  "",
  "## What students see in their workbook:",
  "",
  "![Workbook page showing Before You Read section with star rating](WB 1 - before you read.png)",
  "",
  "---",
  "",
  "## 1. What the teacher says",
  "",
  "> “Everyone, look at the screen.”",
  "",
  "The teacher reads the title **slowly and clearly**, once.",
  "",
  "- Point to the stars.",
].join("\n");

describe("GuideSteps full script (PR defect 2026-10-21: raw Markdown)", () => {
  it("removes the pictures, their headings, and the double rule", () => {
    const out = scriptWithoutPictures(SCRIPT);
    expect(out).not.toMatch(/!\[|\.png|What teachers project|What students see/);
    expect(out.match(/^---$/gm)).toHaveLength(1);
    expect(out).toContain("## 1. What the teacher says");
  });

  it("renders the script as headings, a quote, bold text, and a list", () => {
    render(<GuideSteps guide={[{ period: 1, steps: [{ ...step(1, 1), scriptMd: SCRIPT }] }]} t={t} />);
    const script = document.querySelector("[data-guide-script]")!;
    expect(script.querySelector("h5")).toHaveTextContent("Step 1: Introduction (Interest & Orientation)");
    expect(script.querySelector("h6")).toHaveTextContent("1. What the teacher says");
    expect(script.querySelector("blockquote")).toHaveTextContent("“Everyone, look at the screen.”");
    expect(script.querySelector("strong")).toHaveTextContent("slowly and clearly");
    expect(script.querySelector("li")).toHaveTextContent("Point to the stars.");
    expect(script.querySelector("img")).toBeNull();
    expect(script.textContent).not.toMatch(/##|\*\*|\[App screenshot/);
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
