"use client";

import { useMemo, useState } from "react";

import type { StandardAssetCatalog } from "../assets/standard-pack-release.js";

/** Props for the browser-safe standard-pack QC gallery. */
export interface StandardAssetGalleryProps {
  /** The generated catalog for one pinned standard-pack release. */
  readonly catalog: StandardAssetCatalog;
  /** Receives the selected semantic key without exposing a vendor path. */
  readonly onSelect?: (semanticKey: string) => void;
}

/**
 * Renders a searchable QC gallery over generated standard-pack semantics.
 * @param props The generated catalog and optional semantic-key selection callback.
 * @returns An accessible searchable list of approved semantic asset keys.
 */
export function StandardAssetGallery({ catalog, onSelect }: StandardAssetGalleryProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const assets = useMemo(
    () => catalog.assets.filter((asset) => asset.key.includes(normalizedQuery)),
    [catalog.assets, normalizedQuery],
  );
  const countLabel = `${assets.length} approved asset${assets.length === 1 ? "" : "s"}`;

  return (
    <section aria-label="Standard asset gallery">
      <label>
        Search standard assets
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p aria-live="polite">{countLabel}</p>
      <ul>
        {assets.map((asset) => (
          <li key={asset.key}>
            <button type="button" onClick={() => onSelect?.(asset.key)}>
              Select {asset.key}
            </button>
            <span>{asset.view}</span>
            <span>{asset.cellSize ? `${asset.cellSize.width}×${asset.cellSize.height}` : "native"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
