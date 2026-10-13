// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import Leaderboard from "../leaderboard";
import { HistoryList } from "../student/history-list";
import { SeatHolders } from "../school/seat-holders";
import ClassroomSelector from "../teacher/classroom-selector";
import { TeacherQuestCard } from "../quest/teacher-quest-card";
import { renderWithMessages } from "./helpers/render-with-messages";

vi.mock("@reading-advantage/auth-client", () => ({
  useSession: () => ({ user: { id: "student-1", role: "STUDENT", schoolId: "school-1" } }),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));

const fetchMock = vi.fn();
/** A successful JSON response stub. */
const ok = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const quest = {
  id: "40000000-0000-4000-8000-000000000004", classId: "c1", templateId: "goblin-raid", challengeId: "30000000-0000-4000-8000-000000000003",
  status: "open" as const, statusAt: "2026-10-05T00:00:00.000Z", startsAt: "2026-10-04T17:00:00.000Z", battleAt: "2026-10-09T07:30:00.000Z", bossTarget: 350, createdAt: "2026-10-05T00:00:00.000Z",
};
const card = {
  quest, title: { en: "Raid", th: "Raid" }, boss: { artKey: "goblin-king", name: { en: "King", th: "King" }, hpPerStudent: 20 },
  daysLeft: 4, committed: 70, rosterSize: 25, studentsWithPowerUps: 7,
};

describe.each(["cn", "tw"] as const)("page locale %s reaches Intl as a BCP 47 tag", (locale) => {
  it("writes the school page dates in Chinese (SeatHolders)", async () => {
    fetchMock.mockResolvedValue(ok({ page: 1, pageSize: 50, total: 1, holders: [{ id: "s1", name: "Nok", username: "bluetiger47", classes: [], joinedAt: "2026-10-04T09:00:00.000Z" }] }));
    renderWithMessages(<SeatHolders />, { locale });
    expect(await screen.findByText("2026年10月4日")).toBeInTheDocument();
  });

  it("writes the student history date in Chinese (HistoryList)", async () => {
    fetchMock.mockResolvedValue(ok({
      data: [{ id: "a1", title: "The Moon", scores: "N/A", updated_at: "2026-10-04T09:00:00.000Z", rated: 0, status: "READ" }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    }));
    const { container } = renderWithMessages(<HistoryList variant="history" />, { locale });
    await waitFor(() => expect(container.textContent).toContain("2026年10月4日"));
    expect(container.textContent).not.toMatch(/Oct/);
  });

  it("writes the teacher class card date in Chinese (ClassroomSelector)", async () => {
    fetchMock.mockResolvedValue(ok({ classrooms: [{ id: "c1", name: "P3A", createdAt: "2026-10-04T09:00:00.000Z", students: [] }] }));
    const { container } = renderWithMessages(<ClassroomSelector />, { locale });
    await waitFor(() => expect(container.textContent).toContain("2026年10月4日"));
  });

  it("writes the quest battle time in the Chinese form of the locale (TeacherQuestCard)", () => {
    const { container } = renderWithMessages(<TeacherQuestCard classroomId="c1" card={card} />, { locale });
    expect(container.textContent).toContain("2026年10月9日");
    expect(container.textContent).toContain(locale === "cn" ? "14:30" : "下午2:30");
  });

  it("writes the leaderboard month in Chinese (Leaderboard)", () => {
    const { container } = renderWithMessages(<Leaderboard data={[]} schoolName="School" userId="u1" />, { locale });
    expect(container.textContent).toMatch(/\d{4}年\d{1,2}月/);
  });
});
