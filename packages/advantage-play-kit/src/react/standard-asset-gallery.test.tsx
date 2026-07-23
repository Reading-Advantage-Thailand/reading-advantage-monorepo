import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createStandardAssetCatalog } from "../assets/standard-pack-release.js";
import { StandardAssetGallery } from "./standard-asset-gallery.js";

const catalog = createStandardAssetCatalog({
  version: "2026.07.23",
  catalogDigest: "catalog-sha256",
  sourceReceiptDigest: "source-receipt-sha256",
  paths: [
    "effects/8x8/combat/hit-spark.png",
    "ui/16x16/icons/coin.png",
  ],
  sourceReceiptLocators: {
    "effects/8x8/combat/hit-spark.png": "IMPORT-RECEIPT.tsv:2",
    "ui/16x16/icons/coin.png": "IMPORT-RECEIPT.tsv:3",
  },
  physicalAssets: {
    "effects/8x8/combat/hit-spark.png": { kind: "image", byteSize: 1, sha256: "a".repeat(64), dimensions: { width: 8, height: 8 }, frameGrid: null },
    "ui/16x16/icons/coin.png": { kind: "image", byteSize: 1, sha256: "b".repeat(64), dimensions: { width: 16, height: 16 }, frameGrid: null },
  },
});

describe("StandardAssetGallery", () => {
  it("filters semantic catalog entries without exposing physical paths", () => {
    const onSelect = vi.fn();
    render(<StandardAssetGallery catalog={catalog} onSelect={onSelect} />);

    expect(screen.getByText("2 approved assets")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select ui/16x16/icons/coin" })).toBeInTheDocument();
    expect(screen.queryByText("ui/16x16/icons/coin.png")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search standard assets" }), {
      target: { value: "hit-spark" },
    });
    expect(screen.getByText("1 approved asset")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select effects/8x8/combat/hit-spark" }));
    expect(onSelect).toHaveBeenCalledWith("effects/8x8/combat/hit-spark");
  });
});
