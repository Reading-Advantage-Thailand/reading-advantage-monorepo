"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";

/** Shapes of the picture-password pictures. */
type PictureShape =
  | "circle" | "square" | "triangle" | "star" | "heart" | "diamond"
  | "moon" | "cloud" | "drop" | "bolt" | "hexagon" | "flower";

/**
 * The 12 pictures of the picture password (FR-3). The array index is the picture number that the
 * server stores, so the order must never change. Every picture differs from every other one in
 * shape and in color. `key` names the label under `StudentPictures` in the message files.
 */
export const PICTURES: readonly { key: string; color: string; shape: PictureShape }[] = [
  { key: "redCircle", color: "#dc2626", shape: "circle" },
  { key: "blueSquare", color: "#1d4ed8", shape: "square" },
  { key: "greenTriangle", color: "#16a34a", shape: "triangle" },
  { key: "yellowStar", color: "#eab308", shape: "star" },
  { key: "pinkHeart", color: "#db2777", shape: "heart" },
  { key: "orangeDiamond", color: "#ea580c", shape: "diamond" },
  { key: "purpleMoon", color: "#7c3aed", shape: "moon" },
  { key: "grayCloud", color: "#6b7280", shape: "cloud" },
  { key: "skyDrop", color: "#0ea5e9", shape: "drop" },
  { key: "blackBolt", color: "#111827", shape: "bolt" },
  { key: "brownHexagon", color: "#92400e", shape: "hexagon" },
  { key: "tealFlower", color: "#0d9488", shape: "flower" },
];

const SHAPES: Record<PictureShape, ReactElement> = {
  circle: <circle cx="24" cy="24" r="19" />,
  square: <rect x="6" y="6" width="36" height="36" rx="3" />,
  triangle: <polygon points="24,4 45,42 3,42" />,
  star: <polygon points="24,4.5 29,18.6 44,19 32.1,28.1 36.3,42.5 24,34 11.7,42.5 15.9,28.1 4,19 19,18.6" />,
  heart: <path d="M24 43C24 43 4 30 4 17C4 10 9 5 15 5C19 5 22.5 7.5 24 11C25.5 7.5 29 5 33 5C39 5 44 10 44 17C44 30 24 43 24 43Z" />,
  diamond: <polygon points="24,3 44,24 24,45 4,24" />,
  moon: <path d="M21.7 5A19 19 0 1 0 39.4 31.6A16 16 0 0 1 21.7 5Z" />,
  cloud: (
    <>
      <circle cx="15" cy="29" r="9" />
      <circle cx="25" cy="21" r="12" />
      <circle cx="35" cy="29" r="8" />
      <rect x="15" y="29" width="20" height="8" />
    </>
  ),
  drop: <path d="M24 3C24 3 9 21 9 31A15 15 0 0 0 39 31C39 21 24 3 24 3Z" />,
  bolt: <polygon points="28,3 9,27 22,27 18,45 39,19 26,19" />,
  hexagon: <polygon points="44,24 34,41.3 14,41.3 4,24 14,6.7 34,6.7" />,
  flower: (
    <>
      <circle cx="24" cy="13" r="8" />
      <circle cx="34.5" cy="20.6" r="8" />
      <circle cx="30.5" cy="32.9" r="8" />
      <circle cx="17.5" cy="32.9" r="8" />
      <circle cx="13.5" cy="20.6" r="8" />
      <circle cx="24" cy="24" r="5" fill="#fff" />
    </>
  ),
};

/** Props of {@link PictureIcon}. */
export interface PictureIconProps {
  /** The picture number, from 0 to 11. */
  index: number;
  /** Size and layout classes. */
  className?: string;
}

/**
 * Draws one picture of the picture password as inline SVG with a translated label.
 * @param props The picture number and classes.
 * @returns The picture, or null for a number outside the grid.
 */
export function PictureIcon({ index, className }: PictureIconProps) {
  const t = useTranslations("StudentPictures");
  const picture = PICTURES[index];
  if (!picture) return null;
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={t(picture.key)} fill={picture.color} className={className}>
      {SHAPES[picture.shape]}
    </svg>
  );
}

/** Props of {@link PictureSequence}. */
export interface PictureSequenceProps {
  /** The picture numbers in tap order. */
  pictures: readonly number[];
}

/**
 * Shows a picture password in tap order, each picture with its step number and its name.
 * @param props The picture numbers.
 * @returns An ordered list of the pictures.
 */
export function PictureSequence({ pictures }: PictureSequenceProps) {
  const t = useTranslations("StudentPictures");
  return (
    <ol className="flex flex-wrap gap-4">
      {pictures.map((index, step) => (
        <li key={step} className="flex flex-col items-center gap-1 text-sm">
          <span className="font-bold">{step + 1}</span>
          <span aria-hidden="true">
            <PictureIcon index={index} className="size-14" />
          </span>
          <span>{PICTURES[index] ? t(PICTURES[index].key) : ""}</span>
        </li>
      ))}
    </ol>
  );
}
