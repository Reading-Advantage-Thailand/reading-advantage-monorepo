"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AVATAR_CATALOG } from "@reading-advantage/avatar-kit";
import { avatarSlotSchema, type AvatarInventoryItem, type AvatarLoadout, type AvatarSlot, type AvatarState } from "@reading-advantage/game-contracts";
import { Coins, Panel, Plaque, RpgButton, RpgLink, Sign } from "@/components/rpg/chrome";
import { ItemIcon } from "@/components/rpg/item-icon";
import { ART, slotArt } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "./portrait-canvas";
import { dyeColor } from "./colors";
import { pieceName } from "./piece-name";

/** The slots in the order the paper-doll shows them: five on the left, five on the right. */
const SLOTS = avatarSlotSchema.options;

/** Pieces per drawer page. */
export const DRAWER_PAGE = 8;

/**
 * The avatar page as a paper-doll in the treasure vault (docs/primary-rpg-skin.md §4): the hero
 * in the centre, the ten slot icons around it, and a drawer of the owned pieces of the tapped
 * slot, eight per page. A tap wears a piece through `POST /api/v1/avatar/loadout`.
 * @param props.state The avatar state with a saved profile.
 * @returns The page body.
 */
export function AvatarHome({ state }: { state: AvatarState & { profile: NonNullable<AvatarState["profile"]> } }) {
  const t = useTranslations("Avatar");
  const [loadout, setLoadout] = useState<AvatarLoadout>(state.loadout);
  const [slot, setSlot] = useState<AvatarSlot | null>(null);
  const [page, setPage] = useState(0);
  const [pop, setPop] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pieces = Object.values(loadout);
  const ownedOf = (s: AvatarSlot): AvatarInventoryItem[] => state.inventory.filter((item) => AVATAR_CATALOG[item.itemId]?.slot === s);

  const wear = (s: AvatarSlot, itemId: string | null, dye: string | null) => {
    setError(null);
    start(async () => {
      const response = await fetch("/api/v1/avatar/loadout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slot: s, itemId, dye }) });
      if (!response.ok) return setError(t("shop.shopError"));
      setLoadout(((await response.json()) as { loadout: AvatarLoadout }).loadout);
      setPop((n) => n + 1);
    });
  };
  const open = (s: AvatarSlot) => {
    setSlot((current) => (current === s ? null : s));
    setPage(0);
  };

  const slotButton = (s: AvatarSlot) => {
    const worn = loadout[s];
    const count = ownedOf(s).length;
    return (
      <button key={s} type="button" aria-pressed={slot === s} aria-label={t(`pieceSlots.${s}`)} title={worn ? pieceName(worn.itemId) : t("shop.empty")} onClick={() => open(s)} className="cq-slot">
        {worn ? <ItemIcon itemId={worn.itemId} slot={s} /> : <img src={slotArt(s)} alt="" className="opacity-60" />}
        {count ? <span className="cq-slot-count" aria-hidden="true">{count}</span> : null}
      </button>
    );
  };

  const drawerItems = slot ? ownedOf(slot) : [];
  const pages = Math.max(1, Math.ceil(drawerItems.length / DRAWER_PAGE));
  const shown = drawerItems.slice(page * DRAWER_PAGE, page * DRAWER_PAGE + DRAWER_PAGE);
  const worn = slot ? loadout[slot] : undefined;
  const drawerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (slot) drawerRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [slot]);

  return (
    <div className="flex flex-col gap-5" data-avatar-home>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Coins gp={state.gp} label={t("shop.gp", { gp: state.gp })} />
        <Plaque icon={ART.shield} label={t("shop.level", { level: state.level })}>
          {state.level}
        </Plaque>
      </div>
      <Panel pinned className="pt-6">
        <div className="cq-doll" role="group" aria-label={t("shop.wearing")}>
          {SLOTS.slice(0, 5).map(slotButton)}
          <figure className="cq-doll-hero flex flex-col items-center">
            <div key={pop} className={cn("cq-beam w-44 sm:w-56", pop > 0 && "cq-pop")}>
              <AvatarPortrait classId={state.profile.classId} pieces={pieces} tints={state.profile.tints} alt={t("preview")} className="cq-shadowed" />
            </div>
            <figcaption className="cq-muted text-sm">{slot ? t("shop.drawer", { slot: t(`pieceSlots.${slot}`) }) : t("shop.pickSlot")}</figcaption>
          </figure>
          {SLOTS.slice(5).map(slotButton)}
        </div>
      </Panel>
      {error ? (
        <p role="alert" className="cq-on-scene text-sm font-semibold">
          {error}
        </p>
      ) : null}
      {slot ? (
        <Panel ref={drawerRef} aria-label={t("shop.drawer", { slot: t(`pieceSlots.${slot}`) })} data-drawer={slot} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Sign small>{t("shop.drawer", { slot: t(`pieceSlots.${slot}`) })}</Sign>
            {worn ? (
              <RpgButton tone="iron" small disabled={pending} onClick={() => wear(slot, null, null)}>
                {t("shop.remove")}
              </RpgButton>
            ) : null}
          </div>
          {shown.length ? (
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {shown.map((item) => {
                const isWorn = worn?.itemId === item.itemId && (worn?.dye ?? null) === item.dye;
                const color = item.dye ? dyeColor(item.itemId, item.dye) : null;
                return (
                  <li key={`${item.itemId}:${item.dye ?? ""}`}>
                    <button type="button" aria-pressed={isWorn} disabled={pending} onClick={() => wear(slot, isWorn ? null : item.itemId, item.dye)} className="cq-item w-full">
                      <ItemIcon itemId={item.itemId} slot={slot} />
                      <span className="cq-item-name">
                        {pieceName(item.itemId)}
                        {item.dye ? ` · ${item.dye}` : ""}
                      </span>
                      {color ? <span className="cq-pot" style={{ backgroundColor: color }} aria-hidden="true" /> : null}
                      {isWorn ? <span className="cq-item-lock">{t("shop.wornBadge")}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="cq-muted text-sm">{t("shop.empty")}</p>
          )}
          {pages > 1 ? (
            <nav className="cq-pager" aria-label={t("shop.page", { n: page + 1, total: pages })}>
              <RpgButton tone="iron" small disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {t("shop.prevPage")}
              </RpgButton>
              <span>{t("shop.page", { n: page + 1, total: pages })}</span>
              <RpgButton tone="iron" small disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                {t("shop.nextPage")}
              </RpgButton>
            </nav>
          ) : null}
        </Panel>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <RpgLink href="/student/avatar/shop" tone="gold">
          <img src={ART.chest} alt="" />
          {t("shop.shopLink")}
        </RpgLink>
        <RpgLink href="/student/avatar?from=me" tone="iron">
          {t("shop.changeHero")}
        </RpgLink>
      </div>
    </div>
  );
}
