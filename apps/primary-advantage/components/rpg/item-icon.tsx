"use client";

import { useEffect, useState } from "react";
import { itemArt, slotArt } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";

/** Whether the Forge view of a piece loaded, by path; shared by every icon on the page. */
const known = new Map<string, boolean>();

/**
 * The Forge view of a catalog piece; the slot icon stands in until the view loads, and stays
 * while the Forge build has no view for the piece yet.
 * @param props.itemId The catalog id.
 * @param props.slot The slot of the piece, for the fallback icon.
 * @param props.className Extra classes for the image.
 * @returns The image, decorative (an empty alt).
 */
export function ItemIcon({ itemId, slot, className }: { itemId: string; slot: string; className?: string }) {
  const art = itemArt(itemId);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (known.has(art)) return setReady(known.get(art)!);
    let live = true;
    const probe = new Image();
    probe.onload = () => {
      known.set(art, true);
      if (live) setReady(true);
    };
    probe.onerror = () => {
      known.set(art, false);
      if (live) setReady(false);
    };
    probe.src = art;
    return () => {
      live = false;
    };
  }, [art]);
  return <img src={ready ? art : slotArt(slot)} alt="" className={cn("cq-item-icon", className)} data-art={ready ? "forge" : "slot"} />;
}
