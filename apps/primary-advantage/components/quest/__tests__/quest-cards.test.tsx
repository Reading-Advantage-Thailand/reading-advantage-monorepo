// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { StudentQuestCard } from "../student-quest-card";
import { TeacherQuestCard } from "../teacher-quest-card";
import { defaultBattleAt } from "../assign-quest-form";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const quest = {
  id: "40000000-0000-4000-8000-000000000004", classId: "c1", templateId: "goblin-raid", challengeId: "30000000-0000-4000-8000-000000000003",
  status: "open" as const, statusAt: "2026-10-05T00:00:00.000Z", startsAt: "2026-10-04T17:00:00.000Z", battleAt: "2026-10-09T07:30:00.000Z", bossTarget: 350, createdAt: "2026-10-05T00:00:00.000Z",
};
const title = { en: "The Goblin King's Raid", th: "การบุกของราชาก๊อบลิน" };
const boss = { artKey: "goblin-king", name: { en: "The Goblin King", th: "ราชาก๊อบลิน" }, hpPerStudent: 20 };
const goals = [
  { key: "read-3-days", kind: "reading-days" as const, days: 3, powerUp: "shield" as const },
  { key: "accuracy-80", kind: "accuracy" as const, percent: 80, minQuestions: 20, powerUp: "sharp-blade" as const },
];

afterEach(cleanup);

describe("StudentQuestCard", () => {
  it("shows the boss, the days left, the meter, the power-ups, and the goals with the earned one marked", () => {
    renderWithMessages(
      <StudentQuestCard card={{ quest, title, boss, daysLeft: 4, committed: 70, powerUps: [{ goalKey: "read-3-days", powerUp: "shield", earnedAt: quest.createdAt, usedAt: null }], goals }} />,
      { locale: "en" },
    );
    expect(screen.getByRole("heading", { name: "Class Quest" })).toBeInTheDocument();
    expect(screen.getByText("The Goblin King's Raid")).toBeInTheDocument();
    expect(screen.getByText(/Boss: The Goblin King/)).toBeInTheDocument();
    expect(screen.getByText(/4 days to the battle/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Class damage" })).toHaveAttribute("aria-valuenow", "70");
    expect(screen.getByText("70 of 350 damage")).toBeInTheDocument();
    expect(screen.getByText("Read on 3 days")).toBeInTheDocument();
    expect(screen.getByText("Earned")).toBeInTheDocument();
    expect(screen.getByText("80% correct on 20 questions")).toBeInTheDocument();
    expect(screen.getAllByText("Shield")).toHaveLength(1);
  });
  it("renders nothing without a quest and uses Thai copy for a Thai student", () => {
    const { container } = renderWithMessages(<StudentQuestCard card={null} />, { locale: "en" });
    expect(container).toBeEmptyDOMElement();
    renderWithMessages(<StudentQuestCard card={{ quest, title, boss, daysLeft: 0, committed: 0, powerUps: [], goals }} />, { locale: "th" });
    expect(screen.getByText("การบุกของราชาก๊อบลิน")).toBeInTheDocument();
    expect(screen.getByText(/วันต่อสู้!/)).toBeInTheDocument();
  });
});

describe("TeacherQuestCard", () => {
  it("shows the quest with the roster numbers and a cancel button while open", () => {
    renderWithMessages(<TeacherQuestCard classroomId="c1" card={{ quest, title, boss, daysLeft: 4, committed: 70, rosterSize: 25, studentsWithPowerUps: 7 }} />, { locale: "en" });
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText(/25 students/)).toBeInTheDocument();
    expect(screen.getByText(/7 with power-ups/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel the quest" })).toBeInTheDocument();
  });
  it("offers the assign link without a quest and hides cancel once the battle runs", () => {
    renderWithMessages(<TeacherQuestCard classroomId="c1" card={null} />, { locale: "en" });
    expect(screen.getByRole("link", { name: "Assign a quest" })).toHaveAttribute("href", "/teacher/quest?classroomId=c1");
    cleanup();
    renderWithMessages(<TeacherQuestCard classroomId="c1" card={{ quest: { ...quest, status: "play" }, title, boss, daysLeft: 0, committed: 70, rosterSize: 25, studentsWithPowerUps: 7 }} />, { locale: "en" });
    expect(screen.queryByRole("button", { name: "Cancel the quest" })).toBeNull();
    expect(screen.getByText("Battle")).toBeInTheDocument();
  });
});

describe("defaultBattleAt", () => {
  it("is the next Friday at 14:30, a week ahead on a Friday", () => {
    expect(defaultBattleAt(new Date(2026, 9, 5, 9, 0))).toBe("2026-10-09T14:30");
    expect(defaultBattleAt(new Date(2026, 9, 9, 9, 0))).toBe("2026-10-16T14:30");
  });
});
