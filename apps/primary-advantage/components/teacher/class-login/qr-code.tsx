"use client";

import { useMemo } from "react";
import { create } from "qrcode";

/** Quiet zone around the code, in modules (the QR standard asks for 4). */
const QUIET_ZONE = 4;

/** Props of {@link QrCode}. */
export interface QrCodeProps {
  /** The text to encode, for example a sign-in URL. */
  value: string;
  /** Accessible name of the image. */
  label: string;
  /** Size classes. */
  className?: string;
}

/**
 * Draws a QR code as inline SVG (black modules on white, error correction level M).
 * @param props The value, the label, and size classes.
 * @returns The QR code image.
 */
export function QrCode({ value, label, className }: QrCodeProps) {
  const { size, path } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: "M" });
    let d = "";
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { size: modules.size + QUIET_ZONE * 2, path: d };
  }, [value]);

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className={className}>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
