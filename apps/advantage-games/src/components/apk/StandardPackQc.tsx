"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

/** One browser-safe, semantic entry in the generated QC preview manifest. */
export interface StandardPackQcAsset {
  /** Stable semantic asset identifier. */
  readonly key: string;
  /** Catalog presentation family. */
  readonly view: string;
  /** Catalog category used for filtering. */
  readonly category: string;
  /** Encoded media extension. */
  readonly extension: string;
  /** Optional logical cell size. */
  readonly cellSize: { readonly width: number; readonly height: number } | null;
  /** Safe media class for the browser preview. */
  readonly mediaType: "image" | "audio" | "font";
  /** Static URL emitted by the pinned materialization output. */
  readonly previewUrl: string;
}

/** Browser-safe metadata emitted alongside the finite materialized QC set. */
export interface StandardPackQcPreview {
  /** Generated preview schema version. */
  readonly schemaVersion: number;
  /** Pinned standard-pack release version. */
  readonly version: string;
  /** Digest of the release catalog used for materialization. */
  readonly catalogDigest: string;
  /** Digest of the source receipt bound to the release. */
  readonly sourceReceiptDigest: string;
  /** Attribution required by the pinned release. */
  readonly requiredCredit: string;
  /** Finite semantic preview set. */
  readonly assets: readonly StandardPackQcAsset[];
}

/** Props for the release-bound Standard Pack QC surface. */
export interface StandardPackQcProps {
  /** Generated semantic preview metadata and provenance bindings. */
  readonly preview: StandardPackQcPreview;
}

/**
 * Renders a searchable, release-bound visual and audio check for curated standard-pack assets.
 * @param props The generated finite preview manifest.
 * @returns An interactive QC surface that exposes semantic metadata rather than source paths.
 */
export function StandardPackQc({ preview }: StandardPackQcProps) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(preview.assets[0]?.key ?? "");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const assets = useMemo(
    () => preview.assets.filter((asset) => `${asset.key} ${asset.view} ${asset.category}`.toLocaleLowerCase().includes(normalizedQuery)),
    [normalizedQuery, preview.assets],
  );
  const selected = assets.find((asset) => asset.key === selectedKey) ?? assets[0];

  return (
    <section aria-label="Standard pack preview" className="bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <section aria-labelledby="standard-pack-preview-heading" className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Release quality control</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight" id="standard-pack-preview-heading">Standard Pack preview</h2>
          <p className="mt-2 text-sm text-slate-300">A finite materialized preview set. Search and select semantic metadata; source-vendor paths are not part of this surface.</p>
          <label className="mt-5 block text-sm font-medium" htmlFor="standard-pack-qc-search">
            Search semantic metadata
          </label>
          <input
            className="mt-2 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-emerald-400 focus:ring-2"
            id="standard-pack-qc-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="hero, combat, inventory…"
            type="search"
            value={query}
          />
          <p aria-live="polite" className="mt-3 text-sm text-slate-300">{assets.length} of {preview.assets.length} pinned previews</p>
          <ul aria-label="Pinned standard-pack previews" className="mt-3 grid gap-2 sm:grid-cols-2">
            {assets.map((asset) => (
              <li key={asset.key}>
                <button
                  aria-pressed={selected?.key === asset.key}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-left transition hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 aria-pressed:border-emerald-400"
                  onClick={() => setSelectedKey(asset.key)}
                  type="button"
                >
                  <span className="block break-all font-mono text-xs text-emerald-200">{asset.key}</span>
                  <span className="mt-1 block text-xs text-slate-400">{asset.view} · {asset.category} · {asset.cellSize ? `${asset.cellSize.width}×${asset.cellSize.height}` : "native"}</span>
                </button>
              </li>
            ))}
          </ul>
          {assets.length === 0 ? <p className="mt-4 rounded-md border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-100">No pinned preview matches that semantic query.</p> : null}
        </section>
        <aside aria-label="Selected standard-pack preview" className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Selected preview</h2>
          {selected ? (
            <>
              <p className="mt-3 break-all font-mono text-sm text-emerald-200">{selected.key}</p>
              <p className="mt-1 text-sm text-slate-300">{selected.mediaType} · {selected.extension} · {selected.category}</p>
              <div
                className="mt-4 flex min-h-52 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 p-3"
                style={selected.mediaType === "image" ? {
                  backgroundColor: "#e2e8f0",
                  backgroundImage: "linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
                  backgroundSize: "16px 16px",
                } : undefined}
              >
                {selected.mediaType === "image" ? (
                  <Image
                    alt={`Preview of ${selected.key}`}
                    className="max-h-96 w-full object-contain [image-rendering:pixelated]"
                    height={512}
                    src={selected.previewUrl}
                    width={512}
                  />
                ) : selected.mediaType === "audio" ? (
                  <div className="min-w-0 max-w-full px-1">
                    <audio
                      aria-label={`Preview audio for ${selected.key}`}
                      className="w-full max-w-full"
                      controls
                      preload="metadata"
                      src={selected.previewUrl}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">This media type has no browser preview.</p>
                )}
              </div>
            </>
          ) : <p className="mt-3 text-sm text-slate-300">Choose a pinned preview to inspect it.</p>}
          <dl className="mt-6 space-y-3 border-t border-slate-700 pt-4 text-xs">
            <div><dt className="font-semibold text-slate-300">Release version</dt><dd className="break-all font-mono text-slate-400">{preview.version}</dd></div>
            <div><dt className="font-semibold text-slate-300">Catalog digest</dt><dd className="break-all font-mono text-slate-400">{preview.catalogDigest}</dd></div>
            <div><dt className="font-semibold text-slate-300">Source receipt digest</dt><dd className="break-all font-mono text-slate-400">{preview.sourceReceiptDigest}</dd></div>
            <div><dt className="font-semibold text-slate-300">Required credit</dt><dd className="text-slate-400">{preview.requiredCredit}</dd></div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
