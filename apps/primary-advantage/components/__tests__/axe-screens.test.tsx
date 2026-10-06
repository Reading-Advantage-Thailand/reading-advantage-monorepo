// @vitest-environment jsdom
/**
 * Accessibility gate (FR-7, spec acceptance "axe reports 0 serious violations on each screen").
 * Each screen renders through the real message tree and axe-core checks the DOM. jsdom has no
 * layout, so the color-contrast rule is off here; the browser sweep covers contrast.
 */
import "@testing-library/jest-dom/vitest";
import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { withMessages } from "./helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ muted: false, setMuted: vi.fn(), play: vi.fn() }) }));

import { TeacherPageHeader } from "@/components/teacher/teacher-shell";
import { ClassBookSlot } from "@/components/teacher/class-book-slot";
import { DueChip } from "@/components/teacher/due-chip";
import { LessonStepRail } from "@/components/lesson/lesson-step-rail";
import { SoundToggle } from "@/components/switchers/sound-toggle";
import { EmptyState, ErrorState } from "@reading-advantage/ui";

afterEach(cleanup);

/**
 * Runs axe on a rendered element and returns the serious and critical violations.
 * @param ui The element.
 * @returns The violations with impact serious or critical.
 */
async function seriousViolations(ui: ReactElement) {
  const { container } = render(withMessages(<main>{ui}</main>));
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    resultTypes: ["violations"],
  });
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(" | ")}`);
}

const screens: [string, ReactElement][] = [
  [
    "teacher page header with back link and actions",
    <TeacherPageHeader
      key="h"
      back={<a href="/teacher/my-classes">Back</a>}
      title="P3A"
      description="12 students"
      actions={<a href="/teacher/reports">Reports</a>}
    />,
  ],
  ["class book slot", <ClassBookSlot key="b" classroomId="c1" />],
  ["due chip", <DueChip key="d" dueDate={null} />],
  ["lesson step rail", <LessonStepRail key="r" steps={["Introduction", "First Reading", "Quiz"]} current={2} />],
  ["sound toggle", <SoundToggle key="s" />],
  ["empty state", <EmptyState key="e" title="Nothing yet" description="Come back later." action={<a href="/">Home</a>} />],
  ["error state", <ErrorState key="x" title="Load failed" description="Try again." action={<button type="button">Retry</button>} />],
];

describe("axe: 0 serious violations", () => {
  it.each(screens)("%s", async (_name, ui) => {
    expect(await seriousViolations(ui)).toEqual([]);
  });
});
