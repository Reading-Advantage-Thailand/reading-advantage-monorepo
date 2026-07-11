import type { CurriculumModule } from "./codecamp-curriculum-data.js";

/**
 * Returns the append-only Unit 20 curriculum shell for the APK game-creation sequence.
 * @returns One published module with I Do, We Do, and You Do class periods.
 */
export function getCodecampAPKCurriculumData(): { modules: CurriculumModule[] } {
  return {
    modules: [{
      title: "Advantage Play Kit Game Creation",
      description: "Trace, extend, and independently build educational Phaser cartridges behind the APK host contract.",
      slug: "apk-game-creation", order: 20, phase: "D", status: "published",
      lessons: [
        {
          title: "I Do — Trace a Phaser Cartridge", description: "Follow a worked cartridge through the Phaser lifecycle and React host boundary.", order: 1, type: "theory",
          contentJson: { schemaVersion: "codecamp-apk-lesson.v1", localePolicy: "bilingual", activityId: "codecamp.activity.apk.ido", mode: "worked_example", resourceIds: ["video.apk.phaser-overview", "transcript.apk.phaser-overview", "diagram.apk.boundaries", "apk.reference.word-match", "apk.diff.word-match-boundaries"], sections: [{ heading: "Host and cartridge responsibilities", headingTh: "หน้าที่ของ host และ cartridge", body: "Predict which layer owns mounting, persistence, navigation, game state, and per-frame input before inspecting the annotated diff.", bodyTh: "คาดการณ์ว่า layer ใดดูแล mounting, persistence, navigation, game state และ input ก่อนดู annotated diff" }] },
        },
        {
          title: "We Do — Complete the APK Manifest", description: "Clone the guided fixture and satisfy deterministic manifest checks with fading support.", order: 2, type: "exercise",
          contentJson: { schemaVersion: "codecamp-apk-lesson.v1", localePolicy: "bilingual", activityId: "codecamp.activity.apk.wedo", mode: "guided_practice", repositoryId: "repo.apk.guided", fixturePath: "packages/codecamp-knowledge/fixtures/apk-guided", manifestStepIds: ["wedo.apk.manifest"], completionCriteria: { requiredStepIds: ["wedo.apk.manifest"] }, remediationResourceIds: ["diagram.apk.boundaries"] },
          exercises: [{ title: "Implement and stage the cartridge manifest", instructions: "Add the APK runtime version and capabilities without moving persistence into the cartridge. Run the tutorial checker and report the server-verified result.", starterCode: "export const cartridgeManifest = {\n  // TODO: runtimeApiVersion and capabilities\n};", expectedOutput: "Both manifest.runtime and git.stage checks pass.", hintsJson: ["Inspect the host/cartridge boundary diagram.", "The host owns persistence; the cartridge declares capabilities."], order: 1 }],
        },
        {
          title: "You Do — Sentence-Sorting Cartridge", description: "Build and submit a materially different cartridge as independent transfer evidence.", order: 3, type: "exercise",
          contentJson: { schemaVersion: "codecamp-apk-lesson.v1", localePolicy: "bilingual", activityId: "codecamp.activity.apk.youdo", mode: "independent_practice", repositoryId: "repo.apk.independent", fixturePath: "packages/codecamp-knowledge/fixtures/apk-independent", objectiveId: "codecamp.game-development.skill.apk-contract", variantKey: "apk.apk-contract.independent.transfer", requiredChecks: ["manifest ABI", "deterministic educational logic", "keyboard-equivalent input", "unit tests", "browser smoke test"], rubricId: "apk.rubric.independent-cartridge", srsAfterDays: [2, 7] },
          exercises: [{ title: "Build the independent cartridge and open a PR", instructions: "Implement sentence sorting without copying the guided mechanic. Preserve the APK ABI, test deterministic result mapping, verify keyboard access, and submit a PR with browser evidence.", starterCode: "export function createSentenceSortingCartridge() {\n  // Independent implementation\n}", expectedOutput: "Required checks pass and the PR is ready for rubric review.", hintsJson: [], order: 1 }],
        },
      ],
    }],
  };
}
