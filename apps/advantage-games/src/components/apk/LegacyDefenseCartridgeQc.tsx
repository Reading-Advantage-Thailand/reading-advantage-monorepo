"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { inspectCompositionGeometry, type ResponsiveComposition } from "@reading-advantage/advantage-play-kit/responsive";
import {
  LEGACY_DEFENSE_QC_REGISTRY,
  getLegacyDefenseQcRegistryEntry,
  loadLegacyDefenseQcCartridge,
  type LegacyDefenseQcCartridge,
  type LegacyDefenseQcId,
  type LegacyDefenseQcInputModality,
  type LegacyDefenseQcSession,
  type LegacyDefenseQcSessionSnapshot,
} from "@reading-advantage/game-cartridges/legacy-defense-qc";
import type { LegacyDefenseSelectedUnion } from "@reading-advantage/game-cartridges/legacy-defense-candidates";

import type { StandardPackQcAsset, StandardPackQcPreview } from "./StandardPackQc";

const EMPTY_SESSION_SNAPSHOT: LegacyDefenseQcSessionSnapshot = Object.freeze({
  mechanic: Object.freeze({ status: "loading", completionSupported: false, evidence: Object.freeze([]) }),
  inputCounts: Object.freeze({ keyboard: 0, pointer: 0, touch: 0 }),
  blockedInteractionCount: 0,
  completionCount: 0,
});

/** Props for the quarantined four-title Legacy Defense QC surface. */
export interface LegacyDefenseCartridgeQcProps {
  /** Generated selected-output preview bound to the accepted standard-pack release. */
  readonly preview: StandardPackQcPreview;
  /** Resolver-issued descriptor selections created at the `/qc` server boundary. */
  readonly selections: readonly LegacyDefenseSelectedUnion[];
}

/** Draws a source-evidence diagnostic without displaying a result, score, or completion affordance. */
function drawQcCanvas(canvas: HTMLCanvasElement, cartridge: LegacyDefenseQcCartridge, snapshot: LegacyDefenseQcSessionSnapshot, profile: "compact" | "wide" | "unsupported"): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = profile === "compact" ? "#11253a" : "#132c43";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#8bc8df";
  context.strokeRect(18, 18, width - 36, height - 36);
  context.textAlign = "center";
  context.fillStyle = "#eff8fb";
  context.font = "700 26px sans-serif";
  context.fillText(cartridge.manifest.title, width / 2, 62);
  context.fillStyle = "#b8dbea";
  context.font = "600 16px sans-serif";
  context.fillText(`${profile} / resolver-issued descriptor inspection`, width / 2, 94);
  context.fillStyle = snapshot.mechanic.status === "blocked" ? "#ffd287" : "#9be6bc";
  context.font = "700 18px sans-serif";
  context.fillText(`Source-bound state: ${snapshot.mechanic.status}`, width / 2, 154, width - 80);
  context.fillStyle = "#d2e4ec";
  context.font = "13px monospace";
  context.fillText(`keyboard ${snapshot.inputCounts.keyboard} · pointer ${snapshot.inputCounts.pointer} · touch ${snapshot.inputCounts.touch}`, width / 2, 207, width - 72);
  context.fillStyle = "#67b9d6";
  context.beginPath();
  context.arc(width * 0.72, height * 0.72, 38, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#11253a";
  context.font = "700 14px sans-serif";
  context.fillText("PRIMARY", width * 0.72, height * 0.72 + 5);
  context.fillStyle = "#b56b79";
  context.beginPath();
  context.arc(width * 0.28, height * 0.72, 38, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#eff8fb";
  context.fillText("SECONDARY", width * 0.28, height * 0.72 + 5);
}

/** Maps browser pointer types to the normalised QC modality contract. */
function modalityFromPointer(pointerType: string): LegacyDefenseQcInputModality {
  return pointerType === "touch" ? "touch" : "pointer";
}

/** Resolves selected preview assets without placing source paths into client state. */
function selectedAssetsFor(cartridge: LegacyDefenseQcCartridge | undefined, preview: StandardPackQcPreview): readonly StandardPackQcAsset[] {
  if (!cartridge) return [];
  return cartridge.descriptorSelection.semanticKeys.map((key) => {
    const asset = preview.assets.find((candidate) => candidate.key === key);
    if (!asset) throw new Error(`Legacy Defense QC preview does not contain selected Asset Contract v2 key ${key}`);
    return asset;
  });
}

/**
 * Renders Legacy Defense only in the quarantined Advantage Games `/qc` surface.
 * @param props Pinned preview media and server-issued descriptor selections.
 * @returns Native input and responsive evidence with no production or completion lifecycle.
 */
export function LegacyDefenseCartridgeQc({ preview, selections }: LegacyDefenseCartridgeQcProps) {
  const [selectedId, setSelectedId] = useState<LegacyDefenseQcId>(LEGACY_DEFENSE_QC_REGISTRY[0].id);
  const [cartridge, setCartridge] = useState<LegacyDefenseQcCartridge>();
  const [snapshot, setSnapshot] = useState<LegacyDefenseQcSessionSnapshot>(EMPTY_SESSION_SNAPSHOT);
  const [composition, setComposition] = useState<ResponsiveComposition>();
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const [loadError, setLoadError] = useState("");
  const sessionRef = useRef<LegacyDefenseQcSession | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionById = useMemo(() => new Map(selections.map((selection) => [selection.publicId, selection])), [selections]);

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const selection = selectionById.get(selectedId);
    if (!selection) {
      setLoadError(`Legacy Defense QC selection is missing resolver-issued registrations for ${selectedId}`);
      return undefined;
    }
    let active = true;
    void loadLegacyDefenseQcCartridge(selectedId, selection).then((loaded) => {
      if (!active) return;
      const session = loaded.createQcSession();
      sessionRef.current = session;
      setCartridge(loaded);
      setSnapshot(session.snapshot());
      setLoadError("");
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : "Legacy Defense QC cartridge failed to load");
    });
    return () => { active = false; };
  }, [selectedId, selectionById]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || cartridge?.manifest.id !== selectedId) return;
    setComposition(session.resize(viewport));
    setSnapshot(session.snapshot());
  }, [cartridge, selectedId, viewport]);

  const selectedAssets = useMemo(() => selectedAssetsFor(cartridge, preview), [cartridge, preview]);
  const profile = composition?.supported ? composition.profile : "unsupported";
  const geometryIssues = composition?.supported ? inspectCompositionGeometry(composition) : [];
  useEffect(() => {
    if (canvasRef.current && cartridge) drawQcCanvas(canvasRef.current, cartridge, snapshot, profile);
  }, [cartridge, profile, snapshot]);

  /** Dispatches one received browser modality into the in-memory QC session. */
  const dispatch = (modality: LegacyDefenseQcInputModality, intent: "primary" | "secondary") => {
    sessionRef.current?.dispatch(modality, intent);
    if (sessionRef.current) setSnapshot(sessionRef.current.snapshot());
  };
  /** Selects only an exact registry entry from the four-title cohort. */
  const selectCartridge = (candidate: string) => {
    const entry = getLegacyDefenseQcRegistryEntry(candidate);
    if (entry) setSelectedId(entry.id);
  };

  return (
    <section aria-label="Legacy defense cartridge QC" className="border-t border-[#3e7490] bg-[#071823] px-4 py-8 text-[#eff8fb] sm:px-8" data-loaded-cartridge={cartridge?.manifest.id ?? ""}>
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#a9ddf1]">Legacy Defense / Advantage Games QC only</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0"><h2 className="font-serif text-3xl font-black">Legacy defense cartridge QC</h2><p className="mt-2 max-w-3xl text-sm text-[#c2dce7]">Exact current-source rules are inspectable for Castle, Wizard, and Village. Storm remains fail-closed for current absence and historical-only claims. This cohort cannot emit a result, persist progress, enter a catalog, or reach Reading or Primary.</p></div>
          <p className="rounded border border-[#5c9fba] bg-[#11253a] px-3 py-2 font-mono text-xs text-[#c6edfb]">completion delivery disabled</p>
        </div>
        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <aside aria-label="Legacy defense QC controls" className="min-w-0 space-y-5 rounded border border-[#3e7490] bg-[#102536] p-5">
            <label className="block text-xs font-bold uppercase tracking-widest text-[#a9ddf1]">QC cartridge<select aria-label="QC cartridge" className="mt-2 min-h-11 w-full rounded border border-[#5c9fba] bg-[#071823] px-3 text-sm text-[#eff8fb]" onChange={(event) => selectCartridge(event.target.value)} value={selectedId}>{LEGACY_DEFENSE_QC_REGISTRY.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
            <dl className="space-y-2 text-xs"><div><dt className="font-bold text-[#a9ddf1]">Layout</dt><dd data-testid="legacy-defense-layout-profile">{profile}</dd></div><div><dt className="font-bold text-[#a9ddf1]">Geometry issues</dt><dd data-testid="legacy-defense-geometry-issues">{geometryIssues.length}</dd></div><div><dt className="font-bold text-[#a9ddf1]">Input counts</dt><dd data-testid="legacy-defense-input-counts">keyboard {snapshot.inputCounts.keyboard} · pointer {snapshot.inputCounts.pointer} · touch {snapshot.inputCounts.touch}</dd></div><div><dt className="font-bold text-[#a9ddf1]">Blocked inputs</dt><dd data-testid="legacy-defense-blocked-input-count">{snapshot.blockedInteractionCount}</dd></div><div><dt className="font-bold text-[#a9ddf1]">Completion emissions</dt><dd data-testid="legacy-defense-completion-count">{snapshot.completionCount}</dd></div></dl>
            <p className="rounded border border-[#5c9fba] bg-[#11253a] p-3 text-xs text-[#c2dce7]">Enter, Space, or the right side records a primary interaction. X or the left side records a secondary interaction. Native input stays in this evidence-only session.</p>
          </aside>
          <div className="min-w-0 rounded border border-[#3e7490] bg-[#102536] p-4 sm:p-5">
            {loadError ? <p role="alert" className="rounded border border-[#e08a7a] bg-[#3a1d1a] p-4">{loadError}</p> : null}
            {cartridge ? <><canvas aria-label={`${cartridge.manifest.title} defense QC canvas`} className="block aspect-[12/7] h-auto w-full rounded border-2 border-[#5c9fba] bg-[#11253a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe09a]" data-testid="legacy-defense-qc-canvas" height={420} onKeyDown={(event) => { if (["Enter", "Space", "ArrowRight"].includes(event.code)) dispatch("keyboard", "primary"); else if (["KeyX", "ArrowLeft"].includes(event.code)) dispatch("keyboard", "secondary"); }} onPointerDown={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); dispatch(modalityFromPointer(event.pointerType), event.clientX - bounds.left >= bounds.width / 2 ? "primary" : "secondary"); }} ref={canvasRef} role="img" tabIndex={0} width={720}>{cartridge.manifest.title} defense QC canvas</canvas><pre className="mt-4 max-w-full overflow-x-auto rounded border border-[#325d75] bg-[#071823] p-3 text-[10px] text-[#c2dce7]" data-testid="legacy-defense-mechanic-snapshot">{JSON.stringify(snapshot.mechanic)}</pre></> : <p role="status">Loading Legacy Defense QC cartridge…</p>}
          </div>
          <aside aria-label="Legacy defense descriptor registrations" className="min-w-0 rounded border border-[#3e7490] bg-[#102536] p-5"><p className="text-xs font-bold uppercase tracking-widest text-[#a9ddf1]">Resolver-issued selected union</p><p className="mt-2 font-mono text-xs text-[#c2dce7]" data-testid="legacy-defense-delivery-count">{selectedAssets.length} of {preview.assets.length} QC assets</p><ul className="mt-4 space-y-3">{cartridge?.descriptorSelection.resolved.map((role) => <li className="min-w-0 rounded border border-[#325d75] bg-[#071823] p-3" data-testid="legacy-defense-descriptor-registration" key={role.titleRole}><span className="block break-all text-xs font-bold text-[#d9f1fa]">{role.titleRole}</span><span className="mt-1 block break-all font-mono text-[10px] text-[#c2dce7]">{role.semanticKey} · {role.descriptorId}</span><span className="mt-1 block break-all font-mono text-[10px] text-[#94b7c6]">claim {role.evidenceClaim.claimId} · descriptor {role.descriptorDigest.slice(0, 12)}</span></li>)}</ul><ul className="mt-4 space-y-3 border-t border-[#325d75] pt-4">{selectedAssets.map((asset) => <li className="min-w-0" data-selected-asset-key={asset.key} data-testid="legacy-defense-selected-asset" key={asset.key}><span className="block break-all font-mono text-[10px] text-[#a9ddf1]">{asset.key}</span>{asset.mediaType === "image" ? <Image alt={`Selected Legacy Defense QC asset ${asset.key}`} className="mt-2 h-12 w-12 object-contain [image-rendering:pixelated]" height={48} src={asset.previewUrl} unoptimized width={48} /> : null}{asset.mediaType === "audio" ? <audio aria-label={`Selected Legacy Defense QC audio ${asset.key}`} className="mt-2 w-full max-w-full" controls preload="metadata" src={asset.previewUrl} /> : null}</li>)}</ul><p className="mt-5 border-t border-[#325d75] pt-4 text-xs text-[#b8d5df]">{preview.requiredCredit}</p></aside>
        </div>
      </div>
    </section>
  );
}
