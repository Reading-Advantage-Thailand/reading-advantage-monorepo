"use client";

import type { ComponentProps, CSSProperties } from "react";
import type {
  RpgCosmetic,
  RpgCosmeticId,
} from "@reading-advantage/game-contracts";

import {
  getRetroArcadeButtonStyle,
  RETRO_ARCADE_PANEL_STYLE,
} from "./retro-arcade-theme.js";
import type { RpgRewardAssetUrls } from "./rpg-reward-panel.js";
import { RPG_REWARD_REQUIRED_CREDIT } from "./rpg-reward-assets.js";

/** Props for the confirmed RPG unlock notice. */
export type RpgUnlockNoticeProps = Omit<ComponentProps<"section">, "children"> & {
  /** Cosmetics confirmed as new after the current saved completion. */
  readonly cosmetics: readonly RpgCosmetic[];
  /** Reviewed icon URLs supplied by the host asset system. */
  readonly assetUrls: RpgRewardAssetUrls;
  /** Cosmetic waiting for equipment confirmation. */
  readonly pendingCosmeticId?: RpgCosmeticId | null;
  /** Current refresh or equipment failure. */
  readonly failureMessage?: string | null;
  /** Requests equipment for one confirmed cosmetic. */
  readonly onEquip: (cosmeticId: RpgCosmeticId) => void;
  /** Retries the current failed request. */
  readonly onRetry?: () => void;
};

const rewardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "64px minmax(0, 1fr)",
  gap: "0.75rem",
  alignItems: "center",
  border: "2px solid var(--apk-reward-border, #31577d)",
  background: "var(--apk-reward-card, #101d32)",
  padding: "0.75rem",
};

/**
 * Renders only cosmetic unlocks confirmed after a saved completion.
 * @param props Confirmed cosmetics, reviewed icons, request state, and RPG actions.
 * @returns A compact arcade result notice with equipment and retry controls.
 */
export function RpgUnlockNotice({
  cosmetics,
  assetUrls,
  pendingCosmeticId = null,
  failureMessage = null,
  onEquip,
  onRetry,
  style,
  ...sectionProps
}: RpgUnlockNoticeProps): import("react").ReactElement {
  const heading = cosmetics.length > 0 ? "New Wizard rewards" : "Wizard rewards";
  return (
    <section
      {...sectionProps}
      aria-label={heading}
      data-apk-presentation="rpg-unlock-notice"
      data-apk-region="progression"
      style={{
        ...RETRO_ARCADE_PANEL_STYLE,
        display: "grid",
        gap: "0.75rem",
        background: "var(--apk-reward-background, #060b18)",
        color: "var(--apk-reward-text, #f7f2d0)",
        fontFamily: "var(--apk-reward-body-font, Tahoma, 'Noto Sans Thai', sans-serif)",
        padding: "clamp(0.75rem, 2vw, 1rem)",
        ...style,
      }}
    >
      <h2 style={{ margin: 0, fontFamily: "var(--apk-reward-display-font, 'Courier New', monospace)" }}>{heading}</h2>
      {failureMessage ? (
        <div role="alert" style={{ border: "2px solid #f87171", padding: "0.75rem" }}>
          <p style={{ margin: 0 }}>{failureMessage}</p>
          {onRetry ? (
            <button type="button" onClick={onRetry} style={{ ...getRetroArcadeButtonStyle("secondary"), marginBlockStart: "0.75rem" }}>
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
      <ul style={{ display: "grid", gap: "0.75rem", listStyle: "none", margin: 0, padding: 0 }}>
        {cosmetics.map((cosmetic) => {
          const pending = pendingCosmeticId === cosmetic.id;
          return (
            <li key={cosmetic.id} data-rpg-cosmetic={cosmetic.id} style={rewardStyle}>
              <img
                src={assetUrls[cosmetic.id]}
                alt=""
                width={64}
                height={64}
                style={{ imageRendering: "pixelated", inlineSize: "64px", blockSize: "64px" }}
              />
              <div style={{ minInlineSize: 0 }}>
                <h3 style={{ margin: 0 }}>{cosmetic.name}</h3>
                <p style={{ margin: "0.25rem 0", color: "var(--apk-reward-accent, #67e8f9)" }}>Unlocked</p>
                <button
                  type="button"
                  disabled={cosmetic.equipped || pending || pendingCosmeticId !== null}
                  aria-pressed={cosmetic.equipped}
                  aria-label={`${cosmetic.equipped ? "Equipped" : pending ? "Equipping" : "Equip"} ${cosmetic.name}`}
                  aria-busy={pending || undefined}
                  onClick={() => onEquip(cosmetic.id)}
                  style={getRetroArcadeButtonStyle(cosmetic.equipped ? "secondary" : "primary")}
                >
                  {cosmetic.equipped ? "Equipped" : pending ? "Equipping…" : "Equip"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <small>{RPG_REWARD_REQUIRED_CREDIT}</small>
    </section>
  );
}
