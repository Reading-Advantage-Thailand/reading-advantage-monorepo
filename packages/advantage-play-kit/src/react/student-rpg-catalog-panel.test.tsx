import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  retry: vi.fn(),
  useStudentRpg: vi.fn(),
}));

vi.mock("./use-student-rpg.js", () => ({ useStudentRpg: mocks.useStudentRpg }));

import { StudentRpgCatalogPanel } from "./student-rpg-catalog-panel.js";

describe("StudentRpgCatalogPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables RPG requests and renders nothing without a validated owner key", () => {
    mocks.useStudentRpg.mockReturnValue({
      state: null,
      loading: false,
      pendingCosmeticId: null,
      failureMessage: null,
      retry: mocks.retry,
      equip: vi.fn(),
    });

    const { container } = render(<StudentRpgCatalogPanel />);

    expect(container).toBeEmptyDOMElement();
    expect(mocks.useStudentRpg).toHaveBeenCalledWith({
      endpoint: "/api/v1/apk/rpg",
      ownerKey: "",
      enabled: false,
    });
  });

  it("shows an initial failure and retries from a 48px action", () => {
    mocks.useStudentRpg.mockReturnValue({
      state: null,
      loading: false,
      pendingCosmeticId: null,
      failureMessage: "Rewards could not be loaded. Try again.",
      retry: mocks.retry,
      equip: vi.fn(),
    });

    render(<StudentRpgCatalogPanel ownerKey="school-1:student-7" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Rewards could not be loaded. Try again.");
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry).toHaveStyle({ minBlockSize: "48px" });
    fireEvent.click(retry);
    expect(mocks.retry).toHaveBeenCalledOnce();
  });

  it("uses the host reward icons and credit in place of the reviewed icons", () => {
    mocks.useStudentRpg.mockReturnValue({
      state: {
        schemaVersion: 1,
        equippedEmblemId: null,
        cosmetics: [{ id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: "2026-09-09T01:00:00.000Z", equipped: false }],
        quests: [],
      },
      loading: false,
      pendingCosmeticId: null,
      failureMessage: null,
      retry: mocks.retry,
      equip: vi.fn(),
    });
    const assetUrls = { "apprentice-wand": "/host/a.webp", "graveyard-staff": "/host/g.webp", "echo-staff": "/host/e.webp" };

    const { container } = render(<StudentRpgCatalogPanel ownerKey="school-1:student-7" assetUrls={assetUrls} credit={null} />);

    expect(Array.from(container.querySelectorAll("img"), (image) => image.getAttribute("src"))).toEqual(["/host/e.webp"]);
    expect(screen.queryByText("Pixel art assets by ElvGames")).not.toBeInTheDocument();
  });
});
