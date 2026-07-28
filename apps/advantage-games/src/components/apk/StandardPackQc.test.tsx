import { fireEvent, render, screen } from "@testing-library/react";

import { StandardPackQc, type StandardPackQcPreview } from "./StandardPackQc";

const preview: StandardPackQcPreview = {
  schemaVersion: 1,
  version: "2026.07.23",
  catalogDigest: "catalog-digest",
  sourceReceiptDigest: "receipt-digest",
  requiredCredit: "Pixel art assets by ElvGames",
  assets: [
    { key: "top-down/32x32/characters/hero-01", view: "top-down", category: "characters", extension: "png", cellSize: { width: 32, height: 32 }, mediaType: "image", previewUrl: "/assets/qc/hero.png" },
    { key: "audio/native/combat/hit-01", view: "audio", category: "combat", extension: "ogg", cellSize: null, mediaType: "audio", previewUrl: "/assets/qc/hit.ogg" },
  ],
};

describe("StandardPackQc", () => {
  it("searches semantic metadata and previews the selected pinned image", () => {
    render(<StandardPackQc preview={preview} />);

    expect(screen.getByRole("img", { name: /preview of top-down\/32x32\/characters\/hero-01/i })).toHaveAttribute(
      "src",
      expect.stringContaining("%2Fassets%2Fqc%2Fhero.png"),
    );
    fireEvent.change(screen.getByRole("searchbox", { name: /search semantic metadata/i }), { target: { value: "combat" } });

    expect(screen.getByText("1 of 2 pinned previews")).toBeInTheDocument();
    expect(screen.getByLabelText(/preview audio for audio\/native\/combat\/hit-01/i)).toHaveAttribute("src", "/assets/qc/hit.ogg");
    fireEvent.click(screen.getByRole("button", { name: /audio\/native\/combat\/hit-01/i }));
    expect(screen.getByLabelText(/preview audio for audio\/native\/combat\/hit-01/i)).toHaveAttribute("src", "/assets/qc/hit.ogg");
  });

  it("renders attribution and release bindings without source paths", () => {
    render(<StandardPackQc preview={preview} />);

    expect(screen.getByText("Pixel art assets by ElvGames")).toBeInTheDocument();
    expect(screen.getByText("catalog-digest")).toBeInTheDocument();
    expect(screen.getByText("receipt-digest")).toBeInTheDocument();
    expect(screen.queryByText(/source_archive/i)).not.toBeInTheDocument();
  });

  it("uses a context-appropriate h2 for the embedded gallery title", () => {
    render(<StandardPackQc preview={preview} />);

    const heading = screen.getByRole("heading", { name: /standard pack preview/i });
    expect(heading.tagName).toBe("H2");
  });

  it("constrains the audio control to the responsive preview container", () => {
    render(<StandardPackQc preview={preview} />);

    fireEvent.change(screen.getByRole("searchbox", { name: /search semantic metadata/i }), { target: { value: "combat" } });
    const audio = screen.getByLabelText(/preview audio for audio\/native\/combat\/hit-01/i);
    expect(audio.tagName).toBe("AUDIO");
    expect(audio).toHaveClass("w-full", "max-w-full");
    expect(audio.parentElement).toHaveClass("max-w-full", "min-w-0");
  });
});
