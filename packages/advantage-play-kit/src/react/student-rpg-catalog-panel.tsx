"use client";

import type { ReactElement } from "react";

import { RpgRewardDisclosure } from "../presentation/rpg-reward-disclosure.js";
import { resolveRpgRewardAssetUrls } from "../presentation/rpg-reward-assets.js";
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
}

/**
 * Shows confirmed RPG rewards on an authenticated student catalog.
 * @param props Validated owner identity and optional host paths.
 * @returns The catalog reward disclosure or no content without an owner.
 */
export function StudentRpgCatalogPanel({
  ownerKey,
  endpoint = "/api/v1/apk/rpg",
  basePath = "",
}: StudentRpgCatalogPanelProps): ReactElement | null {
  const enabled = Boolean(ownerKey);
  const rpg = useStudentRpg({ endpoint, ownerKey: ownerKey ?? "", enabled });

  if (!enabled) return null;
  if (rpg.loading && rpg.state === null) return <p role="status">Loading Wizard rewards…</p>;
  if (rpg.state) {
    return (
      <RpgRewardDisclosure
        state={rpg.state}
        assetUrls={resolveRpgRewardAssetUrls(basePath)}
        pendingCosmeticId={rpg.pendingCosmeticId}
        failureMessage={rpg.failureMessage}
        onRetry={() => void rpg.retry()}
        onEquip={(cosmeticId) => void rpg.equip(cosmeticId)}
      />
    );
  }
  if (!rpg.failureMessage) return null;

  return (
    <section aria-label="Wizard rewards" role="alert" style={{ border: "2px solid #f87171", padding: "0.75rem" }}>
      <p style={{ margin: 0 }}>{rpg.failureMessage}</p>
      <button
        type="button"
        onClick={() => void rpg.retry()}
        style={{ ...getRetroArcadeButtonStyle("secondary"), marginBlockStart: "0.75rem" }}
      >
        Try again
      </button>
    </section>
  );
}
