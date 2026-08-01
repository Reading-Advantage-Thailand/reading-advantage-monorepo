"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  inspectCompositionGeometry,
  type ResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  EXISTING_ACTION_QC_REGISTRY,
  getExistingActionQcRegistryEntry,
  loadExistingActionQcCartridge,
  type ExistingActionQcCartridge,
  type ExistingActionQcId,
  type ExistingActionQcInputModality,
  type ExistingActionQcSession,
  type ExistingActionQcSessionSnapshot,
} from "@reading-advantage/game-cartridges/existing-action-qc";
import type { ExistingActionCandidateSelectedUnion } from "@reading-advantage/game-cartridges/existing-action-candidates";

import type { StandardPackQcAsset, StandardPackQcPreview } from "./StandardPackQc";

const EMPTY_SESSION_SNAPSHOT: ExistingActionQcSessionSnapshot = Object.freeze({
  mechanic: Object.freeze({
    status: "blocked",
    attempts: 0,
    correctAnswers: 0,
    progress: 0,
    score: 0,
    completions: 0,
    blockingClaim: Object.freeze({ claimId: "loading", locator: "loading", temporalScope: "unknown" }),
  }),
  inputCounts: Object.freeze({ keyboard: 0, pointer: 0, touch: 0 }),
  blockedInteractionCount: 0,
  completionCount: 0,
});

/** Props for the action-cohort-only native input QC surface. */
export interface ExistingActionCartridgeQcProps {
  /** Generated selected-output preview already materialized from the accepted release. */
  readonly preview: StandardPackQcPreview;
  /** Resolver-issued descriptor selections created in the `/qc` server boundary. */
  readonly selections: readonly ExistingActionCandidateSelectedUnion[];
}

/** Draws the one-canvas action QC diagnostic without claiming executable gameplay progression. */
function drawQcCanvas(
  canvas: HTMLCanvasElement,
  cartridge: ExistingActionQcCartridge,
  snapshot: ExistingActionQcSessionSnapshot,
  profile: "compact" | "wide" | "unsupported",
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = profile === "compact" ? "#271729" : "#20152f";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#d6a8ff";
  context.strokeRect(18, 18, width - 36, height - 36);
  context.textAlign = "center";
  context.fillStyle = "#fff4e8";
  context.font = "700 26px sans-serif";
  context.fillText(cartridge.manifest.title, width / 2, 62);
  context.fillStyle = "#e5c8ff";
  context.font = "600 16px sans-serif";
  context.fillText(`${profile} / resolver-issued descriptor inspection`, width / 2, 94);
  context.fillStyle = "#ffd27a";
  context.font = "700 18px sans-serif";
  context.fillText("Native input evidence only — progression blocked", width / 2, 154, width - 80);
  context.fillStyle = "#d9cae3";
  context.font = "13px monospace";
  context.fillText(`blocked by ${snapshot.mechanic.blockingClaim.claimId}`, width / 2, 207, width - 72);
  context.fillText(`keyboard ${snapshot.inputCounts.keyboard} · pointer ${snapshot.inputCounts.pointer} · touch ${snapshot.inputCounts.touch}`, width / 2, 239, width - 72);
  context.fillStyle = "#d6a8ff";
  context.beginPath();
  context.arc(width * 0.72, height * 0.72, 38, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#20152f";
  context.font = "700 14px sans-serif";
  context.fillText("PRIMARY", width * 0.72, height * 0.72 + 5);
  context.fillStyle = "#b75d76";
  context.beginPath();
  context.arc(width * 0.28, height * 0.72, 38, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fff4e8";
  context.fillText("SECONDARY", width * 0.28, height * 0.72 + 5);
}

/** Maps browser pointer type to the action QC input contract. */
function modalityFromPointer(pointerType: string): ExistingActionQcInputModality {
  return pointerType === "touch" ? "touch" : "pointer";
}

/** Resolves selected preview assets without exposing a physical standard-pack path. */
function selectedAssetsFor(
  cartridge: ExistingActionQcCartridge | undefined,
  preview: StandardPackQcPreview,
): readonly StandardPackQcAsset[] {
  if (!cartridge) return [];
  return cartridge.descriptorSelection.semanticKeys.map((key) => {
    const asset = preview.assets.find((candidate) => candidate.key === key);
    if (!asset) throw new Error(`Action QC preview does not contain selected Asset Contract v2 key ${key}`);
    return asset;
  });
}

/**
 * Renders all five action candidates only in the quarantined Advantage Games `/qc` surface.
 * @param props Pinned preview media and server-issued descriptor selections.
 * @returns A persistent canvas with responsive native-input evidence and no synthetic result path.
 */
export function ExistingActionCartridgeQc({ preview, selections }: ExistingActionCartridgeQcProps) {
  const [selectedId, setSelectedId] = useState<ExistingActionQcId>(EXISTING_ACTION_QC_REGISTRY[0].id);
  const [cartridge, setCartridge] = useState<ExistingActionQcCartridge>();
  const [snapshot, setSnapshot] = useState<ExistingActionQcSessionSnapshot>(EMPTY_SESSION_SNAPSHOT);
  const [composition, setComposition] = useState<ResponsiveComposition>();
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const [loadError, setLoadError] = useState("");
  const sessionRef = useRef<ExistingActionQcSession | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectionById = useMemo(
    () => new Map(selections.map((selection) => [selection.publicId, selection])),
    [selections],
  );

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const selection = selectionById.get(selectedId);
    if (!selection) {
      setLoadError(`Action QC selection is missing resolver-issued registrations for ${selectedId}`);
      return undefined;
    }
    let active = true;
    void loadExistingActionQcCartridge(selectedId, selection)
      .then((loaded) => {
        if (!active) return;
        const session = loaded.createQcSession();
        sessionRef.current = session;
        setCartridge(loaded);
        setSnapshot(session.snapshot());
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Action QC cartridge failed to load");
      });
    return () => {
      active = false;
    };
  }, [selectedId, selectionById]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || cartridge?.manifest.id !== selectedId) return;
    const next = session.resize(viewport);
    setComposition(next);
    setSnapshot(session.snapshot());
  }, [cartridge, selectedId, viewport]);

  const selectedAssets = useMemo(() => selectedAssetsFor(cartridge, preview), [cartridge, preview]);
  const profile = composition?.supported ? composition.profile : "unsupported";
  const geometryIssues = composition?.supported ? inspectCompositionGeometry(composition) : [];

  useEffect(() => {
    if (!canvasRef.current || !cartridge) return;
    drawQcCanvas(canvasRef.current, cartridge, snapshot, profile);
  }, [cartridge, profile, snapshot]);

  const dispatch = (modality: ExistingActionQcInputModality, intent: "primary" | "secondary") => {
    sessionRef.current?.dispatch(modality, intent);
    const session = sessionRef.current;
    if (session) setSnapshot(session.snapshot());
  };

  const selectCartridge = (candidate: string) => {
    const entry = getExistingActionQcRegistryEntry(candidate);
    if (entry) setSelectedId(entry.id);
  };

  return (
    <section
      aria-label="Existing action cartridge QC"
      className="border-t border-[#634075] bg-[#160d1d] px-4 py-8 text-[#fff4e8] sm:px-8"
      data-loaded-cartridge={cartridge?.manifest.id ?? ""}
    >
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#e5c8ff]">Action cohort / Advantage Games QC only</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-3xl font-black">Existing action cartridge QC</h2>
            <p className="mt-2 max-w-3xl text-sm text-[#d9cae3]">Resolver-issued Asset Contract v2 descriptors and native input are inspected here only. Historical and unknown claims block mechanic progression, results, persistence, catalog exposure, Reading, Primary, migration, retirement, and deployment.</p>
          </div>
          <p className="rounded border border-[#8f64a3] bg-[#271729] px-3 py-2 font-mono text-xs text-[#f1deff]">completion disabled by source evidence</p>
        </div>

        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <aside aria-label="Existing action QC controls" className="min-w-0 space-y-5 rounded border border-[#634075] bg-[#20152f] p-5">
            <label className="block text-xs font-bold uppercase tracking-widest text-[#e5c8ff]">
              QC cartridge
              <select className="mt-2 min-h-11 w-full rounded border border-[#805b92] bg-[#160d1d] px-3 text-sm text-[#fff4e8]" onChange={(event) => selectCartridge(event.target.value)} value={selectedId}>
                {EXISTING_ACTION_QC_REGISTRY.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
              </select>
            </label>
            <dl className="space-y-2 text-xs">
              <div><dt className="font-bold text-[#e5c8ff]">Layout</dt><dd data-testid="existing-action-layout-profile">{profile}</dd></div>
              <div><dt className="font-bold text-[#e5c8ff]">Geometry issues</dt><dd data-testid="existing-action-geometry-issues">{geometryIssues.length}</dd></div>
              <div><dt className="font-bold text-[#e5c8ff]">Input counts</dt><dd data-testid="existing-action-input-counts">keyboard {snapshot.inputCounts.keyboard} · pointer {snapshot.inputCounts.pointer} · touch {snapshot.inputCounts.touch}</dd></div>
              <div><dt className="font-bold text-[#e5c8ff]">Blocked inputs</dt><dd data-testid="existing-action-blocked-input-count">{snapshot.blockedInteractionCount}</dd></div>
              <div><dt className="font-bold text-[#e5c8ff]">Completion emissions</dt><dd data-testid="existing-action-completion-count">{snapshot.completionCount}</dd></div>
            </dl>
            <p className="rounded border border-[#805b92] bg-[#271729] p-3 text-xs text-[#d9cae3]">Enter, Space, or the right side normalize a primary intent. X or the left side normalize a secondary intent. Each is recorded as native input evidence but cannot produce synthetic educational progression.</p>
          </aside>

          <div className="min-w-0 rounded border border-[#634075] bg-[#20152f] p-4 sm:p-5">
            {loadError ? <p role="alert" className="rounded border border-[#d47a92] bg-[#3a1724] p-4">{loadError}</p> : null}
            {cartridge ? (
              <>
                <canvas
                  aria-label={`${cartridge.manifest.title} action QC canvas`}
                  className="block aspect-[12/7] h-auto w-full rounded border-2 border-[#8f64a3] bg-[#271729] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd27a]"
                  data-testid="existing-action-qc-canvas"
                  height={420}
                  onKeyDown={(event) => {
                    if (["Enter", "Space", "ArrowRight"].includes(event.code)) dispatch("keyboard", "primary");
                    else if (["KeyX", "ArrowLeft"].includes(event.code)) dispatch("keyboard", "secondary");
                  }}
                  onPointerDown={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    dispatch(modalityFromPointer(event.pointerType), event.clientX - bounds.left >= bounds.width / 2 ? "primary" : "secondary");
                  }}
                  ref={canvasRef}
                  role="img"
                  tabIndex={0}
                  width={720}
                >
                  {cartridge.manifest.title} action QC canvas
                </canvas>
                <pre className="mt-4 max-w-full overflow-x-auto rounded border border-[#593669] bg-[#160d1d] p-3 text-[10px] text-[#d9cae3]" data-testid="existing-action-mechanic-snapshot">{JSON.stringify(snapshot.mechanic)}</pre>
              </>
            ) : <p role="status">Loading action QC cartridge…</p>}
          </div>

          <aside aria-label="Existing action descriptor registrations" className="min-w-0 rounded border border-[#634075] bg-[#20152f] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#e5c8ff]">Resolver-issued selected union</p>
            <p className="mt-2 font-mono text-xs text-[#d9cae3]" data-testid="existing-action-delivery-count">{selectedAssets.length} of {preview.assets.length} QC assets</p>
            <ul className="mt-4 space-y-3">
              {cartridge?.descriptorSelection.resolved.map((role) => (
                <li className="min-w-0 rounded border border-[#593669] bg-[#160d1d] p-3" data-testid="existing-action-descriptor-registration" key={role.titleRole}>
                  <span className="block break-all text-xs font-bold text-[#f1deff]">{role.titleRole}</span>
                  <span className="mt-1 block break-all font-mono text-[10px] text-[#d9cae3]">{role.semanticKey} · {role.descriptorId}</span>
                  <span className="mt-1 block break-all font-mono text-[10px] text-[#bca8c9]">claim {role.evidenceClaim.claimId} · descriptor {role.descriptorDigest.slice(0, 12)}</span>
                </li>
              ))}
            </ul>
            <ul className="mt-4 space-y-3 border-t border-[#593669] pt-4">
              {selectedAssets.map((asset) => (
                <li className="min-w-0" data-selected-asset-key={asset.key} data-testid="existing-action-selected-asset" key={asset.key}>
                  <span className="block break-all font-mono text-[10px] text-[#e5c8ff]">{asset.key}</span>
                  {asset.mediaType === "image" ? <Image alt={`Selected action QC asset ${asset.key}`} className="mt-2 h-12 w-12 object-contain [image-rendering:pixelated]" height={48} src={asset.previewUrl} unoptimized width={48} /> : null}
                  {asset.mediaType === "audio" ? <audio aria-label={`Selected action QC audio ${asset.key}`} className="mt-2 w-full max-w-full" controls preload="metadata" src={asset.previewUrl} /> : null}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-[#593669] pt-4 text-xs text-[#c9b7d4]">{preview.requiredCredit}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
