"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Gem } from "./chrome";

const XP_AWARDED = "primary:xp-awarded";

/**
 * Tells the header XP gem that the server awarded XP (a saved game run).
 * @param xp The awarded XP.
 */
export function announceXp(xp: number): void {
  window.dispatchEvent(new CustomEvent(XP_AWARDED, { detail: xp }));
}

/**
 * The header XP gem: the server value plus the XP awarded since the page loaded. Without it the
 * header showed the new XP only after a reload (tech debt 2026-10-20).
 * @param props.xp The XP of the server render.
 * @param props.className Extra classes.
 * @returns The chip.
 */
export function LiveGem({ xp, className }: { xp: number; className?: string }) {
  const t = useTranslations("AppShell");
  const [added, setAdded] = useState(0);
  // A new server value already counts the awarded XP.
  useEffect(() => setAdded(0), [xp]);
  useEffect(() => {
    const onAwarded = (event: Event) => {
      const n = (event as CustomEvent<unknown>).detail;
      if (typeof n === "number" && Number.isFinite(n) && n > 0) setAdded((a) => a + n);
    };
    window.addEventListener(XP_AWARDED, onAwarded);
    return () => window.removeEventListener(XP_AWARDED, onAwarded);
  }, []);
  const total = xp + added;
  return <Gem xp={total} label={t("xp", { xp: total })} className={className} />;
}
