"use client";

import type { ComponentProps, CSSProperties } from "react";
import type {
  RpgCosmeticId,
  StudentRpgState,
} from "@reading-advantage/game-contracts";

import {
  getRetroArcadeButtonStyle,
  RETRO_ARCADE_PANEL_STYLE,
} from "./retro-arcade-theme.js";
import { rpgFailureText, rpgRewardText, type RpgRewardLabelsInput } from "./rpg-reward-labels.js";
import { STANDARD_GAME_REQUIRED_CREDIT } from "./standard-game-experience.js";

/** Asset URLs for the reviewed staff icons. */
export type RpgRewardAssetUrls = Readonly<Record<RpgCosmeticId, string>>;

/** Props for the shared server-confirmed RPG reward panel. */
export type RpgRewardPanelProps = Omit<ComponentProps<"section">, "children"> & {
  /** Current RPG state returned by the authenticated server route. */
  readonly state: StudentRpgState;
  /** Reviewed staff icon URLs supplied by the host asset system. */
  readonly assetUrls: RpgRewardAssetUrls;
  /** Cosmetic currently waiting for server equip confirmation. */
  readonly pendingCosmeticId?: RpgCosmeticId | null;
  /** Current request failure while the last confirmed state remains visible. */
  readonly failureMessage?: string | null;
  /** Retries the failed state or equip request. */
  readonly onRetry?: () => void;
  /** Requests server equipment of one unlocked cosmetic. Unused when `inventoryNote` is set. */
  readonly onEquip?: (cosmeticId: RpgCosmeticId) => void;
  /** Shown under an unlocked reward in place of the equip action, on hosts where a reward is an avatar piece in the inventory. */
  readonly inventoryNote?: string;
  /** Visible panel heading (default: the `heading` label). */
  readonly heading?: string;
  /** The panel text in the host language; each missing label stays English. */
  readonly labels?: RpgRewardLabelsInput;
  /** Asset credit under the list (default: the ElvGames credit of the reviewed icons); null when the host icons need none. */
  readonly credit?: string | null;
};

const rewardCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "80px minmax(0, 1fr)",
  gap: "0.75rem",
  alignItems: "start",
  border: "2px solid var(--apk-reward-border, #31577d)",
  background: "var(--apk-reward-card, #101d32)",
  boxShadow: "4px 4px 0 var(--apk-reward-shadow, #030712)",
  padding: "0.75rem",
};

/**
 * Renders confirmed cosmetic unlocks, quest requirements, and equipment actions.
 * @param props Confirmed RPG state, reviewed icon URLs, request state, host callbacks, and the panel text.
 * @returns A host-neutral reward panel for entry and result screens.
 */
export function RpgRewardPanel({
  state,
  assetUrls,
  pendingCosmeticId = null,
  failureMessage = null,
  onRetry,
  onEquip,
  inventoryNote,
  heading,
  labels,
  credit = STANDARD_GAME_REQUIRED_CREDIT,
  style,
  ...sectionProps
}: RpgRewardPanelProps): import("react").ReactElement {
  const text = rpgRewardText(labels);
  const title = heading ?? text.heading;
  const failure = rpgFailureText(failureMessage, text);
  return (
    <section
      {...sectionProps}
      aria-label={title}
      data-apk-presentation="rpg-rewards"
      data-apk-region="progression"
      style={{
        ...RETRO_ARCADE_PANEL_STYLE,
        display: "grid",
        gap: "1rem",
        background: "var(--apk-reward-background, #060b18)",
        color: "var(--apk-reward-text, #f7f2d0)",
        fontFamily: "var(--apk-reward-body-font, Tahoma, 'Noto Sans Thai', sans-serif)",
        padding: "clamp(0.75rem, 2vw, 1rem)",
        ...style,
      }}
    >
      <header>
        <h2 style={{ margin: 0, fontFamily: "var(--apk-reward-display-font, 'Courier New', monospace)" }}>
          {title}
        </h2>
      </header>

      {failure ? (
        <div role="alert" style={{ border: "2px solid #f87171", padding: "0.75rem" }}>
          <p style={{ margin: 0 }}>{failure}</p>
          {onRetry ? (
            <button type="button" onClick={onRetry} style={{ ...getRetroArcadeButtonStyle("secondary"), marginBlockStart: "0.75rem" }}>
              {text.tryAgain}
            </button>
          ) : null}
        </div>
      ) : null}

      <ul style={{ display: "grid", gap: "0.75rem", listStyle: "none", margin: 0, padding: 0 }}>
        {state.cosmetics.map((cosmetic) => {
          const quest = state.quests.find(({ rewardId }) => rewardId === cosmetic.id);
          const unlocked = cosmetic.unlockedAt !== null;
          const pending = pendingCosmeticId === cosmetic.id;
          const equipped = cosmetic.equipped && state.equippedEmblemId === cosmetic.id;

          return (
            <li key={cosmetic.id} data-rpg-cosmetic={cosmetic.id} data-rpg-unlocked={String(unlocked)} style={rewardCardStyle}>
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  inlineSize: "80px",
                  blockSize: "80px",
                  border: "2px solid var(--apk-reward-icon-border, #67e8f9)",
                  background: "var(--apk-reward-icon-background, #081225)",
                }}
              >
                <img
                  src={assetUrls[cosmetic.id]}
                  alt=""
                  width={64}
                  height={64}
                  style={{ imageRendering: "pixelated", inlineSize: "64px", blockSize: "64px", opacity: unlocked ? 1 : 0.7 }}
                />
              </div>
              <div style={{ display: "grid", gap: "0.5rem", minInlineSize: 0 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{cosmetic.name}</h3>
                  {unlocked ? (
                    <p style={{ margin: "0.25rem 0 0", color: "var(--apk-reward-accent, #67e8f9)" }}>{text.unlocked}</p>
                  ) : (
                    <p style={{ margin: "0.25rem 0 0", color: "var(--apk-reward-muted, #b9c9bf)" }}>
                      {text.locked.replace("{requirement}", quest ? text.quests[quest.id] : text.lockedFallback)}
                    </p>
                  )}
                </div>
                {unlocked && inventoryNote ? (
                  <p data-rpg-in-inventory={cosmetic.id} style={{ margin: 0, color: "var(--apk-reward-muted, #b9c9bf)" }}>{inventoryNote}</p>
                ) : unlocked && onEquip ? (
                  <button
                    type="button"
                    aria-label={(equipped ? text.equippedAria : pending ? text.equippingAria : text.equipAria).replace("{name}", cosmetic.name)}
                    aria-pressed={equipped}
                    aria-busy={pending || undefined}
                    disabled={equipped || pending || pendingCosmeticId !== null}
                    onClick={() => onEquip(cosmetic.id)}
                    style={getRetroArcadeButtonStyle(equipped ? "secondary" : "primary")}
                  >
                    {equipped ? text.equipped : pending ? text.equipping : text.equip}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {credit ? <small>{credit}</small> : null}
    </section>
  );
}
