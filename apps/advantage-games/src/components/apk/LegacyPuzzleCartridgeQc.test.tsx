import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import acceptedStandardAssetCatalog from "../../../../../packages/advantage-play-kit/assets/standard/standard-pack-release.json";
import { createPuzzleQcSelections } from "@reading-advantage/game-cartridges/puzzle-qc";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";

import preview from "@/lib/apk/standard-pack-qc-preview.json";
import { LegacyPuzzleCartridgeQc } from "./LegacyPuzzleCartridgeQc";
import type { StandardPackQcPreview } from "./StandardPackQc";

const context = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  set fillStyle(_value: string) {},
  set strokeStyle(_value: string) {},
  set font(_value: string) {},
  textAlign: "start",
};

describe("LegacyPuzzleCartridgeQc", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
    Object.defineProperty(globalThis, "TextEncoder", { configurable: true, value: TextEncoder });
  });

  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads all five title-selected unions only in the explicit Legacy Puzzle QC surface", async () => {
    const selections = await createPuzzleQcSelections(acceptedStandardAssetCatalog as StandardAssetCatalog);
    render(<LegacyPuzzleCartridgeQc preview={preview as StandardPackQcPreview} selections={selections} />);

    const surface = screen.getByRole("region", { name: "Legacy Puzzle cartridge QC" });
    expect(within(surface).getByRole("heading", { name: "Legacy Puzzle cartridge QC" })).toBeInTheDocument();
    expect(within(surface).getByLabelText("QC cartridge")).toHaveValue("enchanted-library");
    expect(within(surface).getAllByRole("option")).toHaveLength(5);
    expect(await within(surface).findByRole("img", { name: "Enchanted Library puzzle QC canvas" })).toBeInTheDocument();
    expect(within(surface).getAllByTestId("legacy-puzzle-selected-asset")).toHaveLength(1);
  }, 30_000);

  it("records native keyboard and pointer input through one accessible canvas", async () => {
    const selections = await createPuzzleQcSelections(acceptedStandardAssetCatalog as StandardAssetCatalog);
    render(<LegacyPuzzleCartridgeQc preview={preview as StandardPackQcPreview} selections={selections} />);

    const surface = screen.getByRole("region", { name: "Legacy Puzzle cartridge QC" });
    const canvas = await within(surface).findByRole("img", { name: "Enchanted Library puzzle QC canvas" });
    fireEvent.keyDown(canvas, { code: "Enter", key: "Enter" });
    fireEvent.pointerDown(canvas, { pointerType: "mouse" });

    await waitFor(() => expect(within(surface).getByTestId("legacy-puzzle-input-counts")).toHaveTextContent("keyboard 1"));
    expect(within(surface).getByTestId("legacy-puzzle-input-counts")).toHaveTextContent("pointer 1");
    expect(within(surface).getByTestId("legacy-puzzle-qc-canvas")).toBe(canvas);
    expect(within(surface).getByTestId("legacy-puzzle-claim-ids")).toHaveTextContent("EL-XP-001");
  }, 30_000);
});
