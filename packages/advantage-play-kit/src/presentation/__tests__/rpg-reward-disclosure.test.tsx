import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { StudentRpgState } from "@reading-advantage/game-contracts";

import { RpgRewardDisclosure } from "../rpg-reward-disclosure.js";

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
});
