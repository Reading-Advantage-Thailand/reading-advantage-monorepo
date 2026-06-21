interface ScriptScene {
  narration: string;
  imagePrompt: string;
  motionDirection: string;
}

interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

interface SafeParseFailure {
  success: false;
  error: Error;
}

type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure;

const MIN_SCENES = 5;
const MAX_SCENES = 7;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidScene(value: unknown): value is ScriptScene {
  if (typeof value !== "object" || value === null) return false;
  const scene = value as Record<string, unknown>;
  return (
    isNonEmptyString(scene.narration) &&
    isNonEmptyString(scene.imagePrompt) &&
    isNonEmptyString(scene.motionDirection)
  );
}

function safeParse(input: unknown): SafeParseResult<ScriptScene[]> {
  if (!Array.isArray(input)) {
    return { success: false, error: new Error("Script must be an array") };
  }
  if (input.length < MIN_SCENES || input.length > MAX_SCENES) {
    return {
      success: false,
      error: new Error(
        `Script must contain between ${MIN_SCENES} and ${MAX_SCENES} scenes`,
      ),
    };
  }
  for (const scene of input) {
    if (!isValidScene(scene)) {
      return {
        success: false,
        error: new Error(
          "Each scene must include non-empty narration, imagePrompt, and motionDirection",
        ),
      };
    }
  }
  return { success: true, data: input as ScriptScene[] };
}

export const scriptSchema = { safeParse };
