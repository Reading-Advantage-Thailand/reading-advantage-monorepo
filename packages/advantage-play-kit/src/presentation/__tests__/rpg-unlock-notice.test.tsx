import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RpgUnlockNotice } from "../rpg-unlock-notice.js";

const assetUrls = {
  "apprentice-wand": "/reviewed/apprentice.png",
  "graveyard-staff": "/reviewed/graveyard.png",
  "echo-staff": "/reviewed/echo.png",
} as const;

afterEach(cleanup);

describe("RpgUnlockNotice", () => {
  it("shows only confirmed new cosmetics with arcade equipment controls", () => {
    const onEquip = vi.fn();
    render(
      <RpgUnlockNotice
        cosmetics={[
          { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: "2026-09-09T01:00:00.000Z", equipped: false },
        ]}
        assetUrls={assetUrls}
        onEquip={onEquip}
      />,
    );

    expect(screen.getByRole("region", { name: "New Wizard rewards" })).toHaveAttribute("data-apk-region", "progression");
    const image = screen.getByAltText("");
    expect(image).toHaveAttribute("src", "/reviewed/graveyard.png");
    expect(image).toHaveAttribute("width", "64");
    const equip = screen.getByRole("button", { name: "Equip Graveyard Staff" });
    expect(equip).toHaveStyle({ minBlockSize: "48px" });
    fireEvent.click(equip);
    expect(onEquip).toHaveBeenCalledWith("graveyard-staff");
    expect(screen.queryByText("Apprentice Wand")).not.toBeInTheDocument();
  });

  it("shows a retry action without inventing an unlock", () => {
    const onRetry = vi.fn();
    render(
      <RpgUnlockNotice
        cosmetics={[]}
        assetUrls={assetUrls}
        failureMessage="Rewards could not be loaded. Try again."
        onEquip={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("region", { name: "Wizard rewards" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Rewards could not be loaded");
    expect(screen.queryByText("Unlocked")).not.toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toHaveStyle({ minBlockSize: "48px" });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
