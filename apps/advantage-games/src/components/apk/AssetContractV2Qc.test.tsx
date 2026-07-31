import { render, screen } from "@testing-library/react";

import { AssetContractV2Qc } from "./AssetContractV2Qc";

describe("AssetContractV2Qc", () => {
  it("separates semantic identity, descriptor metadata, and animation behavior", () => {
    render(<AssetContractV2Qc />);

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
  });
});
