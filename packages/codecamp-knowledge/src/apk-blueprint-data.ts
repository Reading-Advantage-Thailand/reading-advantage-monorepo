import { APKLearningBlueprintSchema } from "./apk-blueprint.js";

const objectiveDefinitions = [
  ["codecamp.game-development.concept.game-loop", "Explain update and render work in a game loop", "loop-order-confusion", "Trace fixed update, state transition, and render responsibilities without coupling them."],
  ["codecamp.game-development.skill.game-state", "Model deterministic game state and transitions", "hidden-state-mutation", "Model explicit state transitions that can be replayed and tested deterministically."],
  ["codecamp.game-development.skill.phaser-lifecycle", "Implement Phaser scene lifecycle methods", "lifecycle-order-confusion", "Place preload, create, update, and cleanup work in the correct Phaser lifecycle boundaries."],
  ["codecamp.game-development.skill.input", "Map keyboard and pointer input to game intentions", "raw-input-coupling", "Translate normalized keyboard and pointer snapshots into testable gameplay intentions."],
  ["codecamp.game-development.skill.physics", "Use collision and movement physics deliberately", "physics-frame-dependence", "Configure movement and collision behavior without frame-rate-dependent outcomes."],
  ["codecamp.game-development.skill.apk-contract", "Implement the Advantage Play Kit cartridge contract", "abi-shape-drift", "Implement a stable cartridge manifest, game-config factory, educational input, and validated result."],
  ["codecamp.game-development.skill.react-host", "Host a client-only Phaser cartridge from React", "host-cartridge-ownership", "Keep mounting, completion, diagnostics, navigation, and persistence in the React host boundary."],
  ["codecamp.game-development.skill.cartridge-testing", "Verify cartridge ABI, logic, and browser behavior", "test-layer-confusion", "Separate deterministic logic, ABI, runtime lifecycle, and browser-visible acceptance checks."],
  ["codecamp.game-development.skill.accessibility", "Provide keyboard, readable, and reduced-motion game access", "canvas-only-access", "Provide keyboard-equivalent control, readable status, focus handling, and reduced-motion behavior."],
  ["codecamp.game-development.skill.assets", "Load licensed assets through explicit manifests", "asset-provenance-loss", "Resolve semantic asset slots through edition manifests with license and optimization evidence."],
  ["codecamp.game-development.skill.performance", "Measure and control cartridge performance", "premature-optimization", "Measure frame, memory, asset, and teardown behavior before applying bounded optimizations."],
] as const;

function objectiveSlug(objectiveId: string): string {
  return objectiveId.split(".").at(-1)!;
}

/** Reviewed, deterministic APK learning-branch blueprint. */
export const apkLearningBlueprint = APKLearningBlueprintSchema.parse({
  schemaVersion: "codecamp-apk-learning-blueprint.v1",
  blueprintId: "codecamp.apk.game-creation",
  version: "1.0.0",
  graphVersion: "1.2.0",
  apkRuntimeApiVersion: "1.0.0",
  reviews: {
    curriculumOwner: { name: "Codecamp curriculum owner", status: "approved", reviewedAt: "2026-07-10" },
    apkMaintainer: { name: "Advantage Play Kit maintainer", status: "approved", reviewedAt: "2026-07-10" },
  },
  prerequisiteRoots: [
    { role: "javascript", objectiveId: "codecamp.foundation.skill.functions" },
    { role: "typescript", objectiveId: "codecamp.foundation.skill.typescript-contracts" },
    { role: "react", objectiveId: "codecamp.frontend.skill.react-components" },
    { role: "testing", objectiveId: "codecamp.testing.skill.unit-tests" },
    { role: "git", objectiveId: "codecamp.workflow.skill.git-branches" },
  ],
  abi: {
    cartridgeManifestFields: ["id", "title", "description", "version", "runtimeApiVersion", "inputMode", "requiredAssetSlots", "capabilities"],
    educationalInputModes: ["vocabulary", "sentence"],
    educationalResultFields: ["accuracy", "xp", "score", "correctAnswers", "totalAttempts"],
    hostResponsibilities: ["mount", "completion", "diagnostics", "navigation", "persistence"],
    cartridgeResponsibilities: ["manifest", "game-config", "educational-logic", "validated-result", "deterministic-cleanup"],
    editionResponsibilities: ["semantic-assets", "asset-provenance", "palette", "audience-tuning", "runtime-version"],
    isolation: { phaser: "client-only", reactHostOwnsMount: true, serverImportsForbidden: true },
  },
  objectives: objectiveDefinitions.map(([objectiveId, title, misconceptionTag, outcome]) => {
    const slug = objectiveSlug(objectiveId);
    return {
      objectiveId,
      title,
      outcomes: [outcome],
      workedExample: {
        mode: "worked",
        artifactKind: "code-reading-debugging",
        variantId: `apk.${slug}.worked.reference-debug`,
        variantFamily: `apk.${slug}.code-reading`,
        artifactId: `apk.${slug}.reference-diff`,
        instructions: `Predict the ${title.toLowerCase()} behavior, trace the annotated reference cartridge, and diagnose one seeded defect.`,
        checks: ["Prediction recorded before reveal", "Seeded defect diagnosis identifies the violated contract"],
        hints: ["Trace data ownership before reading implementation details.", "Compare the failing behavior with the objective outcome and ABI boundary."],
        revealPolicy: "after-prediction",
      },
      guidedPractice: {
        mode: "guided",
        artifactKind: "guided-extension",
        variantId: `apk.${slug}.guided.extension`,
        variantFamily: `apk.${slug}.guided-extension`,
        artifactId: `apk.${slug}.tutorial-step`,
        instructions: `Extend a tutorial cartridge to demonstrate ${title.toLowerCase()} while deterministic checks and fading hints constrain the task.`,
        checks: ["Tutorial repository checks pass", "Extension changes behavior through the intended boundary"],
        hints: ["Run the smallest failing check and name the boundary it exercises.", "Revisit the annotated reference diff only after explaining the failure."],
        revealPolicy: "after-failed-checks",
      },
      independentPractice: {
        mode: "independent",
        artifactKind: "independent-construction",
        variantId: `apk.${slug}.independent.transfer`,
        variantFamily: `apk.${slug}.independent-construction`,
        artifactId: `apk.${slug}.independent-brief`,
        instructions: `Implement ${title.toLowerCase()} in a materially different educational cartridge and defend the design in a pull request.`,
        checks: ["Independent cartridge checks pass", "Pull request evidence explains the objective-specific design decision"],
        hints: ["Restate the educational outcome before selecting a game mechanic.", "Use ABI documentation and objective remediation without copying the tutorial solution."],
        revealPolicy: "no-solution-reveal",
      },
      grading: {
        objectiveId,
        rubricId: `apk.rubric.${slug}`,
        dimensions: ["objective correctness", "contract fidelity", "test evidence"],
        evidenceWeights: { worked: 0.15, guided: 0.35, independent: 0.5 },
      },
      misconceptions: [
        {
          tag: misconceptionTag,
          description: `The learner applies ${title.toLowerCase()} at the wrong responsibility or lifecycle boundary.`,
          remediationRefs: [`objective:${objectiveId}`, `doc:apk/${slug}`],
        },
      ],
    };
  }),
});
