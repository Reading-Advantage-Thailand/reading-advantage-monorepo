/**
 * Noninteractive cartridge scaffold generator.
 *
 * Generates a minimal cartridge file set (manifest, logic, scene, responsive
 * declaration, attribution, tests, QC registration) that pins the accepted
 * canonical standard-pack release, declares only accepted capabilities,
 * materializes only the cartridge's selected union, registers attribution, and
 * composes compact/wide responsive and accessible presentation defaults. The common workflow
 * does not require copying another game's source tree.
 */

import { validateCartridgeManifest, type CartridgeManifest } from "./cartridge-manifest.js";
import { assetContractV2SemanticRequirementSchema } from "../assets/asset-contract-v2.js";
import type { AssetContractV2SemanticRequirement } from "../assets/asset-contract-v2.js";
import { ACCEPTED_STANDARD_PACK_BINDING } from "./cartridge-manifest.js";
import {
  validateGameTutorialDefinition,
  type GameTutorialDefinition,
} from "../presentation/game-tutorial-contract.js";

/** Options supplied to the scaffold generator. */
export interface ScaffoldOptions {
  /** Lowercase kebab-case cartridge identifier. */
  readonly id: string;
  /** Human-readable cartridge title. */
  readonly title: string;
  /** Short catalog description. */
  readonly description: string;
  /** Educational input mode. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Accepted capabilities the cartridge will exercise. */
  readonly capabilities: readonly string[];
  /** Semantic asset role keys the cartridge requires (never physical paths). */
  readonly requiredAssetBindings: readonly string[];
  /** Optional product role/state requests resolved through descriptor-owned presentation metadata. */
  readonly semanticStateRequirements?: readonly AssetContractV2SemanticRequirement[];
}

/** One generated file in the scaffold. */
export interface ScaffoldFile {
  /** Relative path within the cartridge directory. */
  readonly path: string;
  /** Generated file contents. */
  readonly content: string;
}

/** Result of a scaffold generation. */
export interface CartridgeScaffold {
  /** Validated manifest pinning the accepted release and capabilities. */
  readonly manifest: CartridgeManifest;
  /** Generated file set. */
  readonly files: readonly ScaffoldFile[];
  /** Whether the scaffold copied another game's source tree (always false). */
  readonly copiedSourceTree: false;
}

/**
 * Generates a noninteractive cartridge scaffold through public APK APIs only.
 * @param options Cartridge identity, capabilities, and semantic requirements.
 * @returns A validated manifest and generated file set.
 * @throws When capabilities are not accepted or semantic requirements contain physical paths.
 */
export function generateCartridgeScaffold(options: ScaffoldOptions): CartridgeScaffold {
  const semanticStateRequirements = validateSemanticStateRequirements(
    options.semanticStateRequirements,
  );
  const tutorial = generateTutorialDefinition(options);
  const manifest = validateCartridgeManifest({
    schemaVersion: 1,
    id: options.id,
    title: options.title,
    description: options.description,
    runtimeApiVersion: "1.0.0",
    inputMode: options.inputMode,
    capabilities: options.capabilities as readonly string[],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    requiredAssetBindings: options.requiredAssetBindings,
    responsive: {
      profiles: ["compact", "wide"],
      compactStrategy: "reflow",
      wideStrategy: "panel",
      statePreservation: "capture-recompose-restore",
    },
    attributionRegistration: {
      requiredCredit: "Pixel art assets by ElvGames",
      placement: "end-screen",
    },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
    tutorial,
  });

  const files: ScaffoldFile[] = [
    { path: "manifest.json", content: generateManifestJson(manifest) },
    { path: "logic.ts", content: generateLogicModule(manifest) },
    { path: "scene.ts", content: generateSceneModule(manifest) },
    { path: "responsive.ts", content: generateResponsiveModule() },
    { path: "presentation.tsx", content: generatePresentationModule(manifest) },
    { path: "experience.ts", content: generateExperienceModule(manifest) },
    { path: "cartridge.ts", content: generateCartridgeModule(manifest) },
    { path: "index.ts", content: generateIndexModule() },
    { path: "assets.ts", content: generateAssetsModule(manifest, semanticStateRequirements) },
    { path: "attribution.ts", content: generateAttributionModule() },
    { path: "logic.test.ts", content: generateLogicTest(manifest) },
    { path: "experience.test.ts", content: generateExperienceTest(manifest) },
    { path: "browser.test.ts", content: generateBrowserTest(manifest) },
    { path: "qc-registration.json", content: generateQcRegistration(manifest) },
  ];

  return Object.freeze({
    manifest,
    files: Object.freeze(files),
    copiedSourceTree: false,
  });
}

/**
 * Creates the mandatory safe tutorial for a newly generated cartridge.
 * @param options Cartridge identity and resolved product text.
 * @returns A validated tutorial that demonstrates correct and incorrect choices.
 */
function generateTutorialDefinition(options: ScaffoldOptions): GameTutorialDefinition {
  return validateGameTutorialDefinition({
    schemaVersion: 1,
    id: `${options.id}-tutorial`,
    title: `${options.title} guided tutorial`,
    seed: 29,
    labels: {
      progress: "Tutorial progress",
      pause: "Pause tutorial",
      resume: "Resume tutorial",
      advance: "Next tutorial step",
      replay: "Replay tutorial",
      skip: "Skip tutorial",
    },
    targets: [
      { id: "control:answer-choice", kind: "control" },
      { id: "feedback:incorrect-choice", kind: "feedback" },
    ],
    actions: [
      { id: "action:select-correct", deterministic: true, consequence: "correct" },
      { id: "action:select-incorrect", deterministic: true, consequence: "incorrect" },
    ],
    steps: [
      {
        id: "step:select-correct",
        title: "Choose the matching translation",
        explanation: "Select the answer that matches the current learning prompt.",
        targetId: "control:answer-choice",
        actionId: "action:select-correct",
        timing: { leadInMs: 400, demonstrationMs: 250, lingerMs: 450 },
      },
      {
        id: "step:review-incorrect",
        title: "Use feedback to try again",
        explanation: "An incorrect answer stays on the same prompt and shows safe feedback.",
        targetId: "feedback:incorrect-choice",
        actionId: "action:select-incorrect",
        timing: { leadInMs: 400, demonstrationMs: 250, lingerMs: 450 },
      },
    ],
    lifecycle: {
      pause: "freeze-current-step",
      advance: "sequential",
      replay: "restart-with-same-seed",
      skip: { enabled: true, to: "playing" },
      complete: { to: "playing" },
      productionEffects: {
        emitGameResults: false,
        persistProgress: false,
        awardAuthoritativeXp: false,
        writeLeaderboard: false,
        applyFailureConsequences: false,
      },
    },
  });
}

/**
 * Validates role/state requests before they are embedded in generated source.
 * @param candidate Untrusted semantic state requirements supplied by a cartridge author.
 * @returns Frozen, path-free semantic state requirements.
 * @throws When a requirement is malformed or contains a physical-path value.
 */
function validateSemanticStateRequirements(
  candidate: unknown,
): readonly AssetContractV2SemanticRequirement[] {
  if (candidate === undefined) return Object.freeze([]);
  const result = assetContractV2SemanticRequirementSchema.array().safeParse(candidate);
  if (!result.success) {
    throw new Error(
      `Semantic state requirements are invalid: ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return Object.freeze(result.data.map((requirement) => Object.freeze({ ...requirement })));
}

function generateManifestJson(manifest: CartridgeManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function generateLogicModule(manifest: CartridgeManifest): string {
  const imports: string[] = [
    `import { validateNonEmptyContent } from "@reading-advantage/advantage-play-kit/systems";`,
  ];
  if (manifest.capabilities.includes("capability:language-target-progression")) {
    imports.push(`import { createLanguageTargetProgression } from "@reading-advantage/advantage-play-kit/systems";`);
  }
  if (manifest.capabilities.includes("capability:single-completion-emission")) {
    imports.push(`import { createCompletionLatch } from "@reading-advantage/advantage-play-kit/systems";`);
  }
  if (manifest.capabilities.includes("capability:result-accounting")) {
    imports.push(`import { createResultAccountant, finalizeResult } from "@reading-advantage/advantage-play-kit/systems";`);
  }
  imports.push(`import type { GameResults } from "@reading-advantage/game-contracts";`);

  return `${imports.join("\n")}

/**
 * ${manifest.title} - generated by the APK scaffold.
 * Uses only public APK shared systems; no title-specific APIs, no direct asset paths.
 */

/**
 * Creates the generated cartridge's shared-system logic boundary.
 * @returns A cartridge logic object that validates educational input.
 */
export function create${pascalCase(manifest.id)}Logic() {
  return {
    initialize(input: unknown) {
      return validateNonEmptyContent(input, ${JSON.stringify(manifest.inputMode)});
    },
  };
}
`;
}

function generateSceneModule(manifest: CartridgeManifest): string {
  const generatedName = pascalCase(manifest.id);
  const gameConfigName = generatedName.endsWith("Game")
    ? `${generatedName}Config`
    : `${generatedName}GameConfig`;

  return `/**
 * ${manifest.title} starter scene.
 * Replace the prompt and choice layout when bespoke mechanics are ready.
 */

import type Phaser from "phaser";

import {
  createCompletionLatch,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
} from "@reading-advantage/advantage-play-kit/systems";
import type { CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit/runtime";
import type { GameResults } from "@reading-advantage/game-contracts";
import {
  createDescriptorDrivenPresentationAdapter,
  type AssetContractV2SemanticRegistration,
} from "@reading-advantage/advantage-play-kit/assets";

/** Tutorial bridge shared by the generated cartridge and its active scene. */
export interface ${pascalCase(manifest.id)}TutorialBridge {
  /** Binds the active scene's safe demonstration action. */
  bind(handler: (actionId: string) => void): void;
  /** Executes one validated tutorial action through the active scene mechanic. */
  execute(actionId: string): void;
  /** Releases the active scene action during cleanup or replay. */
  release(): void;
}

/**
 * Creates an isolated bridge for one generated cartridge instance.
 * @returns A bridge that never owns completion or persistence authority.
 */
export function create${pascalCase(manifest.id)}TutorialBridge(): ${pascalCase(manifest.id)}TutorialBridge {
  let handler: ((actionId: string) => void) | undefined;
  return {
    bind(nextHandler) {
      handler = nextHandler;
    },
    execute(actionId) {
      handler?.(actionId);
    },
    release() {
      handler = undefined;
    },
  };
}

/**
 * Creates the generated Phaser scene and wires its educational session state.
 * @param registration Optional resolver-issued semantic descriptor registration.
 * @param context Runtime input, completion, diagnostics, and host services.
 * @param tutorialBridge Optional bridge for safe deterministic tutorial actions.
 * @returns A Phaser scene configuration with prompt, choices, and result wiring.
 */
export function create${pascalCase(manifest.id)}Scene(
  registration?: AssetContractV2SemanticRegistration,
  context?: CartridgeGameConfigContext,
  tutorialBridge?: ${pascalCase(manifest.id)}TutorialBridge,
) {
  createDescriptorDrivenPresentationAdapter([], registration ? [registration] : []);
  const descriptor = registration?.descriptor;
  const content = context
    ? validateNonEmptyContent(context.input, ${JSON.stringify(manifest.inputMode)})
    : undefined;
  const progression = content
    ? createLanguageTargetProgression(content.items.map((item) => item.translation))
    : undefined;
  const accountant = createResultAccountant();
  let incorrectAttempts = 0;
  let promptText: Phaser.GameObjects.Text | undefined;
  let progressText: Phaser.GameObjects.Text | undefined;
  let feedbackText: Phaser.GameObjects.Text | undefined;
  const answerLabels: Phaser.GameObjects.Text[] = [];
  const completion = createCompletionLatch<GameResults>((result) => {
    if (context) return context.complete(result);
  });

  const currentChoices = (): string[] => {
    if (!content || !progression || progression.currentTarget === undefined) return [];
    const currentIndex = progression.currentIndex;
    const choices = [
      content.items[currentIndex],
      ...content.items.filter((_, index) => index !== currentIndex).slice(0, 2),
    ].map((item) => item.translation);
    const rotation = currentIndex % choices.length;
    return [...choices.slice(rotation), ...choices.slice(0, rotation)];
  };

  const emitResults = (): void => {
    if (!progression?.isComplete) return;
    const finalized = finalizeResult(accountant, {
      xpPerCorrect: 10,
      xpPerAccuracyPoint: 20,
      xpCap: 1000,
      zeroAttemptsXp: 0,
    });
    const result: GameResults = {
      accuracy: finalized.accuracy,
      xp: finalized.xp,
      score: finalized.score,
      correctAnswers: finalized.correctAnswers,
      totalAttempts: finalized.totalAttempts,
    };
    completion.complete(result);
  };

  const render = (scene: Phaser.Scene): void => {
    if (!content || !progression) return;
    promptText ??= scene.add.text(480, 56, "", {
      color: "#f8fafc",
      fontSize: "28px",
      align: "center",
      wordWrap: { width: 820 },
    }).setOrigin(0.5);
    progressText ??= scene.add.text(480, 112, "", {
      color: "#cbd5e1",
      fontSize: "18px",
      align: "center",
    }).setOrigin(0.5);
    feedbackText ??= scene.add.text(480, 430, "", {
      color: "#86efac",
      fontSize: "20px",
      align: "center",
      wordWrap: { width: 820 },
    }).setOrigin(0.5);

    for (const answerLabel of answerLabels) answerLabel.destroy();
    answerLabels.length = 0;

    if (progression.isComplete) {
      promptText.setText("Complete");
      progressText.setText(\`Correct: \${accountant.correctAnswers} / Attempts: \${accountant.totalAttempts}\`);
      feedbackText.setText("Nice work!");
      return;
    }

    const currentItem = content.items[progression.currentIndex];
    promptText.setText(\`Choose the translation for: \${currentItem.term}\`);
    progressText.setText(\`Question \${progression.currentIndex + 1} of \${content.items.length}\`);
    for (const [index, choice] of currentChoices().entries()) {
      const answerLabel = scene.add.text(480, 175 + index * 74, \`\${index + 1}. \${choice}\`, {
        backgroundColor: "#1e293b",
        color: "#f8fafc",
        fontSize: "24px",
        padding: { left: 18, right: 18, top: 12, bottom: 12 },
        align: "center",
        fixedWidth: 620,
      }).setOrigin(0.5).setInteractive();
      answerLabel.on("pointerdown", () => selectAnswer(scene, index));
      answerLabels.push(answerLabel);
    }
  };

  const selectAnswer = (scene: Phaser.Scene, index: number): void => {
    if (!content || !progression || completion.hasCompleted || progression.isComplete) return;
    const candidate = currentChoices()[index];
    if (candidate === undefined) return;
    const isCorrect = progression.match(candidate).matched;
    accountant.recordAttempt({ correct: isCorrect });
    if (isCorrect) {
      accountant.addScore(10);
      feedbackText?.setText("Correct!");
    } else {
      incorrectAttempts += 1;
      feedbackText?.setText(\`Try again. Incorrect attempts: \${incorrectAttempts}\`);
    }
    if (progression.isComplete) emitResults();
    render(scene);
  };

  const choiceIndexForKey = (event: KeyboardEvent): number => {
    if (event.code === "Enter" || event.code === "Space") return 0;
    const match = /^(?:Digit|Numpad)([1-9])$/u.exec(event.code);
    return match ? Number(match[1]) - 1 : -1;
  };

  return {
    create(this: Phaser.Scene) {
      render(this);
      tutorialBridge?.bind((actionId) => {
        if (!content || !progression || progression.isComplete) return;
        const choices = currentChoices();
        const expected = content.items[progression.currentIndex].translation;
        const choiceIndex = actionId === "action:select-correct"
          ? choices.indexOf(expected)
          : choices.findIndex((choice) => choice !== expected);
        if (choiceIndex >= 0) selectAnswer(this, choiceIndex);
      });
      const handleKeyDown = (event: KeyboardEvent): void => {
        const index = choiceIndexForKey(event);
        if (index >= 0) selectAnswer(this, index);
      };
      this.input.keyboard?.on("keydown", handleKeyDown);
      this.events.once("shutdown", () => {
        this.input.keyboard?.off("keydown", handleKeyDown);
        tutorialBridge?.release();
        completion.sealWithoutDelivery();
      });
    },
    /** Returns descriptor-owned clip behavior without imposing a frame count. */
    playDescriptorClip(clipId: string) {
      const clip = descriptor && descriptor.clips?.find((candidate) => candidate.id === clipId);
      if (!clip || !descriptor) return undefined;
      return Object.freeze({
        frames: clip.frames,
        fps: clip.timing.fps,
        loop: clip.timing.loop,
        anchor: descriptor.anchor,
        renderScale: descriptor.renderScale,
      });
    },
    update() {
      if (progression?.isComplete && !completion.hasCompleted) emitResults();
    },
  };
}

/**
 * Creates the Phaser 4 configuration expected by the APK runtime factory.
 * @param context Validated runtime input and the fire-once completion callback.
 * @param registration Optional resolver-issued semantic descriptor registration.
 * @param tutorialBridge Optional bridge for safe deterministic tutorial actions.
 * @returns A runnable Phaser game configuration.
 */
export function create${gameConfigName}(
  context: CartridgeGameConfigContext,
  registration?: AssetContractV2SemanticRegistration,
  tutorialBridge?: ${pascalCase(manifest.id)}TutorialBridge,
): Phaser.Types.Core.GameConfig {
  return {
    width: 960,
    height: 540,
    backgroundColor: "#101827",
    input: { keyboard: true, mouse: true, touch: true },
    scene: create${pascalCase(manifest.id)}Scene(registration, context, tutorialBridge),
  };
}
`;
}

function generateResponsiveModule(): string {
  return `/**
 * Compact/wide responsive composition for this cartridge.
 */

import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type ResponsiveCompositionRequest,
} from "@reading-advantage/advantage-play-kit/responsive";

/**
 * Resolves the generated cartridge's compact or wide composition.
 * @param request Host geometry, input, safe-area, and accessibility values.
 * @returns The supported composition or a structured unsupported-size result.
 */
export function resolveProfile(request: Omit<ResponsiveCompositionRequest, "config">) {
  return resolveResponsiveComposition({ ...request, config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG });
}
`;
}

function generatePresentationModule(manifest: CartridgeManifest): string {
  return `import {
  EducationalPrompt,
  GameFeedback,
  GameProgress,
  PresentationShell,
} from "@reading-advantage/advantage-play-kit/presentation";

/** Props for the generated cartridge presentation shell. */
export interface ${pascalCase(manifest.id)}PresentationProps {
  readonly prompt: string;
  readonly current: number;
  readonly total: number;
  readonly feedback?: string;
}

/**
 * Renders the generated cartridge's accessible educational presentation.
 * @param props Prompt, progress, and optional feedback content.
 * @returns Semantic DOM presentation components for the cartridge host.
 */
export function ${pascalCase(manifest.id)}Presentation(props: ${pascalCase(manifest.id)}PresentationProps) {
  return (
    <PresentationShell accessibleName=${JSON.stringify(manifest.title)}>
      <EducationalPrompt prompt={props.prompt} />
      <GameProgress current={props.current} total={props.total} />
      {props.feedback ? <GameFeedback kind="neutral">{props.feedback}</GameFeedback> : null}
    </PresentationShell>
  );
}
`;
}

function generateExperienceModule(manifest: CartridgeManifest): string {
  const name = pascalCase(manifest.id);
  const constantName = `${constantCase(manifest.id)}_STANDARD_EXPERIENCE`;
  const definition = {
    briefing: {
      title: manifest.title,
      subtitle: manifest.description,
      objective: manifest.inputMode === "vocabulary"
        ? "Match each learning term with its correct translation."
        : "Build each sentence by selecting its words in the correct order.",
      instructions: [
        {
          title: "Read the prompt",
          description: "Review the current learning item before choosing an answer.",
        },
        {
          title: "Choose carefully",
          description: "Correct choices advance. Incorrect choices show feedback and keep the current item active.",
        },
      ],
      learningPreview: { heading: manifest.inputMode === "vocabulary" ? "Words to learn" : "Sentences to practice" },
      controls: [
        { mode: "keyboard", label: "Number keys", action: "Choose an answer", keys: ["1", "2", "3"] },
        { mode: "pointer", label: "Click", action: "Choose an answer" },
        { mode: "touch", label: "Tap", action: "Choose an answer" },
      ],
      tip: "Use the guided tutorial before the scored game begins.",
      labels: { startAction: "Start guided tutorial" },
      startPhase: "tutorial",
    },
    tutorial: manifest.tutorial,
    debrief: {
      outcome: "complete",
      requiredCredit: manifest.attributionRegistration.requiredCredit,
      replayEntry: "briefing",
      exitDestination: "catalog",
    },
  };

  return `import {
  validateStandardGameExperienceDefinition,
  type StandardGameExperienceRuntime,
} from "@reading-advantage/advantage-play-kit/presentation";
import type { ${name}TutorialBridge } from "./scene.js";

/** Complete standard briefing, guided tutorial, gameplay, and debrief definition. */
export const ${constantName} = validateStandardGameExperienceDefinition(${JSON.stringify(definition, null, 2)});

/**
 * Connects the standard guided tutorial to the generated scene mechanic.
 * @param tutorialBridge Isolated bridge owned by one cartridge instance.
 * @returns The validated standard experience and a safe tutorial driver factory.
 */
export function create${name}StandardExperience(
  tutorialBridge: ${name}TutorialBridge,
): StandardGameExperienceRuntime {
  return {
    definition: ${constantName},
    createTutorialActionDriver: () => ({
      execute: ({ step }) => tutorialBridge.execute(step.actionId),
      destroy: () => tutorialBridge.release(),
    }),
  };
}
`;
}

function generateCartridgeModule(manifest: CartridgeManifest): string {
  const name = pascalCase(manifest.id);
  const gameConfigName = name.endsWith("Game") ? `${name}Config` : `${name}GameConfig`;
  const runtimeManifest = {
    id: manifest.id,
    title: manifest.title,
    description: manifest.description,
    runtimeApiVersion: manifest.runtimeApiVersion,
    inputMode: manifest.inputMode,
    requiredAssetBindings: manifest.requiredAssetBindings,
    capabilities: manifest.capabilities,
  };

  return `import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";
import { create${name}StandardExperience } from "./experience.js";
import {
  create${name}${name.endsWith("Game") ? "" : "Game"}Config,
  create${name}TutorialBridge,
} from "./scene.js";

/**
 * Creates a complete runtime cartridge from the generated mechanic and experience.
 * @returns A loadable cartridge with briefing, tutorial, gameplay, and debrief support.
 */
export function create${name}Cartridge(): StandardExperienceCartridge {
  const tutorialBridge = create${name}TutorialBridge();
  return {
    manifest: ${JSON.stringify(runtimeManifest, null, 2)},
    standardExperience: create${name}StandardExperience(tutorialBridge),
    createGameConfig: (context) => create${gameConfigName}(context, undefined, tutorialBridge),
  };
}
`;
}

function generateIndexModule(): string {
  return `/** Public generated cartridge entry point. */
export * from "./cartridge.js";
export * from "./experience.js";
export * from "./scene.js";
`;
}

function generateAssetsModule(manifest: CartridgeManifest, semanticStateRequirements: readonly AssetContractV2SemanticRequirement[] = []): string {
  return `import {
  materializeStandardAssetUnion,
  type AssetContractV2SemanticResolver,
  type StandardAssetCatalog,
} from "@reading-advantage/advantage-play-kit/assets";

/** Semantic catalog keys selected by the generated cartridge. */
export const SEMANTIC_ASSET_REQUIREMENTS = ${JSON.stringify(manifest.requiredAssetBindings)} as const;
/** Product role/state requests whose presentation is descriptor-owned. */
export const SEMANTIC_STATE_REQUIREMENTS = ${JSON.stringify(semanticStateRequirements)} as const;

/**
 * Selects descriptor-driven presentation metadata from product role/state requests.
 * @param resolver Accepted resolver supplied by the cartridge host.
 * @returns The descriptor-aware selected union for the generated state requests.
 */
export function select${pascalCase(manifest.id)}DescriptorAssets(resolver: AssetContractV2SemanticResolver) {
  return resolver.select(SEMANTIC_STATE_REQUIREMENTS);
}

/**
 * Materializes only the generated cartridge's selected semantic asset union.
 * @param catalog Accepted standard-pack catalog supplied by the host.
 * @returns The sorted selected-union asset entries.
 */
export function materialize${pascalCase(manifest.id)}Assets(catalog: StandardAssetCatalog) {
  return materializeStandardAssetUnion(catalog, SEMANTIC_ASSET_REQUIREMENTS);
}
`;
}

function generateAttributionModule(): string {
  return `/**
 * Attribution registration for this cartridge.
 * The required ElvGames credit is carried into the shared Credits/About or
 * end-screen contract used by cartridge hosts and QC.
 */

/** Required standard-pack attribution text. */
export const REQUIRED_CREDIT = "Pixel art assets by ElvGames" as const;
/** Host surface where the generated cartridge registers attribution. */
export const CREDIT_PLACEMENT = "end-screen" as const;
`;
}

function generateLogicTest(manifest: CartridgeManifest): string {
  return `import { describe, expect, it } from "vitest";
import { create${pascalCase(manifest.id)}Logic } from "./logic.js";

describe(${JSON.stringify(manifest.id)}, () => {
  it("rejects empty content through the nonempty-content precondition", () => {
    const logic = create${pascalCase(manifest.id)}Logic();
    expect(() => logic.initialize([])).toThrow(/empty/i);
  });
});
`;
}

function generateExperienceTest(manifest: CartridgeManifest): string {
  const name = pascalCase(manifest.id);
  const constantName = `${constantCase(manifest.id)}_STANDARD_EXPERIENCE`;
  return `import { describe, expect, it } from "vitest";
import { create${name}Cartridge } from "./cartridge.js";
import { ${constantName} } from "./experience.js";

describe(${JSON.stringify(`${manifest.id} standard experience`)}, () => {
  it("publishes the complete safe lifecycle", () => {
    const cartridge = create${name}Cartridge();
    expect(${constantName}.briefing.startPhase).toBe("tutorial");
    expect(${constantName}.tutorial.lifecycle.complete.to).toBe("playing");
    expect(${constantName}.tutorial.lifecycle.productionEffects.emitGameResults).toBe(false);
    expect(${constantName}.debrief.requiredCredit).toBe("Pixel art assets by ElvGames");
    expect(cartridge.standardExperience.definition).toBe(${constantName});
    expect(cartridge.standardExperience.createTutorialActionDriver()).toMatchObject({
      execute: expect.any(Function),
    });
  });
});
`;
}

function generateBrowserTest(manifest: CartridgeManifest): string {
  return `import { createBrowserQcDriver } from "@reading-advantage/advantage-play-kit/qc";

/**
 * Runs the generated cartridge's provider-neutral browser QC sequence.
 * @param page Provider adapter supplied by the host's real-browser test runner.
 * @returns The attribution text read from the browser-rendered host surface.
 */
export async function verify${pascalCase(manifest.id)}BrowserQc(page: Parameters<typeof createBrowserQcDriver>[0]) {
  const driver = createBrowserQcDriver(page);
  await driver.resize({ width: 390, height: 844 });
  await driver.readText("[role=status]");
  await driver.resize({ width: 1440, height: 900 });
  return driver.inspectAttribution();
}
`;
}

function generateQcRegistration(manifest: CartridgeManifest): string {
  return `${JSON.stringify({
    cartridgeId: manifest.id,
    qcRoute: manifest.qcRegistration.route,
    capabilities: manifest.capabilities,
    standardPackRelease: manifest.standardPackBinding.version,
  }, null, 2)}\n`;
}

function pascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function constantCase(kebab: string): string {
  return kebab.replaceAll("-", "_").toUpperCase();
}
