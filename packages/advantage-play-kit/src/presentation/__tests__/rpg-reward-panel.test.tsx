import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudentRpgState } from "@reading-advantage/game-contracts";

import { RpgRewardPanel } from "../rpg-reward-panel.js";

const assetUrls = {
  "apprentice-wand": "/reviewed/staff-normal-1.png",
  "graveyard-staff": "/reviewed/staff-blue-54.png",
  "echo-staff": "/reviewed/staff-purple-78.png",
} as const;

const state: StudentRpgState = {
  schemaVersion: 1,
  equippedEmblemId: "apprentice-wand",
  cosmetics: [
    { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand", unlockedAt: "2026-09-09T01:00:00.000Z", equipped: true },
    { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: "2026-09-09T01:01:00.000Z", equipped: false },
    { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: null, equipped: false },
  ],
  quests: [
    { id: "first-ward", completed: true, completedAt: "2026-09-09T01:00:00.000Z", rewardId: "apprentice-wand" },
    { id: "complete-the-ward", completed: true, completedAt: "2026-09-09T01:01:00.000Z", rewardId: "graveyard-staff" },
    { id: "perfect-english-audio", completed: false, completedAt: null, rewardId: "echo-staff" },
  ],
};

afterEach(cleanup);

describe("RpgRewardPanel", () => {
  it("shows confirmed rewards, reviewed icons, the equipped state, and exact locked requirements", () => {
    const { container } = render(<RpgRewardPanel state={state} assetUrls={assetUrls} onEquip={vi.fn()} />);

    expect(screen.getByRole("region", { name: "Wizard rewards" })).toHaveAttribute("data-apk-region", "progression");
    expect(screen.getAllByText("Unlocked")).toHaveLength(2);
    expect(screen.getByText("Locked: Win Wizard vs. Zombie with Thai translation prompts and English term audio answers. Complete every item correctly on the first attempt.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Equipped Apprentice Wand" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Equipped Apprentice Wand" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Equip Graveyard Staff" })).toHaveStyle({ minBlockSize: "48px" });
    expect(screen.queryByRole("button", { name: /echo staff/i })).not.toBeInTheDocument();
    expect(Array.from(container.querySelectorAll("img"), (image) => image.getAttribute("src"))).toEqual(Object.values(assetUrls));
  });

  it("requests equipment once and disables every equip action while confirmation is pending", () => {
    const onEquip = vi.fn();
    const { rerender } = render(<RpgRewardPanel state={state} assetUrls={assetUrls} onEquip={onEquip} />);

    fireEvent.click(screen.getByRole("button", { name: "Equip Graveyard Staff" }));
    expect(onEquip).toHaveBeenCalledOnce();
    expect(onEquip).toHaveBeenCalledWith("graveyard-staff");

    rerender(<RpgRewardPanel state={state} assetUrls={assetUrls} pendingCosmeticId="graveyard-staff" onEquip={onEquip} />);
    expect(screen.getByRole("button", { name: "Equipping Graveyard Staff" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Equipping Graveyard Staff" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Equipped Apprentice Wand" })).toBeDisabled();
  });

  it("keeps confirmed state visible during a failure and exposes a 48px retry action", () => {
    const onRetry = vi.fn();
    render(
      <RpgRewardPanel
        state={state}
        assetUrls={assetUrls}
        failureMessage="Equipment could not be saved."
        onRetry={onRetry}
        onEquip={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Equipment could not be saved.");
    expect(screen.getByRole("heading", { name: "Apprentice Wand" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Equipped Apprentice Wand" })).toHaveAttribute("aria-pressed", "true");
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toHaveStyle({ minBlockSize: "48px" });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();

    const echoCard = screen.getByText("Echo Staff").closest("li");
    expect(echoCard).not.toBeNull();
    expect(within(echoCard!).getByText(/^Locked:/)).toBeInTheDocument();
  });
});
