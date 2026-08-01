"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  inspectCompositionGeometry,
  type ResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  LEGACY_TRAVERSAL_QC_REGISTRY,
  getLegacyTraversalQcRegistryEntry,
  loadLegacyTraversalQcCartridge,
  type LegacyTraversalQcCartridge,
  type LegacyTraversalQcInputIntent,
  type LegacyTraversalQcInputModality,
  type LegacyTraversalQcSelectedUnion,
  type LegacyTraversalQcSession,
  type LegacyTraversalQcSessionSnapshot,
} from "@reading-advantage/game-cartridges/legacy-traversal-qc";

import type { StandardPackQcAsset, StandardPackQcPreview } from "./StandardPackQc";

const EMPTY_SNAPSHOT: LegacyTraversalQcSessionSnapshot = Object.freeze({
  mechanic: Object.freeze({ claimIds: Object.freeze([]) }),
  inputCounts: Object.freeze({ keyboard: 0, pointer: 0, touch: 0 }),
  hostCompletionEmissions: 0,
});

/** Props for the isolated traversal title QC surface. */
export interface LegacyTraversalCartridgeQcProps {
  /** Preview media materialized from the accepted standard pack. */
  readonly preview: StandardPackQcPreview;
  /** Server-issued per-title Asset Contract v2 selected unions. */
  readonly selections: readonly LegacyTraversalQcSelectedUnion[];
}

/** Draws the source-bound mechanic state without invoking a product host or persistence path. */
function drawTraversalCanvas(
  canvas: HTMLCanvasElement,
  cartridge: LegacyTraversalQcCartridge,
  snapshot: LegacyTraversalQcSessionSnapshot,
  profile: "compact" | "wide" | "unsupported",
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height } = canvas;
  const claimIds = Array.isArray(snapshot.mechanic.claimIds) ? snapshot.mechanic.claimIds : [];
  context.clearRect(0, 0, width, height);
  context.fillStyle = profile === "compact" ? "#102328" : "#142d25";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#72c89d";
  context.strokeRect(18, 18, width - 36, height - 36);
  context.textAlign = "center";
  context.fillStyle = "#edf8ed";
  context.font = "700 26px sans-serif";
  context.fillText(cartridge.manifest.title, width / 2, 62);
  context.fillStyle = "#aadbc1";
  context.font = "600 16px sans-serif";
  context.fillText(`${profile} / source-bound local QC`, width / 2, 94);
  context.fillStyle = "#f4d47c";
  context.font = "700 17px sans-serif";
  context.fillText(`claims ${claimIds.length} · host completion emissions 0`, width / 2, 146, width - 70);
  context.fillStyle = "#d3e9d8";
  context.font = "13px monospace";
  context.fillText(`keyboard ${snapshot.inputCounts.keyboard} · pointer ${snapshot.inputCounts.pointer} · touch ${snapshot.inputCounts.touch}`, width / 2, 180, width - 70);
  context.fillStyle = "#72c89d";
  context.beginPath();
  context.arc(width * 0.25, height * 0.7, 46, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#102328";
  context.font = "700 13px sans-serif";
  context.fillText("SOURCE", width * 0.25, height * 0.7 + 5);
  context.fillStyle = "#e2a35f";
  context.beginPath();
  context.arc(width * 0.75, height * 0.7, 46, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#102328";
  context.fillText("QC", width * 0.75, height * 0.7 + 5);
}

/** Maps a browser pointer type to the QC modality vocabulary. */
function modalityFromPointer(pointerType: string): LegacyTraversalQcInputModality {
  return pointerType === "touch" ? "touch" : "pointer";
}

/** Maps a canvas x coordinate to a bounded local direction. */
function intentFromX(x: number, width: number): LegacyTraversalQcInputIntent {
  if (x < width / 3) return "left";
  if (x > (width / 3) * 2) return "right";
  return "primary";
}

/** Resolves only the selected preview assets without exposing a physical catalog path. */
function selectedAssetsFor(
  cartridge: LegacyTraversalQcCartridge | undefined,
  preview: StandardPackQcPreview,
): readonly StandardPackQcAsset[] {
  if (!cartridge) return [];
  return cartridge.descriptorSelection.semanticKeys.map((key) => {
    const asset = preview.assets.find((candidate) => candidate.key === key);
    if (!asset) throw new Error(`Traversal QC preview does not contain selected Asset Contract v2 key ${key}`);
    return asset;
  });
}

/** Renders all five source-bound traversal titles only in Advantage Games `/qc`. */
export function LegacyTraversalCartridgeQc({ preview, selections }: LegacyTraversalCartridgeQcProps) {
  const [selectedId, setSelectedId] = useState(LEGACY_TRAVERSAL_QC_REGISTRY[0].id);
  const [cartridge, setCartridge] = useState<LegacyTraversalQcCartridge>();
  const [snapshot, setSnapshot] = useState<LegacyTraversalQcSessionSnapshot>(EMPTY_SNAPSHOT);
  const [composition, setComposition] = useState<ResponsiveComposition>();
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const [loadError, setLoadError] = useState("");
  const sessionRef = useRef<LegacyTraversalQcSession | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectionById = useMemo(
    () => new Map(selections.map((selection) => [selection.id, selection])),
    [selections],
  );

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const entry = getLegacyTraversalQcRegistryEntry(selectedId);
    if (!entry) {
      setLoadError(`Traversal QC registry does not contain ${selectedId}`);
      return undefined;
    }
    const selection = selectionById.get(entry.id);
    if (!selection) {
      setLoadError(`Traversal QC selection is missing resolver-issued registrations for ${selectedId}`);
      return undefined;
    }
    let active = true;
    void loadLegacyTraversalQcCartridge(entry.id, selection)
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
        setLoadError(error instanceof Error ? error.message : "Traversal QC cartridge failed to load");
      });
    return () => {
      active = false;
    };
  }, [selectedId, selectionById]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || cartridge?.manifest.id !== selectedId) return;
    setComposition(session.resize(viewport));
    setSnapshot(session.snapshot());
  }, [cartridge, selectedId, viewport]);

  const profile = composition?.supported ? composition.profile : "unsupported";
  const geometryIssues = composition?.supported ? inspectCompositionGeometry(composition) : [];
  const selectedAssets = useMemo(() => selectedAssetsFor(cartridge, preview), [cartridge, preview]);

  useEffect(() => {
    if (!canvasRef.current || !cartridge) return;
    drawTraversalCanvas(canvasRef.current, cartridge, snapshot, profile);
  }, [cartridge, profile, snapshot]);

  const dispatch = (modality: LegacyTraversalQcInputModality, intent: LegacyTraversalQcInputIntent) => {
    sessionRef.current?.dispatch(modality, intent);
    const session = sessionRef.current;
    if (session) setSnapshot(session.snapshot());
  };

  return (
    <section
      aria-label="Legacy traversal cartridge QC"
      className="border-t border-[#3b715c] bg-[#081c19] px-4 py-8 text-[#edf8ed] sm:px-8"
      data-loaded-cartridge={cartridge?.manifest.id ?? ""}
    >
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#a9e3c3]">Traversal cohort / Advantage Games QC only</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-3xl font-black">Legacy traversal cartridge QC</h2>
            <p className="mt-2 max-w-3xl text-sm text-[#bed7c8]">Each local mechanic names its cited source claims and accepts native browser input. The surface cannot register a production catalog title, call Reading or Primary, emit host completion, persist progress, migrate, cut over, retire, or deploy.</p>
          </div>
          <p className="rounded border border-[#579778] bg-[#102d27] px-3 py-2 font-mono text-xs text-[#d2f2de]">host completion disabled</p>
        </div>

        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <aside aria-label="Legacy traversal QC controls" className="min-w-0 space-y-5 rounded border border-[#3b715c] bg-[#102d27] p-5">
            <label className="block text-xs font-bold uppercase tracking-widest text-[#a9e3c3]">
              QC cartridge
              <select className="mt-2 min-h-11 w-full rounded border border-[#579778] bg-[#081c19] px-3 text-sm text-[#edf8ed]" onChange={(event) => setSelectedId(event.target.value as typeof selectedId)} value={selectedId}>
                {LEGACY_TRAVERSAL_QC_REGISTRY.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
              </select>
            </label>
            <dl className="space-y-2 text-xs">
              <div><dt className="font-bold text-[#a9e3c3]">Layout</dt><dd data-testid="legacy-traversal-layout-profile">{profile}</dd></div>
              <div><dt className="font-bold text-[#a9e3c3]">Geometry issues</dt><dd data-testid="legacy-traversal-geometry-issues">{geometryIssues.length}</dd></div>
              <div><dt className="font-bold text-[#a9e3c3]">Input counts</dt><dd data-testid="legacy-traversal-input-counts">keyboard {snapshot.inputCounts.keyboard} · pointer {snapshot.inputCounts.pointer} · touch {snapshot.inputCounts.touch}</dd></div>
              <div><dt className="font-bold text-[#a9e3c3]">Host completion emissions</dt><dd data-testid="legacy-traversal-host-completion-count">{snapshot.hostCompletionEmissions}</dd></div>
            </dl>
            <p className="rounded border border-[#579778] bg-[#163b32] p-3 text-xs text-[#d5ebdd]">Arrow keys or WASD map to directions. Pointer and touch select left, center, or right canvas regions. Each event updates only the local source-bound QC mechanic.</p>
          </aside>

          <div className="min-w-0 rounded border border-[#3b715c] bg-[#102d27] p-4 sm:p-5">
            {loadError ? <p role="alert" className="rounded border border-[#df7b7b] bg-[#421d22] p-4">{loadError}</p> : null}
            {cartridge ? (
              <>
                <canvas
                  aria-label={`${cartridge.manifest.title} traversal QC canvas`}
                  className="block aspect-[12/7] h-auto w-full rounded border-2 border-[#579778] bg-[#081c19] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d47c]"
                  data-testid="legacy-traversal-qc-canvas"
                  height={420}
                  onKeyDown={(event) => {
                    const intent = event.code === "ArrowLeft" || event.code === "KeyA" ? "left"
                      : event.code === "ArrowRight" || event.code === "KeyD" ? "right"
                        : event.code === "ArrowUp" || event.code === "KeyW" ? "up"
                          : event.code === "ArrowDown" || event.code === "KeyS" ? "down"
                            : "primary";
                    dispatch("keyboard", intent);
                  }}
                  onPointerDown={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    dispatch(modalityFromPointer(event.pointerType), intentFromX(event.clientX - bounds.left, bounds.width));
                  }}
                  ref={canvasRef}
                  role="img"
                  tabIndex={0}
                  width={720}
                >
                  {cartridge.manifest.title} traversal QC canvas
                </canvas>
                <pre className="mt-4 max-w-full overflow-x-auto rounded border border-[#315e4d] bg-[#081c19] p-3 text-[10px] text-[#cbe7d7]" data-testid="legacy-traversal-mechanic-snapshot">{JSON.stringify(snapshot.mechanic)}</pre>
              </>
            ) : <p role="status">Loading traversal QC cartridge…</p>}
          </div>

          <aside aria-label="Legacy traversal descriptor registrations" className="min-w-0 rounded border border-[#3b715c] bg-[#102d27] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#a9e3c3]">Resolver-issued selected union</p>
            <p className="mt-2 font-mono text-xs text-[#d5ebdd]" data-testid="legacy-traversal-delivery-count">{selectedAssets.length} of {preview.assets.length} QC assets</p>
            <ul className="mt-4 space-y-3">
              {cartridge?.descriptorSelection.registrations.map((registration) => (
                <li className="min-w-0 rounded border border-[#315e4d] bg-[#081c19] p-3" data-testid="legacy-traversal-descriptor-registration" key={registration.semanticKey}>
                  <span className="block break-all font-mono text-[10px] text-[#d5ebdd]">{registration.semanticKey} · {registration.descriptor.descriptorId}</span>
                </li>
              ))}
            </ul>
            <ul className="mt-4 space-y-3 border-t border-[#315e4d] pt-4">
              {selectedAssets.map((asset) => (
                <li className="min-w-0" data-selected-asset-key={asset.key} data-testid="legacy-traversal-selected-asset" key={asset.key}>
                  <span className="block break-all font-mono text-[10px] text-[#a9e3c3]">{asset.key}</span>
                  {asset.mediaType === "image" ? <Image alt={`Selected traversal QC asset ${asset.key}`} className="mt-2 h-12 w-12 object-contain [image-rendering:pixelated]" height={48} src={asset.previewUrl} unoptimized width={48} /> : null}
                  {asset.mediaType === "audio" ? <audio aria-label={`Selected traversal QC audio ${asset.key}`} className="mt-2 w-full max-w-full" controls preload="metadata" src={asset.previewUrl} /> : null}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-[#315e4d] pt-4 text-xs text-[#cbe7d7]">{preview.requiredCredit}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
