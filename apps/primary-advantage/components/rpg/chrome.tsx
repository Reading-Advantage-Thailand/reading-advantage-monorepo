import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ART } from "@/lib/rpg/places";
import { cn } from "@/lib/utils";

/**
 * A parchment panel.
 * @param props Section props; `pinned` adds the notice pin; `dark` uses the dark leather look.
 * @returns The panel.
 */
export function Panel({ className, pinned, dark, children, ...rest }: ComponentProps<"section"> & { pinned?: boolean; dark?: boolean }) {
  return (
    <section className={cn("cq-panel flex flex-col gap-3", pinned && "cq-pin", dark && "cq-panel--dark", className)} {...rest}>
      {children}
    </section>
  );
}

/**
 * A plank sign: a wooden title or a tab.
 * @param props.small True for the tab size.
 * @param props.active True for the selected tab.
 * @returns The sign.
 */
export function Sign({ className, small, active, children, ...rest }: ComponentProps<"span"> & { small?: boolean; active?: boolean }) {
  return (
    <span className={cn("cq-sign", small && "cq-sign--small", active && "cq-sign--active", className)} {...rest}>
      {children}
    </span>
  );
}

/**
 * A hanging banner title over a panel.
 * @param props.blue True for the blue banner.
 * @returns The banner in its wrapper.
 */
export function Banner({ className, blue, children, ...rest }: ComponentProps<"span"> & { blue?: boolean }) {
  return (
    <div className="cq-banner-wrap">
      <span className={cn("cq-banner", blue && "cq-banner--blue", className)} {...rest}>
        {children}
      </span>
    </div>
  );
}

/**
 * The wood-and-iron meter with a filling bar and a lighter pending segment.
 * @param props.value The committed amount.
 * @param props.pending The amount in flight (shown lighter), 0 when none.
 * @param props.max The target.
 * @param props.label The accessible name.
 * @param props.tone The fill colour.
 * @param props.thin True for the 16 px bar.
 * @returns The meter.
 */
export function Meter({ value, pending = 0, max, label, tone = "red", thin, className }: { value: number; pending?: number; max: number; label: string; tone?: "red" | "green" | "gold" | "blue"; thin?: boolean; className?: string }) {
  const pct = (n: number) => (max > 0 ? `${Math.min(100, Math.max(0, (n / max) * 100))}%` : "0%");
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, value)}
      className={cn("cq-meter", tone !== "red" && `cq-meter--${tone}`, thin && "cq-meter--thin", className)}
      style={{ "--value": pct(value), "--pending": pct(value + pending) } as React.CSSProperties}
    >
      <div className="cq-pending" />
      <div className="cq-fill" />
    </div>
  );
}

/**
 * Five hearts (or `max`), the lost ones dark.
 * @param props.hp The hearts left.
 * @param props.max The hearts in all.
 * @param props.label The accessible name.
 * @returns The hearts.
 */
export function Hearts({ hp, max = 5, label }: { hp: number; max?: number; label: string }) {
  return (
    <span className="cq-hearts" role="img" aria-label={label}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={cn("cq-heart", i >= hp && "cq-heart--lost")} aria-hidden="true" />
      ))}
    </span>
  );
}

/**
 * The coin purse chip: a Forge gold coin and the GP count.
 * @param props.gp The balance.
 * @param props.label The accessible name.
 * @returns The chip.
 */
export function Coins({ gp, label, className }: { gp: number; label: string; className?: string }) {
  return (
    <span className={cn("cq-coins tabular-nums", className)} aria-label={label} title={label}>
      <img src={ART.coin} alt="" />
      {gp.toLocaleString()}
    </span>
  );
}

/**
 * The XP gem chip.
 * @param props.xp The XP.
 * @param props.label The accessible name.
 * @returns The chip.
 */
export function Gem({ xp, label, className }: { xp: number; label: string; className?: string }) {
  return (
    <span className={cn("cq-gem tabular-nums", className)} aria-label={label} title={label}>
      <img src={ART.gem} alt="" />
      {xp.toLocaleString()}
    </span>
  );
}

/** The button looks: wood for an action, gold for the one primary action, iron for a way out. */
export type RpgTone = "wood" | "gold" | "iron";

/**
 * The classes of a skin button.
 * @param tone The look.
 * @param small True for the 40 px size.
 * @returns The class list.
 */
export function rpgButton(tone: RpgTone = "wood", small?: boolean): string {
  return cn("cq-btn", tone === "gold" && "cq-btn--gold", tone === "iron" && "cq-btn--iron", small && "cq-btn--small");
}

/**
 * A skin link that looks like a button (48 px).
 * @param props The link props plus the tone and the small flag.
 * @returns The link.
 */
export function RpgLink({ tone = "wood", small, className, children, ...rest }: ComponentProps<typeof Link> & { tone?: RpgTone; small?: boolean }) {
  return (
    <Link className={cn(rpgButton(tone, small), "min-h-12", className)} {...rest}>
      {children}
    </Link>
  );
}

/**
 * A skin button (48 px).
 * @param props The button props plus the tone and the small flag.
 * @returns The button.
 */
export function RpgButton({ tone = "wood", small, className, type = "button", children, ...rest }: ComponentProps<"button"> & { tone?: RpgTone; small?: boolean }) {
  return (
    <button type={type} className={cn(rpgButton(tone, small), "min-h-12", className)} {...rest}>
      {children}
    </button>
  );
}

/**
 * A stat plaque: a Forge icon, a number, and a label on a wooden tile.
 * @param props.icon The Forge image.
 * @param props.label The label.
 * @param props.children The value.
 * @returns The plaque.
 */
export function Plaque({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="cq-plaque">
      <img src={icon} alt="" />
      <b>{children}</b>
      <small>{label}</small>
    </div>
  );
}

/**
 * A speech line from an NPC.
 * @returns The bubble.
 */
export function Bubble({ className, children, ...rest }: ComponentProps<"span">) {
  return (
    <span className={cn("cq-bubble", className)} {...rest}>
      {children}
    </span>
  );
}
