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
 * @returns The RGBA pixels of the portrait.
 */
export async function composePortrait(classId: string, tints: Partial<AvatarTints>): Promise<Uint8ClampedArray> {
  return composeFiles(portraitFiles(starterLoadout(classId, tints)));
}

/**
 * Composes the portrait of worn pieces in the given colors (the shop loadout).
 * @param pieces The worn pieces.
 * @param tints The color choice.
 * @returns The RGBA pixels of the portrait.
 */
export async function composeWornPortrait(pieces: readonly AvatarLoadoutPiece[], tints: Partial<AvatarTints>): Promise<Uint8ClampedArray> {
  return composeFiles(portraitFiles(wornLoadout(pieces, tints)));
}

async function composeFiles(files: ReturnType<typeof portraitFiles>): Promise<Uint8ClampedArray> {
  const layers = await Promise.all(files.map(async ({ color, mask, scales }) => recolorLayer(await pixelsOf(color), await pixelsOf(mask), scales)));
  return stackLayers(layers);
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
    let live = true;
    setStatus("loading");
    (pieces ? composeWornPortrait(pieces, tints) : composePortrait(classId, tints))
      .then((pixels) => {
        const canvas = canvasRef.current;
        if (!live || !canvas) return;
        canvas.getContext("2d")?.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, PORTRAIT_SIZE, PORTRAIT_SIZE), 0, 0);
        setStatus("ready");
      })
      .catch(() => live && setStatus("failed"));
    return () => {
      live = false;
    };
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
