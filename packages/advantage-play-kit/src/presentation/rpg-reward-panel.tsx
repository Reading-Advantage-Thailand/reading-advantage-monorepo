"use client";

import type { ComponentProps, CSSProperties } from "react";
import type {
  RpgCosmeticId,
  RpgQuestId,
  StudentRpgState,
} from "@reading-advantage/game-contracts";

import {
  getRetroArcadeButtonStyle,
  RETRO_ARCADE_PANEL_STYLE,
} from "./retro-arcade-theme.js";
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
  /** Requests server equipment of one unlocked cosmetic. */
  readonly onEquip: (cosmeticId: RpgCosmeticId) => void;
  /** Visible panel heading. */
  readonly heading?: string;
};

const QUEST_REQUIREMENTS: Readonly<Record<RpgQuestId, string>> = Object.freeze({
  "first-ward": "Finish Wizard vs. Zombie after making at least one answer attempt.",
  "complete-the-ward": "Win Wizard vs. Zombie after making at least one answer attempt.",
  "perfect-english-audio": "Win Wizard vs. Zombie with Thai translation prompts and English term audio answers. Complete every item correctly on the first attempt.",
});

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
 * @param props Confirmed RPG state, reviewed icon URLs, request state, and host callbacks.
 * @returns A host-neutral reward panel for entry and result screens.
 */
export function RpgRewardPanel({
  state,
  assetUrls,
  pendingCosmeticId = null,
  failureMessage = null,
  onRetry,
  onEquip,
  heading = "Wizard rewards",
  style,
  ...sectionProps
}: RpgRewardPanelProps): import("react").ReactElement {
  return (
    <section
      {...sectionProps}
      aria-label={heading}
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
          {heading}
        </h2>
      </header>

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
                    <p style={{ margin: "0.25rem 0 0", color: "var(--apk-reward-accent, #67e8f9)" }}>Unlocked</p>
                  ) : (
                    <p style={{ margin: "0.25rem 0 0", color: "var(--apk-reward-muted, #b9c9bf)" }}>
                      Locked: {quest ? QUEST_REQUIREMENTS[quest.id] : "Complete the linked quest."}
                    </p>
                  )}
                </div>
                {unlocked ? (
                  <button
                    type="button"
                    aria-label={`${equipped ? "Equipped" : pending ? "Equipping" : "Equip"} ${cosmetic.name}`}
                    aria-pressed={equipped}
                    aria-busy={pending || undefined}
                    disabled={equipped || pending || pendingCosmeticId !== null}
                    onClick={() => onEquip(cosmetic.id)}
                    style={getRetroArcadeButtonStyle(equipped ? "secondary" : "primary")}
                  >
                    {equipped ? "Equipped" : pending ? "Equipping…" : "Equip"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <small>{STANDARD_GAME_REQUIRED_CREDIT}</small>
    </section>
  );
}
