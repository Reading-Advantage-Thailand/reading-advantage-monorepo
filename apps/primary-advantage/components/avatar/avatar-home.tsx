"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBagIcon, WandSparklesIcon } from "lucide-react";
import { AVATAR_CATALOG } from "@reading-advantage/avatar-kit";
import { avatarSlotSchema, type AvatarLoadout, type AvatarSlot, type AvatarState } from "@reading-advantage/game-contracts";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "./portrait-canvas";
import { pieceName } from "./piece-name";

/** The slots in the order the page lists them. */
const SLOTS = avatarSlotSchema.options;

/**
 * The avatar page (FR-5): the portrait of the worn pieces, the GP balance, and one row per slot
 * with the owned pieces to wear or take off. Changes go through `POST /api/v1/avatar/loadout`.
 * @param props.state The avatar state with a saved profile.
 * @returns The page body.
 */
export function AvatarHome({ state }: { state: AvatarState & { profile: NonNullable<AvatarState["profile"]> } }) {
  const t = useTranslations("Avatar");
  const [loadout, setLoadout] = useState<AvatarLoadout>(state.loadout);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pieces = Object.values(loadout);

  const wear = (slot: AvatarSlot, itemId: string | null, dye: string | null) => {
    setError(null);
    start(async () => {
      const response = await fetch("/api/v1/avatar/loadout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slot, itemId, dye }) });
      if (!response.ok) return setError(t("shop.shopError"));
      setLoadout(((await response.json()) as { loadout: AvatarLoadout }).loadout);
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
      <figure className="flex flex-col items-center gap-3">
        <AvatarPortrait classId={state.profile.classId} pieces={pieces} tints={state.profile.tints} alt={t("preview")} className="max-w-72 rounded-2xl" />
        <figcaption className="flex flex-col items-center gap-1">
          <span className="text-2xl font-bold tabular-nums">{t("shop.gp", { gp: state.gp })}</span>
          <span className="text-muted-foreground text-sm">{t("shop.level", { level: state.level })}</span>
        </figcaption>
        <Link href="/student/avatar/shop" className="bg-primary text-primary-foreground inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-base font-semibold [&>svg]:size-5">
          <ShoppingBagIcon aria-hidden="true" />
          {t("shop.shopLink")}
        </Link>
        <Link href="/student/avatar?from=me" className="text-muted-foreground hover:text-foreground inline-flex min-h-12 items-center gap-2 text-sm font-medium underline [&>svg]:size-4">
          <WandSparklesIcon aria-hidden="true" />
          {t("shop.changeHero")}
        </Link>
      </figure>
      <section aria-label={t("shop.wearing")} className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        {SLOTS.map((slot) => {
          const owned = state.inventory.filter((item) => AVATAR_CATALOG[item.itemId]?.slot === slot);
          const worn = loadout[slot];
          return (
            <fieldset key={slot} className="bg-card flex flex-col gap-2 rounded-2xl border p-4 shadow-sm">
              <legend className="px-1 text-base font-semibold">{t(`pieceSlots.${slot}`)}</legend>
              <p className="text-muted-foreground text-sm">
                {t("shop.wearing")}: {worn ? `${pieceName(worn.itemId)}${worn.dye ? ` (${worn.dye})` : ""}` : t("shop.empty")}
              </p>
              <div className="flex flex-wrap gap-2">
                {owned.map((item) => {
                  const isWorn = worn?.itemId === item.itemId && (worn?.dye ?? null) === item.dye;
                  return (
                    <Button
                      key={`${item.itemId}:${item.dye ?? ""}`}
                      type="button"
                      variant={isWorn ? "default" : "outline"}
                      disabled={pending}
                      aria-pressed={isWorn}
                      onClick={() => wear(slot, isWorn ? null : item.itemId, item.dye)}
                      className={cn("min-h-11 rounded-xl")}
                    >
                      {pieceName(item.itemId)}
                      {item.dye ? ` · ${item.dye}` : ""}
                      {isWorn ? ` · ${t("shop.remove")}` : ""}
                    </Button>
                  );
                })}
                {owned.length === 0 ? <span className="text-muted-foreground text-sm">{t("shop.empty")}</span> : null}
              </div>
            </fieldset>
          );
        })}
      </section>
    </div>
  );
}
