import { fireEvent, render, screen } from "@testing-library/react";

import preview from "@/lib/apk/standard-pack-qc-preview.json";
import {
  AdvantageGamesAuthoringQc,
} from "./AdvantageGamesAuthoringQc";
import type { StandardPackQcPreview } from "./StandardPackQc";

const canvasContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
};

describe("AdvantageGamesAuthoringQc", () => {
  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  it("exposes authoring fixtures, profile/input controls, diagnostics, exemplar results, and attribution", async () => {
    render(<AdvantageGamesAuthoringQc preview={preview as StandardPackQcPreview} />);

    expect(screen.getByRole("heading", { name: /cartridge field lab/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/content fixture/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /compact/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /wide/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/input mode/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /composition preview/i })).toBeInTheDocument();
    expect(screen.getAllByText(/pixel art assets by elvgames/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Selected union")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /asset contract v2 deterministic qc fixture/i })).toBeInTheDocument();
    expect(screen.getByTestId("asset-contract-v2-scope-note")).toHaveTextContent(
      /contract-only evidence: no resolver result, suitability verdict, or real media rendering/i,
    );
    expect(screen.getByTestId("asset-contract-v2-semantic")).toHaveTextContent("player:walk");
    expect(screen.getByTestId("asset-contract-v2-physical")).toHaveTextContent("exemplar-player-walk-six-frame");
    expect(screen.getByTestId("asset-contract-v2-physical")).toHaveTextContent("top-down/32x32/characters/hero-walk");
    expect(screen.getByTestId("asset-contract-v2-animation")).toHaveTextContent("walk-down");
    expect(screen.getByTestId("asset-contract-v2-animation")).toHaveTextContent("Frames6");
    expect(screen.getByTestId("asset-contract-v2-animation")).toHaveTextContent("12 FPS");
    expect(await screen.findByRole("img", { name: "Dragon Flight QC canvas" })).toBeInTheDocument();
  });

  it("switches to wide touch composition and supports pause, mute, restart, overlays, and result inspection", async () => {
    render(<AdvantageGamesAuthoringQc preview={preview as StandardPackQcPreview} />);

    fireEvent.click(screen.getByRole("button", { name: /wide/i }));
    fireEvent.change(screen.getByLabelText(/input mode/i), { target: { value: "touch" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /safe-region overlays/i }));
    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));
    fireEvent.click(screen.getByRole("button", { name: "Mute game" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart game" }));

    expect(screen.getByText(/wide · touch/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume game" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unmute game" })).toBeInTheDocument();
    expect(screen.getByText(/restart 1/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("safe-region-overlay").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Game result" })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Dragon Flight QC canvas" })).toBeInTheDocument();
  });

  it("exposes accessible control target sizes and focus rings for QC operators", async () => {
    render(<AdvantageGamesAuthoringQc preview={preview as StandardPackQcPreview} />);

    const range = screen.getByRole("slider", { name: /text scale/i });
    expect(range).toHaveClass("h-6", "min-h-6");

    const checkbox = screen.getByRole("checkbox", { name: /safe-region overlays/i });
    expect(checkbox).toHaveClass("focus-visible:outline-2", "focus-visible:outline-[#f3c969]");
    expect(checkbox.parentElement).toHaveClass("h-6", "w-6");

    const controls = screen.getByRole("navigation", { name: /game controls/i });
    expect(controls).toHaveClass(
      "[&_button]:min-h-11",
      "[&_button]:focus-visible:outline-2",
      "[&_button]:focus-visible:outline-[#f3c969]",
    );
    expect(await screen.findByRole("img", { name: "Dragon Flight QC canvas" })).toBeInTheDocument();
  });
});
