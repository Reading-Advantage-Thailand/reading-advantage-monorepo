"use client";

import { useEffect, useRef, useState } from "react";
import { Sprite } from "@/components/rpg/sprite";
import { bossStrip } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";

/** How long a hit shows, in milliseconds. */
export const HIT_MS = 900;

/**
 * The hit the boss shows when its damage total rises: the delta for one beat, else null.
 * @param total The committed plus pending damage.
 * @returns The hit delta while a hit plays, else null.
 */
export function useBossHit(total: number): number | null {
  const last = useRef(total);
  const [hit, setHit] = useState<number | null>(null);
  useEffect(() => {
    const delta = total - last.current;
    last.current = total;
    if (delta <= 0) return;
    setHit(delta);
    const timer = setTimeout(() => setHit(null), HIT_MS);
    return () => clearTimeout(timer);
  }, [total]);
  return hit;
}

/**
 * The boss on the dais (docs/primary-rpg-skin.md §4): the idle strip, the hit strip with a
 * shake, a slash, a burst, and the floating damage number on a hit, and the death strip once it
 * falls.
 * @param props.artKey The boss art key of the quest template.
 * @param props.name The boss name, the accessible name of the sprite.
 * @param props.size The frame size in CSS pixels.
 * @param props.hit The damage of the hit that plays now, or null.
 * @param props.fallen True once the boss fell.
 * @param props.className Extra classes for the box.
 * @returns The boss box.
 */
export function BossSprite({
  artKey,
  name,
  size,
  hit,
  fallen,
  className,
}: {
  artKey: string;
  name: string;
  size: number;
  hit: number | null;
  fallen: boolean;
  className?: string;
}) {
  const clip = fallen ? "death" : hit ? "hit" : "idle";
  return (
    <div
      className={cn(
        "cq-boss",
        fallen && "cq-boss--fallen",
        hit && "cq-shake",
        className,
      )}
      data-boss-clip={clip}
      style={{ width: size }}
    >
      <Sprite
        key={clip}
        src={bossStrip(artKey, clip)}
        size={size}
        label={name}
      />
      {hit ? (
        <span aria-hidden="true">
          <span
            className="cq-fx-slash"
            style={{ left: size * 0.15, top: size * 0.4 }}
          />
          <span
            className="cq-fx-burst"
            style={{ left: size * 0.25, top: size * 0.3 }}
          />
          <span className="cq-dmg" style={{ right: 0, top: size * 0.15 }}>
            -{hit}
          </span>
        </span>
      ) : null}
    </div>
  );
}
