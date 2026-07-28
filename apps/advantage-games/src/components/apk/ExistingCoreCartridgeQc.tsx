"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
} from "@reading-advantage/advantage-play-kit/assets";
import {
  inspectCompositionGeometry,
  type ResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";
import {
  parseQcControls,
} from "@reading-advantage/advantage-play-kit/qc";
import {
  validateNonEmptyContent,
} from "@reading-advantage/advantage-play-kit/systems";
import {
  EXISTING_CORE_QC_REGISTRY,
  getExistingCoreQcRegistryEntry,
  loadExistingCoreQcCartridge,
  type ExistingCoreQcCartridge,
  type ExistingCoreQcId,
  type ExistingCoreQcInputModality,
  type ExistingCoreQcSession,
  type ExistingCoreQcSessionSnapshot,
} from "@reading-advantage/game-cartridges/qc";

import type { StandardPackQcAsset, StandardPackQcPreview } from "./StandardPackQc";

const CONTENT_FIXTURES = Object.freeze({
  "english-short": Object.freeze([
    Object.freeze({ term: "river", translation: "แม่น้ำ" }),
    Object.freeze({ term: "bright", translation: "สว่าง" }),
  ]),
  "english-long": Object.freeze([
    Object.freeze({ term: "environmental responsibility through collaborative problem solving", translation: "ความรับผิดชอบต่อสิ่งแวดล้อมผ่านการแก้ปัญหาร่วมกัน" }),
    Object.freeze({ term: "extraordinary learning opportunity", translation: "โอกาสการเรียนรู้ที่ไม่ธรรมดา" }),
  ]),
  "thai-short": Object.freeze([
    Object.freeze({ term: "แม่น้ำ", translation: "river" }),
    Object.freeze({ term: "ใจดี", translation: "kind" }),
  ]),
  "thai-long": Object.freeze([
    Object.freeze({ term: "ความรับผิดชอบต่อสิ่งแวดล้อมผ่านการเรียนรู้ร่วมกัน", translation: "environmental responsibility through collaborative learning" }),
    Object.freeze({ term: "การเรียนรู้ผ่านการผจญภัย", translation: "learning through adventure" }),
  ]),
});

type ContentFixtureId = keyof typeof CONTENT_FIXTURES;

const EMPTY_SESSION_SNAPSHOT: ExistingCoreQcSessionSnapshot = Object.freeze({
  mechanic: Object.freeze({}),
  inputCounts: Object.freeze({ keyboard: 0, pointer: 0, touch: 0 }),
  completionCount: 0,
});

/** Props for the quarantined existing-core cartridge QC field lab. */
export interface ExistingCoreCartridgeQcProps {
  /** Finite seven-asset host preview already materialized from the accepted release. */
  readonly preview: StandardPackQcPreview;
}

function drawQcCanvas(
  canvas: HTMLCanvasElement,
  cartridge: ExistingCoreQcCartridge,
  snapshot: ExistingCoreQcSessionSnapshot,
  fixture: ContentFixtureId,
  profile: "compact" | "wide" | "unsupported",
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = profile === "compact" ? "#102820" : "#14213d";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#8ce0b8";
  context.strokeRect(18, 18, width - 36, height - 36);
  context.fillStyle = "#f4f0dc";
  context.font = "700 26px sans-serif";
  context.textAlign = "center";
  context.fillText(cartridge.manifest.title, width / 2, 62);
  context.font = "600 17px sans-serif";
  context.fillStyle = "#8ce0b8";
  context.fillText(`${profile} / ${cartridge.semanticAdoption.temporalScope}`, width / 2, 92);
  context.fillStyle = "#f3c969";
  context.font = "700 20px sans-serif";
  context.fillText(CONTENT_FIXTURES[fixture][0].term, width / 2, 154, width - 96);
  context.fillStyle = "#b9c9bf";
  context.font = "15px monospace";
  context.fillText(`Accepted mechanic snapshot ${JSON.stringify(snapshot.mechanic)}`, width / 2, 220, width - 72);
  context.fillStyle = "#8ce0b8";
  context.beginPath();
  context.arc(width * 0.72, height * 0.72, 38, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#07110e";
  context.font = "700 14px sans-serif";
  context.fillText("PRIMARY", width * 0.72, height * 0.72 + 5);
  context.fillStyle = "#cc6b5a";
  context.beginPath();
  context.arc(width * 0.28, height * 0.72, 38, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f4f0dc";
  context.fillText("SECONDARY", width * 0.28, height * 0.72 + 5);
}

function modalityFromPointer(pointerType: string): ExistingCoreQcInputModality {
  return pointerType === "touch" ? "touch" : "pointer";
}

function selectedAssetsFor(
  cartridge: ExistingCoreQcCartridge | undefined,
  preview: StandardPackQcPreview,
): readonly StandardPackQcAsset[] {
  if (!cartridge) return [];
  return cartridge.manifest.semanticAssetRequirements.map((key) => {
    const asset = preview.assets.find((candidate) => candidate.key === key);
    if (!asset) throw new Error(`QC preview does not contain accepted selected-union key ${key}`);
    return asset;
  });
}

/**
 * Renders the five accepted mechanic adapters inside an explicit, non-consumable Advantage Games QC surface.
 * @param props Finite accepted-release preview metadata.
 * @returns One persistent canvas, responsive diagnostics, real-input controls, and selected-union inspection.
 */
export function ExistingCoreCartridgeQc({ preview }: ExistingCoreCartridgeQcProps) {
  const [selectedId, setSelectedId] = useState<ExistingCoreQcId>(EXISTING_CORE_QC_REGISTRY[0].id);
  const [fixture, setFixture] = useState<ContentFixtureId>("english-short");
  const [cartridge, setCartridge] = useState<ExistingCoreQcCartridge>();
  const [snapshot, setSnapshot] = useState<ExistingCoreQcSessionSnapshot>(EMPTY_SESSION_SNAPSHOT);
  const [composition, setComposition] = useState<ResponsiveComposition>();
  const [viewport, setViewport] = useState({ width: 390, height: 844 });
  const [loadError, setLoadError] = useState("");
  const sessionRef = useRef<ExistingCoreQcSession | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    let active = true;
    void loadExistingCoreQcCartridge(selectedId)
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
        setLoadError(error instanceof Error ? error.message : "QC cartridge failed to load");
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || cartridge?.manifest.id !== selectedId) return;
    const next = session.resize(viewport);
    setComposition(next);
    setSnapshot(session.snapshot());
  }, [cartridge, selectedId, viewport]);

  const selectedAssets = useMemo(
    () => selectedAssetsFor(cartridge, preview),
    [cartridge, preview],
  );
  const profile = composition?.supported ? composition.profile : "unsupported";
  const geometryIssues = composition?.supported ? inspectCompositionGeometry(composition) : [];
  const content = useMemo(
    () => cartridge
      ? validateNonEmptyContent(CONTENT_FIXTURES[fixture], cartridge.manifest.inputMode)
      : undefined,
    [cartridge, fixture],
  );

  useEffect(() => {
    if (!canvasRef.current || !cartridge) return;
    drawQcCanvas(canvasRef.current, cartridge, snapshot, fixture, profile);
  }, [cartridge, fixture, profile, snapshot]);

  const refreshSnapshot = () => {
    const session = sessionRef.current;
    if (session) setSnapshot(session.snapshot());
  };

  const dispatch = (modality: ExistingCoreQcInputModality, intent: "primary" | "secondary") => {
    sessionRef.current?.dispatch(modality, intent);
    refreshSnapshot();
  };

  const completeProof = () => {
    sessionRef.current?.completeProof();
    refreshSnapshot();
  };

  const selectCartridge = (candidate: string) => {
    const entry = getExistingCoreQcRegistryEntry(candidate);
    if (entry) setSelectedId(entry.id);
  };

  const selectFixture = (candidate: string) => {
    const controls = parseQcControls({ fixture: candidate });
    setFixture(controls.fixture as ContentFixtureId);
  };

  return (
    <section
      aria-label="Existing-core cartridge QC"
      className="border-t border-[#335c4b] bg-[#081510] px-4 py-8 text-[#f4f0dc] sm:px-8"
      data-loaded-cartridge={cartridge?.manifest.id ?? ""}
    >
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#8ce0b8]">Task 4 / Advantage Games only</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-3xl font-black">Existing-core cartridge QC</h2>
            <p className="mt-2 max-w-3xl text-sm text-[#b9c9bf]">Evidence-bounded mechanic adapters only. This surface is not a production catalog, cutover, Reading or Primary integration, retirement proof, or current-gameplay promotion for historical titles.</p>
          </div>
          <p className="rounded border border-[#4f806a] bg-[#102820] px-3 py-2 font-mono text-xs text-[#b9f6d5]">receipt {cartridge?.semanticAdoption.receiptSha256.slice(0, 12) ?? "loading"}</p>
        </div>

        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          <aside aria-label="Existing-core QC controls" className="min-w-0 space-y-5 rounded border border-[#335c4b] bg-[#0c1b16] p-5">
            <label className="block text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">
              QC cartridge
              <select
                className="mt-2 min-h-11 w-full rounded border border-[#426b59] bg-[#07110e] px-3 text-sm text-[#f4f0dc]"
                onChange={(event) => selectCartridge(event.target.value)}
                value={selectedId}
              >
                {EXISTING_CORE_QC_REGISTRY.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">
              Cartridge proof fixture
              <select
                className="mt-2 min-h-11 w-full rounded border border-[#426b59] bg-[#07110e] px-3 text-sm text-[#f4f0dc]"
                onChange={(event) => selectFixture(event.target.value)}
                value={fixture}
              >
                {Object.keys(CONTENT_FIXTURES).map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </label>
            <dl className="space-y-2 text-xs">
              <div><dt className="font-bold text-[#8ce0b8]">Layout</dt><dd data-testid="existing-core-layout-profile">{profile}</dd></div>
              <div><dt className="font-bold text-[#8ce0b8]">Geometry issues</dt><dd data-testid="existing-core-geometry-issues">{geometryIssues.length}</dd></div>
              <div><dt className="font-bold text-[#8ce0b8]">Input counts</dt><dd data-testid="existing-core-input-counts">keyboard {snapshot.inputCounts.keyboard} · pointer {snapshot.inputCounts.pointer} · touch {snapshot.inputCounts.touch}</dd></div>
              <div><dt className="font-bold text-[#8ce0b8]">Completion emissions</dt><dd data-testid="existing-core-completion-count">{snapshot.completionCount}</dd></div>
            </dl>
            <button
              className="min-h-11 w-full rounded border border-[#f3c969] px-3 text-sm font-bold text-[#f3c969] hover:bg-[#2e2918] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c969]"
              onClick={completeProof}
              type="button"
            >
              Complete QC proof
            </button>
            <p className="text-xs text-[#8fa99b]">Enter or right-side activation applies the accepted primary invariant. X or left-side activation applies the accepted secondary invariant. C exercises the QC completion latch.</p>
          </aside>

          <div className="min-w-0 rounded border border-[#335c4b] bg-[#0c1b16] p-4 sm:p-5">
            {loadError ? <p role="alert" className="rounded border border-[#cc6b5a] bg-[#3a1712] p-4">{loadError}</p> : null}
            {cartridge ? (
              <>
                <div className="min-w-0 rounded border border-[#29483c] bg-[#091713] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">Complete fixture text</p>
                  <p className="mt-2 break-words text-lg font-bold [overflow-wrap:anywhere]" data-testid="existing-core-fixture-text">{content?.items[0]?.term}</p>
                  <p className="mt-1 break-words text-sm text-[#b9c9bf] [overflow-wrap:anywhere]">{content?.items[0]?.translation}</p>
                </div>
                <canvas
                  aria-label={`${cartridge.manifest.title} QC canvas`}
                  className="mt-4 block aspect-[12/7] h-auto w-full rounded border-2 border-[#4f806a] bg-[#102820] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3c969]"
                  data-testid="existing-core-qc-canvas"
                  height={420}
                  onKeyDown={(event) => {
                    if (event.code === "KeyC") completeProof();
                    else if (["Enter", "Space", "ArrowRight"].includes(event.code)) dispatch("keyboard", "primary");
                    else if (["KeyX", "ArrowLeft"].includes(event.code)) dispatch("keyboard", "secondary");
                  }}
                  onPointerDown={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    dispatch(
                      modalityFromPointer(event.pointerType),
                      event.clientX - bounds.left >= bounds.width / 2 ? "primary" : "secondary",
                    );
                  }}
                  ref={canvasRef}
                  role="img"
                  tabIndex={0}
                  width={720}
                >
                  {cartridge.manifest.title} accepted mechanic QC canvas
                </canvas>
                <pre className="mt-4 max-w-full overflow-x-auto rounded border border-[#29483c] bg-[#07110e] p-3 text-[10px] text-[#b9c9bf]" data-testid="existing-core-mechanic-snapshot">{JSON.stringify(snapshot.mechanic)}</pre>
              </>
            ) : <p role="status">Loading QC cartridge…</p>}
          </div>

          <aside aria-label="Existing-core selected union" className="min-w-0 rounded border border-[#335c4b] bg-[#0c1b16] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8ce0b8]">Selected union only</p>
            <p className="mt-2 font-mono text-xs text-[#b9c9bf]" data-testid="existing-core-delivery-count">{selectedAssets.length} of {ACCEPTED_STANDARD_ASSET_RELEASE.acceptanceEvidence.assetCount}</p>
            <ul className="mt-4 space-y-3">
              {selectedAssets.map((asset) => (
                <li
                  className="min-w-0 rounded border border-[#29483c] bg-[#091713] p-3"
                  data-selected-asset-key={asset.key}
                  data-testid="existing-core-selected-asset"
                  key={asset.key}
                >
                  <span className="block break-all font-mono text-[10px] text-[#8ce0b8]">{asset.key}</span>
                  {asset.mediaType === "image" ? (
                    <Image
                      alt={`Selected QC asset ${asset.key}`}
                      className="mt-2 h-12 w-12 object-contain [image-rendering:pixelated]"
                      height={48}
                      src={asset.previewUrl}
                      unoptimized
                      width={48}
                    />
                  ) : asset.mediaType === "audio" ? (
                    <audio
                      aria-label={`Selected QC audio ${asset.key}`}
                      className="mt-2 w-full max-w-full"
                      controls
                      preload="metadata"
                      src={asset.previewUrl}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-[#29483c] pt-4 text-xs text-[#8fa99b]">{preview.requiredCredit}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
