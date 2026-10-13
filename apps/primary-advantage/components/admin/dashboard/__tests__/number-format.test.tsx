// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ActivityByDay } from "../activity-by-day";
import { AdoptionPanel } from "../adoption-panel";
import { KeyNumbers } from "../key-numbers";

const kpis = {
  activeStudents: { active: 1234, total: 2000, percent: 62 },
  activeTeachers: { active: 7, total: 9 },
  classesWithActivity: { active: 8, total: 10 },
  articlesOpened: 4321,
  xpEarned: 56789,
  newStudents: 15,
};
const days = [{ day: "2026-09-01", activeStudents: 3 }];

afterEach(() => cleanup());

describe("admin dashboard number format", () => {
  it("writes the key numbers with the grouping of the page locale", () => {
    renderWithMessages(<KeyNumbers kpis={kpis} />, { locale: "vi" });
    expect(screen.getByText("1.234")).toBeInTheDocument();
    expect(screen.getByText("4.321")).toBeInTheDocument();
    expect(screen.getByText("56.789")).toBeInTheDocument();
  });

  it("keeps the comma grouping for English", () => {
    renderWithMessages(<KeyNumbers kpis={kpis} />, { locale: "en" });
    expect(screen.getByText("56,789")).toBeInTheDocument();
  });

  it("writes the average XP of a row with the page locale", () => {
    renderWithMessages(
      <AdoptionPanel cefr={[{ key: "A1", students: 10, active: 5, percent: 50, averageXp: 12345 }]} grade={[]} by="cefr" range={30} schoolEmpty={false} />,
      { locale: "vi" },
    );
    expect(screen.getByText("12.345")).toBeInTheDocument();
  });

  it("writes the event total with the page locale", () => {
    renderWithMessages(
      <ActivityByDay activity={{ days, totalEvents: 98765, peakDay: days[0], dailyAverage: 3 }} endDay="2026-09-01" schoolEmpty={false} />,
      { locale: "vi" },
    );
    expect(screen.getByText("98.765")).toBeInTheDocument();
  });
});
