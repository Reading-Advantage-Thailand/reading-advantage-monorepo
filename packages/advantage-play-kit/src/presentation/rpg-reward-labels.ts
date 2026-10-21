import type { RpgQuestId } from "@reading-advantage/game-contracts";

/** The load failure line of `useStudentRpg`; the reward components show the host label in its place. */
export const RPG_LOAD_FAILED = "Rewards could not be loaded. Try again.";

/** The equip failure line of `useStudentRpg`; the reward components show the host label in its place. */
export const RPG_EQUIP_FAILED = "Reward could not be equipped. Try again.";

/** Text of the RPG reward components; the host passes its own language. */
export interface RpgRewardLabels {
  readonly heading: string;
  /** Heading of the result notice when it shows new rewards. */
  readonly newHeading: string;
  readonly loading: string;
  readonly tryAgain: string;
  readonly unlocked: string;
  /** Locked line; `{requirement}` is replaced with the quest requirement. */
  readonly locked: string;
  /** Requirement of a reward with no linked quest. */
  readonly lockedFallback: string;
  readonly equip: string;
  readonly equipping: string;
  readonly equipped: string;
  /** Button names for assistive technology; `{name}` is replaced with the reward name. */
  readonly equipAria: string;
  readonly equippingAria: string;
  readonly equippedAria: string;
  readonly loadFailed: string;
  readonly equipFailed: string;
  /** The requirement of each quest. */
  readonly quests: Readonly<Record<RpgQuestId, string>>;
}

/** Host labels: any subset, and any subset of the quest requirements. */
export type RpgRewardLabelsInput = Partial<Omit<RpgRewardLabels, "quests">> & {
  readonly quests?: Partial<Record<RpgQuestId, string>>;
};

/** The English text of the reward components, used for each label that the host does not pass. */
export const RPG_REWARD_LABELS: RpgRewardLabels = {
  heading: "Wizard rewards",
  newHeading: "New Wizard rewards",
  loading: "Loading Wizard rewards…",
  tryAgain: "Try again",
  unlocked: "Unlocked",
  locked: "Locked: {requirement}",
  lockedFallback: "Complete the linked quest.",
  equip: "Equip",
  equipping: "Equipping…",
  equipped: "Equipped",
  equipAria: "Equip {name}",
  equippingAria: "Equipping {name}",
  equippedAria: "Equipped {name}",
  loadFailed: RPG_LOAD_FAILED,
  equipFailed: RPG_EQUIP_FAILED,
  quests: {
    "first-ward": "Finish Wizard vs. Zombie after making at least one answer attempt.",
    "complete-the-ward": "Win Wizard vs. Zombie after making at least one answer attempt.",
    "perfect-english-audio": "Win Wizard vs. Zombie with Thai translation prompts and English term audio answers. Complete every item correctly on the first attempt.",
  },
};

/**
 * Merges the host labels over the English defaults.
 * @param labels The host labels, or nothing.
 * @returns The full label set.
 */
export function rpgRewardText(labels?: RpgRewardLabelsInput): RpgRewardLabels {
  return { ...RPG_REWARD_LABELS, ...labels, quests: { ...RPG_REWARD_LABELS.quests, ...labels?.quests } };
}

/**
 * The failure line in the host language: the two known hook lines map to their labels.
 * @param message The failure line from the hook or the host, or null.
 * @param text The full label set.
 * @returns The line to show, or null.
 */
export function rpgFailureText(message: string | null, text: RpgRewardLabels): string | null {
  if (message === RPG_LOAD_FAILED) return text.loadFailed;
  if (message === RPG_EQUIP_FAILED) return text.equipFailed;
  return message;
}
