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
});
