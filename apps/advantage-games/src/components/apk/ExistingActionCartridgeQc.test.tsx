import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";

import acceptedStandardAssetCatalog from "../../../../../packages/advantage-play-kit/assets/standard/standard-pack-release.json";
import { createExistingActionTask2CanonicalResolver } from "@reading-advantage/advantage-play-kit/assets";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";
import {
  EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES,
  materializeExistingActionCandidateSelectedUnion,
} from "@reading-advantage/game-cartridges/existing-action-candidates";

import preview from "@/lib/apk/standard-pack-qc-preview.json";
import type { StandardPackQcPreview } from "./StandardPackQc";
import { ExistingActionCartridgeQc } from "./ExistingActionCartridgeQc";

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

describe("ExistingActionCartridgeQc", () => {
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

  it("renders all five action candidates only as v2 descriptor-backed QC with completion blocked", async () => {
    const resolver = await createExistingActionTask2CanonicalResolver(
      acceptedStandardAssetCatalog as unknown as StandardAssetCatalog,
    );
    const selections = await Promise.all(EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES.map(
      (candidate) => materializeExistingActionCandidateSelectedUnion(candidate, resolver),
    ));

    render(<ExistingActionCartridgeQc preview={preview as StandardPackQcPreview} selections={selections} />);

    const surface = screen.getByRole("region", { name: "Existing action cartridge QC" });
    expect(within(surface).getByRole("heading", { name: "Existing action cartridge QC" })).toBeInTheDocument();
    expect(within(surface).getByLabelText("QC cartridge")).toHaveValue("archers-revenge");
    expect(within(surface).getAllByRole("option")).toHaveLength(5);
    const canvas = await within(surface).findByRole("img", { name: "Archer's Revenge action QC canvas" });
    expect(within(surface).getAllByTestId("existing-action-descriptor-registration")).toHaveLength(4);

    fireEvent.keyDown(canvas, { code: "Enter", key: "Enter" });
    await waitFor(() => expect(within(surface).getByTestId("existing-action-input-counts")).toHaveTextContent("keyboard 1"));
    expect(within(surface).getByTestId("existing-action-blocked-input-count")).toHaveTextContent("1");
    expect(within(surface).getByTestId("existing-action-completion-count")).toHaveTextContent("0");
    expect(within(surface).getByTestId("existing-action-mechanic-snapshot")).toHaveTextContent('"status":"blocked"');
  }, 30_000);
});
