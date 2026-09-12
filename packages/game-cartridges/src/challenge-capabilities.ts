/** Declared comparable challenge revision and modality support for one installed cartridge. */
export interface CartridgeChallengeCapability {
  readonly version: string;
  readonly inputMode: "vocabulary" | "sentence";
  readonly modalities: readonly ("reading" | "read-to-select-audio")[];
}

/**
 * Explicit revisions for cartridges enabled for comparable challenges.
 * Bump a revision when scoring, controls, learning rules, or seeded behavior changes.
 */
export const CARTRIDGE_CHALLENGE_CAPABILITIES: Readonly<Record<string, CartridgeChallengeCapability>> = {
  "wizard-vs-zombie": { version: "2026-09-09.1", inputMode: "vocabulary", modalities: ["reading", "read-to-select-audio"] },
  "dragon-flight": { version: "2026-09-09.1", inputMode: "vocabulary", modalities: ["reading", "read-to-select-audio"] },
  "dragon-rider": { version: "2026-09-09.1", inputMode: "vocabulary", modalities: ["reading", "read-to-select-audio"] },
};
