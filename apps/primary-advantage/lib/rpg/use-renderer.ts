"use client";

import { useEffect, useState } from "react";
import { detectRenderer, type Renderer } from "./renderer";

/**
 * The renderer of this device: "2d" on the server and until the client checks, then the
 * detected choice. A 3D view mounts only when this answers "3d".
 * @returns The renderer.
 */
export function useRenderer(): Renderer {
  const [renderer, setRenderer] = useState<Renderer>("2d");
  useEffect(() => {
    setRenderer(detectRenderer());
  }, []);
  return renderer;
}
