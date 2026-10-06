"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  avatarSlotSchema,
  type AvatarLoadout,
  type AvatarLoadoutPiece,
  type AvatarProfile,
  type AvatarShopItem,
  type AvatarSlot,
} from "@reading-advantage/game-contracts";
import { Bubble, Coins, Panel, RpgButton, Sign } from "@/components/rpg/chrome";
import { ItemIcon } from "@/components/rpg/item-icon";
import { Sprite } from "@/components/rpg/sprite";
import { ART, NPC_ART } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "./portrait-canvas";
import { dyeColor } from "./colors";
import { pieceName } from "./piece-name";

const SLOTS = avatarSlotSchema.options;

/** Items per shelf and shelves per page. */
export const SHELF_SIZE = 6;
export const SHELVES_PER_PAGE = 2;

/**
 * The loadout with one piece swapped in, for the try-on preview.
 * @param loadout The worn pieces.
 * @param item The piece to try.
 * @param dye The dye to try, or null.
 * @returns The pieces to compose.
 */
export function tryOnPieces(
  loadout: AvatarLoadout,
  item: Pick<AvatarShopItem, "id" | "slot" | "twoHanded">,
  dye: string | null,
): AvatarLoadoutPiece[] {
  const next: Partial<Record<AvatarSlot, AvatarLoadoutPiece>> = {
    ...loadout,
    [item.slot]: { itemId: item.id, dye },
  };
  if (item.twoHanded) delete next.offhand;
  return Object.values(next).filter((p): p is AvatarLoadoutPiece => Boolean(p));
}

/**
 * The armory (docs/primary-rpg-skin.md §4): the blacksmith at the counter, the slot signs, two
 * shelves of six pieces per page, and a try-on card with the hero wearing the tapped piece, the
 * dyes as paint pots, and Buy. A purchase goes through `POST /api/v1/avatar/purchase`; coins fly
 * to the counter and the blacksmith nods.
 * @param props.items The shop list in the server's order.
 * @param props.gp The GP balance.
 * @param props.profile The student's avatar, for the try-on preview.
 * @param props.loadout The worn pieces, for the try-on preview.
 * @returns The shop body.
 */
export function AvatarShop({
  items: initial,
  gp: initialGp,
  profile,
  loadout,
}: {
  items: AvatarShopItem[];
  gp: number;
  profile: AvatarProfile;
  loadout: AvatarLoadout;
}) {
  const t = useTranslations("Avatar");
  const [items, setItems] = useState(initial);
  const [gp, setGp] = useState(initialGp);
  const [slot, setSlot] = useState<AvatarSlot | "all">("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dye, setDye] = useState<string | null>(null);
  const [flight, setFlight] = useState(0);
  const [line, setLine] = useState<"greeting" | "thanks">("greeting");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const listed = items.filter((item) => slot === "all" || item.slot === slot);
  const perPage = SHELF_SIZE * SHELVES_PER_PAGE;
  const pages = Math.max(1, Math.ceil(listed.length / perPage));
  const shown = listed.slice(page * perPage, page * perPage + perPage);
  const shelves = Array.from(
    { length: Math.ceil(shown.length / SHELF_SIZE) },
    (_, i) => shown.slice(i * SHELF_SIZE, i * SHELF_SIZE + SHELF_SIZE),
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selectedId)
      cardRef.current?.scrollIntoView?.({
        block: "nearest",
        behavior: "smooth",
      });
  }, [selectedId]);

  const filter = (s: AvatarSlot | "all") => {
    setSlot(s);
    setPage(0);
    setSelectedId(null);
  };
  const select = (item: AvatarShopItem) => {
    setSelectedId((id) => (id === item.id ? null : item.id));
    setDye(null);
    setError(null);
  };
  const buy = (itemId: string, chosenDye?: string) => {
    setError(null);
    start(async () => {
      const response = await fetch("/api/v1/avatar/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          chosenDye ? { itemId, dye: chosenDye } : { itemId },
        ),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        gp?: number;
      };
      if (!response.ok)
        return setError(
          body.error === "INSUFFICIENT_GP"
            ? t("shop.notEnough")
            : t("shop.shopError"),
        );
      setGp(body.gp ?? gp);
      setItems((list) =>
        list.map((item) =>
          item.id !== itemId
            ? item
            : chosenDye
              ? { ...item, ownedDyes: [...item.ownedDyes, chosenDye] }
              : { ...item, owned: true },
        ),
      );
      setFlight((n) => n + 1);
      setLine("thanks");
    });
  };

  const price = selected ? selected.price : 0;
  const dyeOwned = Boolean(selected && dye && selected.ownedDyes.includes(dye));
  const canBuy = Boolean(
    selected &&
    selected.unlocked &&
    (dye ? selected.owned && !dyeOwned : !selected.owned),
  );

  return (
    <div className="flex flex-col gap-3" data-avatar-shop>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="cq-counter flex-1">
          <div key={flight} className={cn(flight > 0 && "cq-nod")}>
            <Sprite
              src={
                line === "thanks" && flight > 0
                  ? NPC_ART.blacksmithTalk
                  : NPC_ART.blacksmithIdle
              }
              size={128}
              label={t("shop.armorer")}
              className="cq-shadowed"
            />
          </div>
          <Bubble role="status">{t(`shop.${line}`)}</Bubble>
        </div>
        <Coins gp={gp} label={t("shop.gp", { gp })} />
      </div>
      <div
        role="radiogroup"
        aria-label={t("shop.allSlots")}
        className="cq-signs"
      >
        {(["all", ...SLOTS] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={slot === s}
            onClick={() => filter(s)}
            className={cn(
              "cq-sign cq-sign--small min-h-11",
              slot === s && "cq-sign--active",
            )}
          >
            {s === "all" ? t("shop.all") : t(`pieceSlots.${s}`)}
          </button>
        ))}
      </div>
      {shelves.map((shelf, i) => (
        <div key={i} className="cq-shelf">
          <ul className="cq-shelf-items">
            {shelf.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={selectedId === item.id}
                  onClick={() => select(item)}
                  className={cn(
                    "cq-item w-full",
                    item.owned && "cq-item--owned",
                    !item.unlocked && "cq-item--locked",
                  )}
                >
                  {item.unlocked ? (
                    <ItemIcon itemId={item.id} slot={item.slot} />
                  ) : (
                    <img src={ART.lockedChest} alt="" />
                  )}
                  <span className="cq-item-name">{pieceName(item.id)}</span>
                  {!item.unlocked ? (
                    <span className="cq-item-lock">
                      {t("shop.locked", { level: item.levelRequired })}
                    </span>
                  ) : item.owned ? (
                    <span className="cq-item-price">{t("shop.owned")}</span>
                  ) : (
                    <span className="cq-item-price">
                      <img src={ART.coin} alt="" />
                      {item.price === 0 ? t("shop.free") : item.price}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {listed.length === 0 ? (
        <p className="cq-on-scene text-sm">{t("shop.empty")}</p>
      ) : null}
      {pages > 1 ? (
        <nav
          className="cq-pager cq-on-scene"
          aria-label={t("shop.shelf", { n: page + 1, total: pages })}
        >
          <RpgButton
            tone="iron"
            small
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("shop.prevShelf")}
          </RpgButton>
          <span>{t("shop.shelf", { n: page + 1, total: pages })}</span>
          <RpgButton
            tone="iron"
            small
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("shop.nextShelf")}
          </RpgButton>
        </nav>
      ) : null}
      {selected ? (
        <Panel
          ref={cardRef}
          pinned
          aria-label={t("shop.tryOn")}
          data-try-on={selected.id}
          className="relative"
        >
          <div className="cq-tryon">
            <div className="cq-beam w-32 sm:w-40">
              <AvatarPortrait
                classId={profile.classId}
                pieces={tryOnPieces(loadout, selected, dye)}
                tints={profile.tints}
                alt={t("shop.tryOn")}
                className="cq-shadowed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-lg font-bold">
                {pieceName(selected.id)}{" "}
                <small className="cq-muted text-xs font-medium">
                  · {t(`pieceSlots.${selected.slot}`)} ·{" "}
                  {t("shop.tier", { tier: selected.tier })}
                </small>
              </h3>
              {selected.dyes.length ? (
                <div
                  role="radiogroup"
                  aria-label={t("shop.dyes")}
                  className="flex flex-wrap items-center gap-2"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={dye === null}
                    aria-label={t("shop.noDye")}
                    onClick={() => setDye(null)}
                    className="cq-pot !h-10 !w-10 bg-transparent"
                  />
                  {selected.dyes.map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={dye === d}
                      aria-label={
                        selected.ownedDyes.includes(d)
                          ? `${d} · ${t("shop.owned")}`
                          : d
                      }
                      onClick={() => setDye(d)}
                      className="cq-pot !h-10 !w-10"
                      style={{
                        backgroundColor: dyeColor(selected.id, d) ?? "#888",
                      }}
                    />
                  ))}
                </div>
              ) : null}
              {error ? (
                <p
                  role="alert"
                  className="text-destructive text-sm font-semibold"
                >
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                {!selected.unlocked ? (
                  <Sign small>
                    {t("shop.locked", { level: selected.levelRequired })}
                  </Sign>
                ) : canBuy ? (
                  <RpgButton
                    tone="gold"
                    disabled={pending}
                    onClick={() => buy(selected.id, dye ?? undefined)}
                  >
                    <img src={ART.coin} alt="" />
                    {price === 0
                      ? t("shop.free")
                      : dye
                        ? t("shop.buyDye", { dye, gp: price })
                        : t("shop.buy", { gp: price })}
                  </RpgButton>
                ) : (
                  <Sign small>{t("shop.owned")}</Sign>
                )}
                {canBuy && price > 0 ? (
                  <span className="cq-muted text-sm">
                    {gp >= price
                      ? t("shop.youKeep", { gp: gp - price })
                      : t("shop.notEnough")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {flight > 0 ? (
            <span key={flight} aria-hidden="true">
              <span className="cq-coin-fly" style={{ right: 40, bottom: 30 }} />
              <span
                className="cq-coin-fly"
                style={{ right: 60, bottom: 24, animationDelay: ".1s" }}
              />
              <span
                className="cq-coin-fly"
                style={{ right: 50, bottom: 40, animationDelay: ".2s" }}
              />
            </span>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
