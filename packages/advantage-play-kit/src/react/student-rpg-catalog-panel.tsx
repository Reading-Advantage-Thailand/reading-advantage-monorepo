"use client";

import type { ReactElement } from "react";

import { RpgRewardDisclosure } from "../presentation/rpg-reward-disclosure.js";
import { resolveRpgRewardAssetUrls } from "../presentation/rpg-reward-assets.js";
import type { RpgRewardAssetUrls } from "../presentation/rpg-reward-panel.js";
import { rpgFailureText, rpgRewardText, type RpgRewardLabelsInput } from "../presentation/rpg-reward-labels.js";
import { getRetroArcadeButtonStyle } from "../presentation/retro-arcade-theme.js";
import { useStudentRpg } from "./use-student-rpg.js";

/** Props for the shared student catalog reward panel. */
export interface StudentRpgCatalogPanelProps {
  /** Validated server owner key for the authenticated student. */
  readonly ownerKey?: string;
  /** Authenticated RPG route used for state and equipment requests. */
  readonly endpoint?: string;
  /** Host path prefix used for reviewed reward assets. */
  readonly basePath?: string;
  /** Replaces the equip action on hosts where a reward is an avatar piece in the inventory. */
  readonly inventoryNote?: string;
  /** Host reward icon URLs in place of the reviewed icons under `basePath`. */
  readonly assetUrls?: RpgRewardAssetUrls;
  /** Asset credit under the list; null when the host icons need none. */
  readonly credit?: string | null;
  /** The reward text in the host language; each missing label stays English. */
  readonly labels?: RpgRewardLabelsInput;
}

/**
 * Shows confirmed RPG rewards on an authenticated student catalog.
 * @param props Validated owner identity, optional host paths, and the reward text.
 * @returns The catalog reward disclosure or no content without an owner.
 */
export function StudentRpgCatalogPanel({
  ownerKey,
  endpoint = "/api/v1/apk/rpg",
  basePath = "",
  inventoryNote,
  assetUrls,
  credit,
  labels,
}: StudentRpgCatalogPanelProps): ReactElement | null {
  const text = rpgRewardText(labels);
  const enabled = Boolean(ownerKey);
  const rpg = useStudentRpg({ endpoint, ownerKey: ownerKey ?? "", enabled });

  if (!enabled) return null;
  if (rpg.loading && rpg.state === null) return <p role="status">{text.loading}</p>;
  if (rpg.state) {
    return (
      <RpgRewardDisclosure
        state={rpg.state}
        assetUrls={assetUrls ?? resolveRpgRewardAssetUrls(basePath)}
        pendingCosmeticId={rpg.pendingCosmeticId}
        failureMessage={rpg.failureMessage}
        onRetry={() => void rpg.retry()}
        onEquip={(cosmeticId) => void rpg.equip(cosmeticId)}
        inventoryNote={inventoryNote}
        credit={credit}
        labels={labels}
      />
    );
  }
  if (!rpg.failureMessage) return null;

  return (
    <section aria-label={text.heading} role="alert" style={{ border: "2px solid #f87171", padding: "0.75rem" }}>
      <p style={{ margin: 0 }}>{rpgFailureText(rpg.failureMessage, text)}</p>
      <button
        type="button"
        onClick={() => void rpg.retry()}
        style={{ ...getRetroArcadeButtonStyle("secondary"), marginBlockStart: "0.75rem" }}
      >
        {text.tryAgain}
      </button>
    </section>
  );
}
