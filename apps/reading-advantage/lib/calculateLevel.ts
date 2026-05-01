import readability from "text-readability-ts";

interface IReadability {
  raLevel: number;
  cefrLevel: string;
}

const levels = [
  "A1-",
  "A1",
  "A1+",
  "A2-",
  "A2",
  "A2+",
  "B1-",
  "B1",
  "B1+",
  "B2-",
  "B2",
  "B2+",
  "C1-",
  "C1",
  "C1+",
  "C2-",
  "C2",
  "C2+",
];

function calculateLevel(text: string, cefrLevelInput: string): IReadability {
  const textStandard = Math.max(
    1,
    Math.min(readability.textStandard(text, true) as number, levels.length)
  );
  const inputLevelNum = levels.indexOf(cefrLevelInput) + 1;

  let adjustedLevel = textStandard;

  if (inputLevelNum > textStandard) {
    adjustedLevel = inputLevelNum - 1;
  } else if (inputLevelNum < textStandard) {
    adjustedLevel = inputLevelNum + 1;
  }

  // Ensure adjusted level is within valid range
  adjustedLevel = Math.max(1, Math.min(adjustedLevel, levels.length));

  const adjustedCefrLevel = levels[adjustedLevel - 1];

  return { raLevel: adjustedLevel, cefrLevel: adjustedCefrLevel };
}

export { calculateLevel };
