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
        // The panel's reward variables, so a host skin styles the bar and the panel alike; the defaults are the old colors.
        border: "2px solid var(--apk-reward-border, #31577d)",
        background: "var(--apk-reward-background, #081225)",
        color: "var(--apk-reward-text, #f7f2d0)",
        fontFamily: "var(--apk-reward-body-font, Tahoma, sans-serif)",
        overflowWrap: "anywhere",
      }}>
        {props.heading ?? "Wizard rewards"} · {unlockedCount}/{props.state.cosmetics.length}
      </summary>
      <RpgRewardPanel {...props} />
    </details>
  );
}
