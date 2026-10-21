"use client";

import { useEffect, useRef, useState } from "react";
import { AVATAR_PACK_VERSION, PORTRAIT_SIZE, portraitFiles, portraitPixels, recolorLayer, stackLayers, starterLoadout, wornLoadout } from "@reading-advantage/avatar-kit";
import type { AvatarLoadoutPiece, AvatarTints } from "@reading-advantage/game-contracts";
import { cn } from "@/lib/utils";

/** Where the app serves the pack (FR-10c). */
export const PACK_ROOT = `/packs/avatar/${AVATAR_PACK_VERSION}/`;

const pixelCache = new Map<string, Promise<Uint8ClampedArray>>();

/**
 * The RGBA pixels of a pack image, fetched once per page.
 * @param file The file path under the pack root.
 * @returns The pixels.
 */
function pixelsOf(file: string): Promise<Uint8ClampedArray> {
  let p = pixelCache.get(file);
  if (!p) {
    p = portraitPixels(PACK_ROOT + file);
    pixelCache.set(file, p);
  }
  return p;
}

/**
 * Composes the portrait of a class in the given colors: every layer recolored through its mask
 * and stacked in draw order.
 * @param classId The hero class.
 * @param tints The color choice.
 * @param signal Stops the work of a portrait that the page no longer shows.
 * @returns The RGBA pixels of the portrait.
 * @throws When the signal aborts before the portrait is done.
 */
export async function composePortrait(classId: string, tints: Partial<AvatarTints>, signal?: AbortSignal): Promise<Uint8ClampedArray> {
  return composeFiles(portraitFiles(starterLoadout(classId, tints)), signal);
}

/**
 * Composes the portrait of worn pieces in the given colors (the shop loadout).
 * @param pieces The worn pieces.
 * @param tints The color choice.
 * @param signal Stops the work of a portrait that the page no longer shows.
 * @returns The RGBA pixels of the portrait.
 * @throws When the signal aborts before the portrait is done.
 */
export async function composeWornPortrait(pieces: readonly AvatarLoadoutPiece[], tints: Partial<AvatarTints>, signal?: AbortSignal): Promise<Uint8ClampedArray> {
  return composeFiles(portraitFiles(wornLoadout(pieces, tints)), signal);
}

/** Resolves in a new task, so the page can paint and take taps between two pieces of pixel work. */
function nextTask(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return scheduler?.yield ? scheduler.yield() : new Promise((resolve) => setTimeout(resolve));
}

let turn: Promise<unknown> = Promise.resolve();

// One portrait after the other, one layer per task: the 15 picker cards fill one by one and the
// page takes taps meanwhile (all at once, they blocked a slow tablet for seconds).
async function composeFiles(files: ReturnType<typeof portraitFiles>, signal?: AbortSignal): Promise<Uint8ClampedArray> {
  const sources = await Promise.all(files.map(async ({ color, mask, scales }) => ({ color: await pixelsOf(color), mask: await pixelsOf(mask), scales })));
  const run = turn.then(async () => {
    const layers: Uint8ClampedArray[] = [];
    for (const { color, mask, scales } of sources) {
      await nextTask();
      signal?.throwIfAborted();
      layers.push(recolorLayer(color, mask, scales));
    }
    await nextTask();
    signal?.throwIfAborted();
    return stackLayers(layers);
  });
  turn = run.catch(() => undefined);
  return run;
}

/**
 * The portrait still of a hero class in a color scheme, or of worn pieces, drawn on a canvas (no WebGL).
 * @param props.classId The hero class (a starter set id); the fallback when no pieces are given.
 * @param props.pieces The worn pieces (the shop loadout); when given, they replace the class set.
 * @param props.tints The color choice; missing slots take the class colors.
 * @param props.alt The accessible name of the picture.
 * @param props.className Extra classes for the canvas.
 * @returns The canvas; a plain box with the name until the layers load.
 */
export function AvatarPortrait({ classId, pieces, tints = {}, alt, className }: { classId: string; pieces?: readonly AvatarLoadoutPiece[]; tints?: Partial<AvatarTints>; alt: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const key = `${classId}|${pieces ? pieces.map((p) => `${p.itemId}:${p.dye ?? ""}`).join(",") : "-"}|${tints.skin ?? ""}|${tints.hair ?? ""}|${tints.eyes ?? ""}|${tints.cloth ?? ""}`;

  useEffect(() => {
    const work = new AbortController();
    setStatus("loading");
    (pieces ? composeWornPortrait(pieces, tints, work.signal) : composePortrait(classId, tints, work.signal))
      .then((pixels) => {
        const canvas = canvasRef.current;
        if (work.signal.aborted || !canvas) return;
        canvas.getContext("2d")?.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, PORTRAIT_SIZE, PORTRAIT_SIZE), 0, 0);
        setStatus("ready");
      })
      .catch(() => !work.signal.aborted && setStatus("failed"));
    return () => work.abort();
    // The key holds every input of the portrait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      data-status={status}
      width={PORTRAIT_SIZE}
      height={PORTRAIT_SIZE}
      className={cn("aspect-square h-auto w-full", status === "loading" && "bg-muted animate-pulse rounded-2xl", status === "failed" && "bg-muted rounded-2xl", className)}
    />
  );
}
