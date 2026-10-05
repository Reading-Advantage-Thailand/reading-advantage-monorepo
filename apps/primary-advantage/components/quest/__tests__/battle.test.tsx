// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuestStatus } from "@reading-advantage/game-contracts";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { BattleClient, tallyRun } from "../battle-client";
import { LiveDashboard } from "../live-dashboard";
import { countdownText } from "../countdown";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/apk/StudentCartridgeHost", () => ({ StudentCartridgeHost: (props: { challengeId?: string }) => <div data-testid="game" data-challenge={props.challengeId} /> }));
vi.mock("@/components/avatar/portrait-canvas", () => ({ AvatarPortrait: ({ alt }: { alt: string }) => <img alt={alt} /> }));

const quest = {
  id: "40000000-0000-4000-8000-000000000004", classId: "c1", templateId: "goblin-raid", challengeId: "30000000-0000-4000-8000-000000000003",
  status: "open" as const, statusAt: "2026-10-09T07:30:00.000Z", startsAt: "2026-10-04T17:00:00.000Z", battleAt: "2026-10-09T07:30:00.000Z", bossTarget: 40, createdAt: "2026-10-05T00:00:00.000Z",
};
const title = { en: "The Goblin King's Raid", th: "การบุกของราชาก๊อบลิน" };
const boss = { artKey: "goblin-king", name: { en: "The Goblin King", th: "ราชาก๊อบลิน" }, hpPerStudent: 20 };
const cartridge = { id: "wizard-vs-zombie", title: "Wizard", description: "d", inputMode: "vocabulary" as const };
const battle = (status: QuestStatus, over: Partial<Parameters<typeof BattleClient>[0]["initial"]> = {}) => ({
  quest: { ...quest, status }, title, boss, target: 40, committed: 10, pending: 4, countdownEndsAt: null, powerUps: [{ goalKey: "read-3-days", powerUp: "shield" as const, earnedAt: quest.createdAt, usedAt: null }], runId: null, ...over,
});
const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ state: null }) }));

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tallyRun and countdownText", () => {
  it("costs 1 HP per wrong answer, lets a shield absorb one, rests at 0, and counts the damage with the blade", () => {
    expect(tallyRun({ challengeRunId: "r1", correctAnswers: 8, totalAttempts: 10 }, new Set(["shield", "sharp-blade"]))).toMatchObject({ runId: "r1", answered: 10, correct: 8, hp: 4, damage: 24, rested: false, done: true });
    expect(tallyRun({ correctAnswers: 3, totalAttempts: 10 }, new Set())).toMatchObject({ hp: 1, damage: 6, rested: true, runId: null });
  });
  it("formats the countdown and never goes below zero", () => {
    expect(countdownText("2026-10-09T07:36:00.000Z", new Date("2026-10-09T07:31:30.000Z"))).toBe("4:30");
    expect(countdownText("2026-10-09T07:36:00.000Z", new Date("2026-10-09T07:40:00.000Z"))).toBe("0:00");
    expect(countdownText(null, new Date())).toBeNull();
  });
});

describe("BattleClient", () => {
  it("waits while the quest is open, and posts a presence heartbeat during the rally", () => {
    renderWithMessages(<BattleClient initial={battle("open")} cartridge={cartridge} ownerKey="s:1" profile={null} avatar={null} />, { locale: "en" });
    expect(screen.getByText("The battle has not started. Wait for your teacher.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shield" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("progressbar", { name: "Your HP" })).toHaveAttribute("aria-valuenow", "5");
    expect(fetchMock).not.toHaveBeenCalled();
    cleanup();
    renderWithMessages(<BattleClient initial={battle("rally")} cartridge={cartridge} ownerKey="s:1" profile={null} avatar={null} />, { locale: "en" });
    expect(screen.getByText("You are here! The battle starts soon.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/quest/heartbeat", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body).toMatchObject({ questId: quest.id, runId: null, answered: 0, hp: 5, damage: 0, powerUpsUsed: [] });
  });
  it("mounts the game with the quest's challenge during play and shows the result", () => {
    renderWithMessages(<BattleClient initial={battle("play")} cartridge={cartridge} ownerKey="s:1" profile={null} avatar={null} />, { locale: "en" });
    expect(screen.getByTestId("game")).toHaveAttribute("data-challenge", quest.challengeId);
    cleanup();
    renderWithMessages(<BattleClient initial={battle("result", { committed: 40 })} cartridge={cartridge} ownerKey="s:1" profile={null} avatar={null} />, { locale: "en" });
    expect(screen.getByText("The boss fell!")).toBeInTheDocument();
    expect(screen.queryByTestId("game")).toBeNull();
  });
});

describe("LiveDashboard", () => {
  const dashboard = (status: QuestStatus) => ({
    quest: { ...quest, status }, title, boss, target: 40, committed: 16, pending: 6, countdownEndsAt: null,
    students: [
      { userId: "s1", name: "Ann", present: true, hp: 3, stale: false, profile: null, loadout: {} },
      { userId: "s2", name: "Bo", present: false, hp: null, stale: false, profile: null, loadout: {} },
    ],
    hits: [{ userId: "s1", name: "Ann", damage: 6, at: "2026-10-09T07:33:00.000Z" }],
    helpers: [{ userId: "s1", name: "Ann" }],
    bossFallen: false,
  });
  it("shows the meter, every student with an HP bar, the hit feed, and the next-state control, with no score per student", () => {
    renderWithMessages(<LiveDashboard initial={dashboard("play")} />, { locale: "en" });
    expect(screen.getByRole("progressbar", { name: "Class damage" })).toHaveAttribute("aria-valuenow", "16");
    expect(screen.getByText("1 of 2 here")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Ann HP" })).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByRole("progressbar", { name: "Bo HP" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("Ann hit for 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show the result" })).toBeInTheDocument();
    expect(screen.queryByText(/16 damage/)).toBeNull();
  });
  it("shows the result with the helpers and closes with no control when done", () => {
    renderWithMessages(<LiveDashboard initial={{ ...dashboard("result"), committed: 40, bossFallen: true }} />, { locale: "en" });
    expect(screen.getByText("The boss fell!")).toBeInTheDocument();
    expect(screen.getByText("Thank you, helpers!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close the quest" })).toBeInTheDocument();
    cleanup();
    renderWithMessages(<LiveDashboard initial={dashboard("done")} />, { locale: "en" });
    expect(screen.getByText("The quest is closed.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
