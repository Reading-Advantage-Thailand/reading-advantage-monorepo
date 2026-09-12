"use client";

import type { ReactElement } from "react";
import { RpgRewardPanel, type RpgRewardPanelProps } from "./rpg-reward-panel.js";

/** Confirmed reward panel options for a compact briefing or catalog section. */
export type RpgRewardDisclosureProps = RpgRewardPanelProps;

/**
 * Keeps reward details collapsed until the student opens them.
 * @param props Confirmed state, reviewed icons, and equipment actions.
 * @returns A compact native disclosure containing the reward panel.
 */
export function RpgRewardDisclosure(props: RpgRewardDisclosureProps): ReactElement {
  const unlockedCount = props.state.cosmetics.filter(({ unlockedAt }) => unlockedAt !== null).length;
  return (
    <details data-apk-presentation="rpg-reward-disclosure" style={{ minInlineSize: 0 }}>
      <summary style={{
        minBlockSize: "48px",
        boxSizing: "border-box",
        padding: "0.75rem",
        cursor: "pointer",
        border: "2px solid #31577d",
        background: "#081225",
        color: "#f7f2d0",
        fontFamily: "Tahoma, sans-serif",
        overflowWrap: "anywhere",
      }}>
        {props.heading ?? "Wizard rewards"} · {unlockedCount}/{props.state.cosmetics.length}
      </summary>
      <RpgRewardPanel {...props} />
    </details>
  );
}
