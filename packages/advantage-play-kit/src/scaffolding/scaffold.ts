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
    { path: "assets.ts", content: generateAssetsModule(manifest) },
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
 * Scene rendering is a game-owned concern; the scaffold provides the boundary
 * but does not implement rendering, responsive composition, or presentation.
 */

export function create${pascalCase(manifest.id)}Scene() {
  return {
    create() {
      // Game-owned scene initialization goes here.
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

export interface ${pascalCase(manifest.id)}PresentationProps {
  readonly prompt: string;
  readonly current: number;
  readonly total: number;
  readonly feedback?: string;
}

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

function generateAssetsModule(manifest: CartridgeManifest): string {
  return `import {
  materializeStandardAssetUnion,
  type StandardAssetCatalog,
} from "@reading-advantage/advantage-play-kit/assets";

export const SEMANTIC_ASSET_REQUIREMENTS = ${JSON.stringify(manifest.semanticAssetRequirements)} as const;

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

export const REQUIRED_CREDIT = "Pixel art assets by ElvGames" as const;
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

/** Provider adapter is supplied by the host's real-browser test runner. */
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
