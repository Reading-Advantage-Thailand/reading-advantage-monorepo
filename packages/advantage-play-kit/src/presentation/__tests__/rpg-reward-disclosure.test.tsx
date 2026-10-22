import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { StudentRpgState } from "@reading-advantage/game-contracts";

import { RpgRewardDisclosure } from "../rpg-reward-disclosure.js";
import { RPG_LOAD_FAILED } from "../rpg-reward-labels.js";

const assetUrls = { "apprentice-wand": "/a.webp", "graveyard-staff": "/g.webp", "echo-staff": "/e.webp" } as const;

const state: StudentRpgState = {
  schemaVersion: 1,
  equippedEmblemId: null,
  cosmetics: [
    { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand", unlockedAt: "2026-09-09T01:00:00.000Z", equipped: false },
    { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: null, equipped: false },
    { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: null, equipped: false },
  ],
  quests: [],
};

afterEach(cleanup);

describe("RpgRewardDisclosure", () => {
  it("counts the unlocked rewards and styles the bar with the panel's reward variables", () => {
    render(<RpgRewardDisclosure state={state} assetUrls={assetUrls} />);
    const bar = screen.getByText("Wizard rewards · 1/3");
    const style = bar.getAttribute("style") ?? "";
    expect(style).toContain("var(--apk-reward-background, #081225)");
    expect(style).toContain("var(--apk-reward-text, #f7f2d0)");
    expect(style).toContain("var(--apk-reward-border, #31577d)");
  });

  it("shows the host's labels, quest requirements, and failure line (Thai UI, 2026-10-22)", () => {
    const withQuest: StudentRpgState = { ...state, quests: [{ id: "complete-the-ward", completed: false, completedAt: null, rewardId: "graveyard-staff" }] };
    render(<RpgRewardDisclosure state={withQuest} assetUrls={assetUrls} failureMessage={RPG_LOAD_FAILED} onRetry={() => {}}
      labels={{ heading: "รางวัลเกม Hero vs. Zombie", unlocked: "ปลดล็อกแล้ว", locked: "ยังล็อกอยู่: {requirement}", lockedFallback: "ทำภารกิจให้สำเร็จ",
        loadFailed: "โหลดรางวัลไม่สำเร็จ", tryAgain: "ลองอีกครั้ง", quests: { "complete-the-ward": "ชนะเกม Hero vs. Zombie" } }} />);
    expect(screen.getByText("รางวัลเกม Hero vs. Zombie · 1/3")).toBeInTheDocument();
    expect(screen.getByText("ปลดล็อกแล้ว")).toBeInTheDocument();
    expect(screen.getByText("ยังล็อกอยู่: ชนะเกม Hero vs. Zombie")).toBeInTheDocument();
    expect(screen.getByText("ยังล็อกอยู่: ทำภารกิจให้สำเร็จ")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("โหลดรางวัลไม่สำเร็จ");
    expect(screen.getByRole("button", { name: "ลองอีกครั้ง" })).toBeInTheDocument();
    expect(screen.queryByText(/Wizard|Unlocked|Locked/)).not.toBeInTheDocument();
  });
});
