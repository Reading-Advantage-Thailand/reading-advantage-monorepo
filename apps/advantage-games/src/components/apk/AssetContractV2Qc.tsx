"use client";

import {
  EXEMPLAR_SIX_FRAME_WALK_DESCRIPTOR,
  EXEMPLAR_WALK_SEMANTIC_REQUIREMENT,
} from "@reading-advantage/advantage-play-kit/scaffolding";
import { createAssetContractV2QcDiagnostic } from "@reading-advantage/advantage-play-kit/qc";

const diagnostic = createAssetContractV2QcDiagnostic(
  EXEMPLAR_WALK_SEMANTIC_REQUIREMENT,
  EXEMPLAR_SIX_FRAME_WALK_DESCRIPTOR,
);

/**
 * Renders the deterministic, non-consumable Asset Contract v2 QC fixture.
 * @returns The semantic, physical-descriptor, and animation-behavior inspection panel.
 */
export function AssetContractV2Qc() {
  return (
    <section
      aria-label="Asset Contract v2 deterministic QC fixture"
      className="border-t border-[#335c4b] bg-[#0a1713] px-4 py-6 sm:px-8"
      data-testid="asset-contract-v2-qc-fixture"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">Asset Contract v2</p>
            <h2 className="mt-1 font-serif text-2xl font-bold">Deterministic contract fixture</h2>
          </div>
          <p
            className="max-w-xl text-xs text-[#8fa99b]"
            data-testid="asset-contract-v2-scope-note"
          >
            Contract-only evidence: no resolver result, suitability verdict, or real media rendering.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-3">
          <article
            aria-label="Asset Contract v2 semantic identity"
            className="min-w-0 rounded border border-[#29483c] bg-[#07110e] p-4"
            data-testid="asset-contract-v2-semantic"
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3c969]">Semantic identity</h3>
            <p className="mt-3 break-words font-mono text-sm text-[#b9f6d5]">{diagnostic.semantic.identity}</p>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
              <dt className="text-[#8fa99b]">Role</dt>
              <dd className="break-words">{diagnostic.semantic.role}</dd>
              <dt className="text-[#8fa99b]">State</dt>
              <dd className="break-words">{diagnostic.semantic.state}</dd>
            </dl>
          </article>

          <article
            aria-label="Asset Contract v2 physical descriptor"
            className="min-w-0 rounded border border-[#29483c] bg-[#07110e] p-4"
            data-testid="asset-contract-v2-physical"
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3c969]">Physical descriptor</h3>
            <dl className="mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
              <dt className="text-[#8fa99b]">Descriptor</dt>
              <dd className="min-w-0 break-all font-mono">{diagnostic.physicalDescriptor.descriptorId}</dd>
              <dt className="text-[#8fa99b]">Catalog key</dt>
              <dd className="min-w-0 break-all font-mono">{diagnostic.physicalDescriptor.catalogEntryKey}</dd>
              <dt className="text-[#8fa99b]">Media</dt>
              <dd>{diagnostic.physicalDescriptor.mediaKind}</dd>
              <dt className="text-[#8fa99b]">Release</dt>
              <dd className="break-words">{diagnostic.physicalDescriptor.release.version}</dd>
              <dt className="text-[#8fa99b]">Render scale</dt>
              <dd>{diagnostic.physicalDescriptor.renderScale}×</dd>
            </dl>
          </article>

          <article
            aria-label="Asset Contract v2 animation behavior"
            className="min-w-0 rounded border border-[#29483c] bg-[#07110e] p-4"
            data-testid="asset-contract-v2-animation"
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3c969]">Animation behavior</h3>
            {diagnostic.animation ? (
              <div className="mt-3 space-y-3">
                {diagnostic.animation.clips.map((clip) => (
                  <dl
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs"
                    data-testid="asset-contract-v2-animation-clip"
                    key={clip.clipId}
                  >
                    <dt className="text-[#8fa99b]">Clip</dt>
                    <dd className="min-w-0 break-all font-mono">{clip.clipId}</dd>
                    <dt className="text-[#8fa99b]">Frames</dt>
                    <dd>{clip.frameCount}</dd>
                    <dt className="text-[#8fa99b]">Timing</dt>
                    <dd>{clip.fps} FPS · {clip.loop ? "looping" : "one shot"}</dd>
                  </dl>
                ))}
                <p className="break-words text-xs text-[#8fa99b]">
                  Directions: {diagnostic.animation.directions.map((direction) => `${direction.direction} → ${direction.clipId}`).join(", ")}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[#8fa99b]">No animation behavior declared.</p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
