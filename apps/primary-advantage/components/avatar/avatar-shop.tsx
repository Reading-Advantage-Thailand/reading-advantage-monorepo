"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LockIcon } from "lucide-react";
import { avatarSlotSchema, type AvatarShopItem, type AvatarSlot } from "@reading-advantage/game-contracts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pieceName } from "./piece-name";

const SLOTS = avatarSlotSchema.options;

/**
 * The shop (FR-5): every piece the catalog has, in the server's popularity order, with a slot
 * filter; a locked tier shows its level; a purchase goes through `POST /api/v1/avatar/purchase`.
 * @param props.items The shop list.
 * @param props.gp The GP balance.
 * @returns The shop body.
 */
export function AvatarShop({ items: initial, gp: initialGp }: { items: AvatarShopItem[]; gp: number }) {
  const t = useTranslations("Avatar");
  const [items, setItems] = useState(initial);
  const [gp, setGp] = useState(initialGp);
  const [slot, setSlot] = useState<AvatarSlot | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = items.filter((item) => slot === "all" || item.slot === slot);

  const buy = (itemId: string, dye?: string) => {
    setError(null);
    start(async () => {
      const response = await fetch("/api/v1/avatar/purchase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dye ? { itemId, dye } : { itemId }) });
      const body = (await response.json().catch(() => ({}))) as { error?: string; gp?: number };
      if (!response.ok) return setError(body.error === "INSUFFICIENT_GP" ? t("shop.notEnough") : t("shop.shopError"));
      setGp(body.gp ?? gp);
      setItems((list) => list.map((item) => (item.id !== itemId ? item : dye ? { ...item, ownedDyes: [...item.ownedDyes, dye] } : { ...item, owned: true })));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-2xl font-bold tabular-nums" aria-live="polite">
        {t("shop.gp", { gp })}
      </p>
      <div role="radiogroup" aria-label={t("shop.allSlots")} className="flex flex-wrap gap-2">
        {(["all", ...SLOTS] as const).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={slot === s} onClick={() => setSlot(s)} className={cn("min-h-11 rounded-full border px-4 text-sm font-medium", slot === s ? "bg-primary text-primary-foreground border-primary" : "bg-card")}>
            {s === "all" ? t("shop.allSlots") : t(`pieceSlots.${s}`)}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item) => (
          <li key={item.id} className="bg-card flex flex-col gap-2 rounded-2xl border p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="text-base font-semibold">{pieceName(item.id)}</span>
              <span className="text-muted-foreground text-xs">{t(`pieceSlots.${item.slot}`)}</span>
            </div>
            {!item.unlocked ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-sm [&>svg]:size-4">
                <LockIcon aria-hidden="true" />
                {t("shop.locked", { level: item.levelRequired })}
              </span>
            ) : item.owned ? (
              <span className="text-brand-700 dark:text-brand-300 text-sm font-medium">{t("shop.owned")}</span>
            ) : (
              <Button type="button" disabled={pending} onClick={() => buy(item.id)} className="min-h-11 rounded-xl">
                {item.price === 0 ? t("shop.free") : t("shop.buy", { gp: item.price })}
              </Button>
            )}
            {item.unlocked && item.owned && item.dyes.length ? (
              <div className="flex flex-wrap gap-2">
                {item.dyes.map((dye) =>
                  item.ownedDyes.includes(dye) ? (
                    <span key={dye} className="text-muted-foreground rounded-full border px-3 py-1 text-xs">
                      {dye} · {t("shop.owned")}
                    </span>
                  ) : (
                    <Button key={dye} type="button" size="sm" variant="outline" disabled={pending} onClick={() => buy(item.id, dye)} className="min-h-9 rounded-full">
                      {t("shop.buyDye", { dye, gp: item.price })}
                    </Button>
                  ),
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
