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
  readonly semanticAssetRequirements: readonly string[];
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
  const manifest = validateCartridgeManifest({
    schemaVersion: 1,
    id: options.id,
    title: options.title,
    description: options.description,
    version: "0.1.0",
    runtimeApiVersion: "1.0.0",
    inputMode: options.inputMode,
    capabilities: options.capabilities as readonly string[],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: options.semanticAssetRequirements,
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
  });

  const files: ScaffoldFile[] = [
    { path: "manifest.json", content: generateManifestJson(manifest) },
    { path: "logic.ts", content: generateLogicModule(manifest) },
    { path: "scene.ts", content: generateSceneModule(manifest) },
    { path: "responsive.ts", content: generateResponsiveModule() },
    { path: "presentation.tsx", content: generatePresentationModule(manifest) },
    { path: "assets.ts", content: generateAssetsModule(manifest, semanticStateRequirements) },
    { path: "attribution.ts", content: generateAttributionModule() },
    { path: "logic.test.ts", content: generateLogicTest(manifest) },
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
  return `/**
 * ${manifest.title} scene stub.
 * Scene rendering remains game-owned. Descriptor frame order and timing remain
 * presentation-owned, so this boundary never assumes a frame count.
 */

import {
  createDescriptorDrivenPresentationAdapter,
  type AssetContractV2SemanticRegistration,
} from "@reading-advantage/advantage-play-kit/assets";

/**
 * Creates the game-owned scene boundary for the generated cartridge.
 * @param registration Resolver-issued semantic descriptor registration.
 * @returns A game-owned scene boundary with descriptor-driven clip playback.
 */
export function create${pascalCase(manifest.id)}Scene(registration: AssetContractV2SemanticRegistration) {
  createDescriptorDrivenPresentationAdapter([], [registration]);
  const descriptor = registration.descriptor;

  return {
    create() {
      // Game-owned scene initialization goes here.
    },
    /** Returns descriptor-owned clip behavior without imposing a game frame count. */
    playDescriptorClip(clipId: string) {
      const clip = descriptor.clips?.find((candidate) => candidate.id === clipId);
      if (!clip) throw new Error(\`Descriptor \${descriptor.descriptorId} does not define clip \${clipId}\`);
      return Object.freeze({
        frames: clip.frames,
        fps: clip.timing.fps,
        loop: clip.timing.loop,
        anchor: descriptor.anchor,
        renderScale: descriptor.renderScale,
      });
    },
    update() {
      // Game-owned per-tick update goes here.
    },
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

function generateAssetsModule(manifest: CartridgeManifest, semanticStateRequirements: readonly AssetContractV2SemanticRequirement[] = []): string {
  return `import {
  materializeStandardAssetUnion,
  type AssetContractV2SemanticResolver,
  type StandardAssetCatalog,
} from "@reading-advantage/advantage-play-kit/assets";

/** Semantic catalog keys selected by the generated cartridge. */
export const SEMANTIC_ASSET_REQUIREMENTS = ${JSON.stringify(manifest.semanticAssetRequirements)} as const;
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
