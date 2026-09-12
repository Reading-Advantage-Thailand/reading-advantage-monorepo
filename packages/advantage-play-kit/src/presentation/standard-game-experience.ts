import { z } from "zod";

import type { RuntimeCartridge } from "../runtime/types.js";
import {
  gameBriefingSchema,
  type GameBriefing,
} from "./game-briefing-contract.js";
import {
  gameTutorialDefinitionSchema,
  type CreateTutorialActionDriverContext,
  type GameTutorialActionDriver,
  type GameTutorialDefinition,
} from "./game-tutorial-contract.js";

/** Canonical credit required by the accepted standard asset pack. */
export const STANDARD_GAME_REQUIRED_CREDIT = "Pixel art assets by ElvGames" as const;

/** Runtime schema for the standard learning debrief configuration. */
export const standardGameDebriefSchema = z.object({
  outcome: z.enum(["victory", "defeat", "complete"]),
  /** Attribution text. Empty when the session did not load credited art. */
  requiredCredit: z.string(),
  replayEntry: z.enum(["briefing", "tutorial", "playing"]),
  exitDestination: z.string().trim().min(1),
}).strict();

/** Standard learning debrief configuration owned by a cartridge. */
export type StandardGameDebrief = z.infer<typeof standardGameDebriefSchema>;

/** Runtime schema for one complete briefing, tutorial, gameplay, and debrief definition. */
export const standardGameExperienceDefinitionSchema = z.object({
  briefing: gameBriefingSchema,
  tutorial: gameTutorialDefinitionSchema,
  debrief: standardGameDebriefSchema,
}).strict().superRefine((experience, context) => {
  if (experience.briefing.startPhase !== "tutorial") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["briefing", "startPhase"],
      message: "The standard game experience must enter its guided tutorial",
    });
  }
  if (experience.tutorial.lifecycle.complete.to !== "playing") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tutorial", "lifecycle", "complete", "to"],
      message: "The guided tutorial must continue to normal gameplay",
    });
  }
});

/** Validated serializable definition for the standard game experience. */
export interface StandardGameExperienceDefinition {
  /** Mission briefing shown before the tutorial. */
  readonly briefing: GameBriefing;
  /** Safe deterministic tutorial shown before scored gameplay. */
  readonly tutorial: GameTutorialDefinition;
  /** Learning debrief configuration shown after validated completion. */
  readonly debrief: StandardGameDebrief;
}

/** Runtime hooks that connect a cartridge mechanic to the standard experience. */
export interface StandardGameExperienceRuntime {
  /** Validated serializable experience definition. */
  readonly definition: StandardGameExperienceDefinition;
  /** Creates an isolated driver for one tutorial preview mount. */
  readonly createTutorialActionDriver: (context?: CreateTutorialActionDriverContext) => GameTutorialActionDriver & {
    /** Releases tutorial-local cartridge resources. */
    readonly destroy?: () => void | Promise<void>;
  };
}

/** Runtime cartridge that supplies the complete standard game experience. */
export interface StandardExperienceCartridge extends RuntimeCartridge {
  /** Briefing, tutorial driver, and debrief configuration for this cartridge. */
  readonly standardExperience: StandardGameExperienceRuntime;
}

/**
 * Validates a cartridge's complete standard experience definition.
 * @param value Untrusted briefing, tutorial, and debrief configuration.
 * @returns The validated standard experience definition.
 * @throws When a required phase or safe transition is missing.
 */
export function validateStandardGameExperienceDefinition(
  value: unknown,
): StandardGameExperienceDefinition {
  return standardGameExperienceDefinitionSchema.parse(value);
}

/**
 * Checks whether a loaded runtime cartridge supplies the standard experience.
 * @param cartridge Runtime cartridge loaded by a host or catalog.
 * @returns True when the cartridge includes a complete standard experience runtime.
 */
export function hasStandardGameExperience(
  cartridge: RuntimeCartridge,
): cartridge is StandardExperienceCartridge {
  const candidate = cartridge as Partial<StandardExperienceCartridge>;
  return candidate.standardExperience !== undefined
    && typeof candidate.standardExperience.createTutorialActionDriver === "function"
    && standardGameExperienceDefinitionSchema.safeParse(
      candidate.standardExperience.definition,
    ).success;
}
