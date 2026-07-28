/**
 * T10-accepted capability registry and successor-hash binding for the APK shared developer kit.
 *
 * Each accepted capability is bound to its exact extension-boundary contract
 * (shared core vs. game extension vs. transport-independent interface consequence),
 * the source games that supply its exact-evidence capability uses, and the
 * finding ids from `phase2-extension-boundaries-v5.json` that fix the boundary.
 *
 * The registry is the only authority for what shared reusable gameplay behavior
 * T11 may implement. Any capability id absent from this registry is blocked.
 */

/** Exact T10 successor-hash and standard-pack release identity accepted for T11. */
export interface AcceptedT10Inputs {
  /** SHA-256 of `accepted-successor-manifest-v1.json`. */
  readonly acceptedManifestSha256: "e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49";
  /** SHA-256 of `successor-hashes-v1.json`. */
  readonly successorHashesSha256: "c026c0bff62c3d6739c366fa80cb6593c455e96bffd2532a43223c829ec74005";
  /** SHA-256 of `product-owner-acceptance-v1.json`. */
  readonly ownerAcceptanceSha256: "165e21c9ddb5a6e0b2f61f3190d604fbb3133459b5f00331a8c66ee1e7572753";
  /** Accepted canonical standard-pack release version. */
  readonly standardPackReleaseVersion: "2026.07.23";
  /** Accepted catalog digest (matches `StandardAssetCatalog.digest`). */
  readonly standardPackCatalogDigest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087";
  /** Accepted source-receipt digest. */
  readonly standardPackSourceReceiptDigest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9";
  /** SHA-256 of the generated catalog artifact on disk. */
  readonly standardPackCatalogArtifactSha256: "ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932";
  /** Accepted release JSON SHA-256 (matches `accepted-standard-pack-release.json`). */
  readonly standardPackReleaseArtifactSha256: "61984e0b53c4ba85379cf6a4f0f33ee956665c4eaad4b3d681e3dccd98389844";
  /** Number of accepted runtime contracts (zero by T10 boundary). */
  readonly acceptedRuntimeContracts: 0;
  /** Number of approved asset mappings (zero by T10 boundary). */
  readonly approvedAssetMappings: 0;
  /** Number of blocked asset mappings pending approval. */
  readonly blockedAssetMappings: 85;
  /** Number of blocked responsive cells (354 contracts x 16 matrix rows). */
  readonly blockedResponsiveCells: 5664;
  /** Whether T10 accepted any browser-success claim. */
  readonly browserSuccessClaimed: false;
  /** Required attribution text every consumer of the standard pack must display. */
  readonly requiredCredit: "Pixel art assets by ElvGames";
}

/** One accepted capability bound to its exact extension-boundary contract. */
export interface AcceptedCapability {
  /** Stable capability identifier from the accepted ontology. */
  readonly id: string;
  /** Human-readable name of the atomic reusable dimension. */
  readonly name: string;
  /** Package that owns the shared core implementation. */
  readonly owningPackage: "@reading-advantage/advantage-play-kit";
  /** What the shared core owns, quoted from the accepted extension boundary. */
  readonly sharedCore: string;
  /** What games still own, quoted from the accepted extension boundary. */
  readonly gameExtensions: string;
  /** Transport-independent interface consequence, quoted from the accepted boundary. */
  readonly interfaceConsequence: string;
  /** Source game ids that supply exact-evidence capability uses. */
  readonly sourceGameIds: readonly string[];
  /** Exact `use:` capability-use identifiers backing this capability. */
  readonly sourceUseIds: readonly string[];
  /** Finding ids from `phase2-extension-boundaries-v5.json` that fix the boundary. */
  readonly extensionBoundaryFindingIds: readonly string[];
  /** Module path within `@reading-advantage/advantage-play-kit` that implements the shared core. */
  readonly sharedCoreModule: string;
}

/**
 * Blocked T11 scopes that must fail closed until a future acceptance expands them.
 *
 * Under the owner-authorized T11 extension, runtime, responsive, and presentation
 * forward-product contracts are implemented and consumable; only the 85 historical
 * canonical adoption mappings and unknown must-have capability values remain blocked.
 */
export interface BlockedScopes {
  /** Runtime forward-product contracts are implemented and unblocked. */
  readonly runtime: false;
  /** Responsive composition forward-product contracts are implemented and unblocked. */
  readonly responsive: false;
  /** Standard presentation component forward-product contracts are implemented and unblocked. */
  readonly presentation: false;
  /** The 85 canonical adoption mappings are blocked (zero approved). */
  readonly assetMappings: true;
  /** Unknown Must-have developer-capability values are blocked. */
  readonly unknownMustHaves: true;
}

/** Frozen manifest pinned by the developer kit and downstream cartridge cohorts. */
export interface AcceptedCapabilityManifest {
  readonly schemaVersion: 1;
  readonly trackId: "apk_shared_developer_kit_20260712";
  readonly capabilityIds: readonly string[];
  readonly capabilities: readonly AcceptedCapability[];
  readonly t10Inputs: AcceptedT10Inputs;
  readonly blockedScopes: BlockedScopes;
}

/** The exact seven T10-accepted capability identifiers, alphabetically ordered. */
export const ACCEPTED_CAPABILITY_IDS = Object.freeze([
  "capability:bounded-frame-delta",
  "capability:input-action-normalization",
  "capability:language-target-progression",
  "capability:nonempty-content-precondition",
  "capability:result-accounting",
  "capability:single-completion-emission",
  "capability:time-and-frame-loop",
] as const);

/** The exact T10 successor-hash and standard-pack identity accepted for T11. */
export const ACCEPTED_T10_INPUTS: AcceptedT10Inputs = Object.freeze({
  acceptedManifestSha256: "e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49",
  successorHashesSha256: "c026c0bff62c3d6739c366fa80cb6593c455e96bffd2532a43223c829ec74005",
  ownerAcceptanceSha256: "165e21c9ddb5a6e0b2f61f3190d604fbb3133459b5f00331a8c66ee1e7572753",
  standardPackReleaseVersion: "2026.07.23",
  standardPackCatalogDigest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
  standardPackSourceReceiptDigest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
  standardPackCatalogArtifactSha256: "ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932",
  standardPackReleaseArtifactSha256: "61984e0b53c4ba85379cf6a4f0f33ee956665c4eaad4b3d681e3dccd98389844",
  acceptedRuntimeContracts: 0,
  approvedAssetMappings: 0,
  blockedAssetMappings: 85,
  blockedResponsiveCells: 5664,
  browserSuccessClaimed: false,
  requiredCredit: "Pixel art assets by ElvGames",
} as const);

/** The seven accepted capabilities with their exact extension-boundary contracts. */
export const ACCEPTED_CAPABILITY_REGISTRY: readonly AcceptedCapability[] = Object.freeze([
  {
    id: "capability:bounded-frame-delta",
    name: "Active frame delta clamp",
    owningPackage: "@reading-advantage/advantage-play-kit",
    sharedCore: "Shared loop infrastructure owns elapsed-frame measurement and the 50 millisecond ceiling.",
    gameExtensions: "Each game owns its tick, adapter, rendering effects, cleanup, and terminal transitions.",
    interfaceConsequence: "A scheduler passes bounded delta to a transport-independent game callback.",
    sourceGameIds: ["babel-architect"],
    sourceUseIds: ["use:bounded-frame-delta:babel-architect:BA-HIST-011"],
    extensionBoundaryFindingIds: ["similarity:bounded-frame-delta:01", "similarity:bounded-frame-delta:02"],
    sharedCoreModule: "./systems/bounded-frame-loop.js",
  },
  {
    id: "capability:input-action-normalization",
    name: "Physical-to-semantic action normalization",
    owningPackage: "@reading-advantage/advantage-play-kit",
    sharedCore: "Shared adapters own translation from physical modalities to bounded semantic action identifiers.",
    gameExtensions: "Games own action vocabularies, gesture thresholds, hit regions, and whether an action is currently enabled.",
    interfaceConsequence: "Rules receive semantic actions and never depend on DOM, pointer, keyboard, touch, or engine event objects.",
    sourceGameIds: ["astral-mage", "dragon-rider", "enchanted-library", "griffin-riders-escape"],
    sourceUseIds: [
      "use:input-action-normalization:astral-mage:AM-UNK-002",
      "use:input-action-normalization:dragon-rider:DR-HIST-002",
      "use:input-action-normalization:enchanted-library:EL-CUR-003",
      "use:input-action-normalization:griffin-riders-escape:GRE-HIST-003",
    ],
    extensionBoundaryFindingIds: [
      "similarity:input-action-normalization:01",
      "similarity:input-action-normalization:02",
      "similarity:input-action-normalization:03",
    ],
    sharedCoreModule: "./systems/input-actions.js",
  },
  {
    id: "capability:language-target-progression",
    name: "Ordered target progression matcher",
    owningPackage: "@reading-advantage/advantage-play-kit",
    sharedCore: "Shared progression primitives own current-target matching and ordered index advancement.",
    gameExtensions: "Games own spatial selection, penalties, rewards, combo, trails, mastery, sentence changes, and terminal effects.",
    interfaceConsequence: "A pure matcher consumes stable target and candidate identity and returns progress without rendering or transport coupling.",
    sourceGameIds: ["astral-mage", "babel-architect", "dungeon-liberator", "enchanted-library", "griffin-riders-escape"],
    sourceUseIds: [
      "use:language-target-progression:astral-mage:AM-UNK-003",
      "use:language-target-progression:babel-architect:BA-HIST-004",
      "use:language-target-progression:dungeon-liberator:DL-HIST-001",
      "use:language-target-progression:enchanted-library:EL-CUR-005",
      "use:language-target-progression:griffin-riders-escape:GRE-HIST-002",
    ],
    extensionBoundaryFindingIds: [
      "similarity:language-target-progression:01",
      "similarity:language-target-progression:02",
      "similarity:language-target-progression:03",
      "similarity:language-target-progression:04",
    ],
    sharedCoreModule: "./systems/language-target-progression.js",
  },
  {
    id: "capability:nonempty-content-precondition",
    name: "Nonempty playable content guard",
    owningPackage: "@reading-advantage/advantage-play-kit",
    sharedCore: "A shared validation guard owns rejection of empty or blank playable content.",
    gameExtensions: "Games own error copy and all sentence, vocabulary, graph, circle, or target initialization after validation.",
    interfaceConsequence: "Backend or rules constructors consume a validated nonempty collection before game-specific setup.",
    sourceGameIds: ["abyssal-well", "archers-revenge", "astral-mage", "enchanted-library", "griffin-riders-escape"],
    sourceUseIds: [
      "use:nonempty-content-precondition:abyssal-well:AW-CUR-001",
      "use:nonempty-content-precondition:archers-revenge:AR-CUR-001",
      "use:nonempty-content-precondition:astral-mage:AM-UNK-001",
      "use:nonempty-content-precondition:enchanted-library:EL-CUR-001",
      "use:nonempty-content-precondition:griffin-riders-escape:GRE-CUR-001",
    ],
    extensionBoundaryFindingIds: [
      "similarity:nonempty-content-precondition:01",
      "similarity:nonempty-content-precondition:02",
      "similarity:nonempty-content-precondition:03",
    ],
    sharedCoreModule: "./systems/nonempty-content.js",
  },
  {
    id: "capability:result-accounting",
    name: "Typed result counters and XP calculator",
    owningPackage: "@reading-advantage/advantage-play-kit",
    sharedCore: "Shared result infrastructure owns typed counters, finite arithmetic, rounding declarations, and optional caps.",
    gameExtensions: "Games own formula weights, bonus policies, performance dimensions, and zero-attempt treatment.",
    interfaceConsequence: "A pure calculator accepts normalized performance counters plus an explicit game policy and returns XP.",
    sourceGameIds: ["abyssal-well", "alchemists-synthesis", "enchanted-library", "magic-defense"],
    sourceUseIds: [
      "use:result-accounting:abyssal-well:AW-CUR-004",
      "use:result-accounting:alchemists-synthesis:AS-CUR-002",
      "use:result-accounting:enchanted-library:EL-CUR-008",
      "use:result-accounting:magic-defense:MD-HIST-006",
    ],
    extensionBoundaryFindingIds: [
      "difference:result-accounting:01",
      "difference:result-accounting:02",
      "difference:result-accounting:03",
    ],
    sharedCoreModule: "./systems/result-accounting.js",
  },
  {
    id: "capability:single-completion-emission",
    name: "At-most-once terminal completion latch",
    owningPackage: "@reading-advantage/advantage-play-kit",
    sharedCore: "A shared completion latch owns at-most-once delivery for a terminal result.",
    gameExtensions: "Games own result construction, terminal phase mapping, diagnostics, fullscreen effects, and host payload shape.",
    interfaceConsequence: "The emitter accepts a completed result and callback without importing any UI or transport layer.",
    sourceGameIds: ["abyssal-well", "babel-architect", "enchanted-library", "griffin-riders-escape"],
    sourceUseIds: [
      "use:single-completion-emission:abyssal-well:AW-CUR-003",
      "use:single-completion-emission:babel-architect:BA-HIST-012",
      "use:single-completion-emission:enchanted-library:EL-CUR-007",
      "use:single-completion-emission:griffin-riders-escape:GRE-HIST-004",
    ],
    extensionBoundaryFindingIds: [
      "similarity:single-completion-emission:01",
      "similarity:single-completion-emission:02",
      "similarity:single-completion-emission:03",
    ],
    sharedCoreModule: "./systems/single-completion.js",
  },
  {
    id: "capability:time-and-frame-loop",
    name: "Bounded time threshold tick contract",
    owningPackage: "@reading-advantage/advantage-play-kit",
    sharedCore: "Shared timing primitives own bounded elapsed or remaining time and threshold detection.",
    gameExtensions: "Games own count direction, duration, terminal state, secondary health or stability predicates, and threshold effects.",
    interfaceConsequence: "A pure tick contract returns updated time and a threshold signal to game-owned rules.",
    sourceGameIds: ["babel-architect", "dragon-flight", "dragon-rider", "enchanted-library", "magic-defense"],
    sourceUseIds: [
      "use:time-and-frame-loop:babel-architect:BA-HIST-005",
      "use:time-and-frame-loop:dragon-flight:DF-HIST-001",
      "use:time-and-frame-loop:dragon-rider:DR-HIST-003",
      "use:time-and-frame-loop:enchanted-library:EL-CUR-006",
      "use:time-and-frame-loop:magic-defense:MD-HIST-005",
    ],
    extensionBoundaryFindingIds: [
      "similarity:time-and-frame-loop:01",
      "similarity:time-and-frame-loop:02",
      "difference:time-and-frame-loop:03",
    ],
    sharedCoreModule: "./systems/time-threshold.js",
  },
] as const);

/** Blocked T11 scopes that must fail closed until a future acceptance expands them. */
export const BLOCKED_SCOPES: BlockedScopes = Object.freeze({
  runtime: false,
  responsive: false,
  presentation: false,
  assetMappings: true,
  unknownMustHaves: true,
} as const);

/**
 * Builds a frozen accepted-capability manifest for downstream pinning and enforcement.
 * @returns An immutable manifest of the seven accepted capabilities, T10 inputs, and blocked scopes.
 */
export function buildAcceptedCapabilityManifest(): AcceptedCapabilityManifest {
  return Object.freeze({
    schemaVersion: 1,
    trackId: "apk_shared_developer_kit_20260712",
    capabilityIds: ACCEPTED_CAPABILITY_IDS,
    capabilities: ACCEPTED_CAPABILITY_REGISTRY,
    t10Inputs: ACCEPTED_T10_INPUTS,
    blockedScopes: BLOCKED_SCOPES,
  });
}
