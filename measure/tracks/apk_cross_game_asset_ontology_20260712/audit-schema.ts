import { z } from "zod";

const StableIdSchema = z.string().regex(/^[a-z]+:[a-z0-9][a-z0-9:-]*$/);
const EvidenceIdsSchema = z.array(StableIdSchema).min(1);

/** Confidence assigned after applying the audit source hierarchy. */
export const ConfidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "provisional",
]);

/** A source location that supports an audit claim. */
export const EvidenceSchema = z.object({
  id: StableIdSchema,
  kind: z.enum([
    "source",
    "test",
    "route",
    "measure",
    "history",
    "browser",
    "asset",
  ]),
  path: z.string().min(1),
  revision: z.string().min(1),
  lines: z.string().optional(),
  confidence: ConfidenceSchema,
  note: z.string().optional(),
});

/** A canonical game identity independent of copied host implementations. */
export const GameSchema = z.object({
  id: StableIdSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  inputMode: z.enum(["vocabulary", "sentence", "unknown"]),
  catalogState: z.enum([
    "playable",
    "withdrawn",
    "in-development",
    "planned",
    "missing",
    "stale",
  ]),
  routeState: z.enum(["present", "withdrawn", "missing", "not-applicable"]),
  confidence: ConfidenceSchema,
  evidenceIds: EvidenceIdsSchema,
  sceneIds: z.array(StableIdSchema).min(1),
  implementationPaths: z.array(z.string().min(1)).default([]),
  importedCopyPaths: z.array(z.string().min(1)).default([]),
  measureEvidencePaths: z.array(z.string().min(1)).default([]),
  assetRoots: z.array(z.string().min(1)).default([]),
});

/** A distinct gameplay scene or state requiring its own behavior and asset mapping. */
export const SceneSchema = z.object({
  id: StableIdSchema,
  gameId: StableIdSchema,
  name: z.string().min(1),
  evidenceIds: EvidenceIdsSchema,
});

/** The learning and gameplay loop that must survive a renderer rebuild. */
export const MechanicSchema = z.object({
  id: StableIdSchema,
  gameId: StableIdSchema,
  sceneIds: z.array(StableIdSchema).min(1),
  learningLoop: z.string().min(1),
  retainedBehavior: z.array(z.string().min(1)).min(1),
  redesignableBehavior: z.array(z.string().min(1)),
  evidenceIds: EvidenceIdsSchema,
});

/** A repeated or deliberately bespoke developer capability. */
export const CapabilitySchema = z.object({
  id: StableIdSchema,
  name: z.string().min(1),
  domain: z.string().min(1),
  disposition: z.enum([
    "retain",
    "standardize",
    "extend-existing",
    "bespoke",
    "retire",
  ]),
  consumerSceneIds: z.array(StableIdSchema),
  owner: z.string().min(1),
  extensionBoundary: z.string().min(1),
  minimumEvidence: z.array(z.string().min(1)).min(1),
  evidenceIds: EvidenceIdsSchema,
});

const ProfileSchema = z.object({
  strategy: z
    .array(
      z.enum([
        "reveal",
        "follow",
        "reflow",
        "stage",
        "panel",
        "fixed-mechanic",
      ]),
    )
    .min(1),
  inputModes: z
    .array(z.enum(["touch", "keyboard", "pointer", "hybrid"]))
    .min(1),
});

/** Compact and wide composition requirements for one canonical game. */
export const ResponsiveCompositionSchema = z.object({
  id: StableIdSchema,
  gameId: StableIdSchema,
  sceneIds: z.array(StableIdSchema).min(1),
  compact: ProfileSchema,
  wide: ProfileSchema,
  evidenceIds: EvidenceIdsSchema,
});

/** A semantic asset usage rather than a physical filename. */
export const AssetUsageSchema = z.object({
  id: StableIdSchema,
  family: z.enum([
    "character",
    "creature",
    "environment",
    "terrain",
    "structure",
    "prop",
    "hazard",
    "target",
    "pickup",
    "weapon",
    "projectile",
    "vfx",
    "audio",
    "ui",
    "control",
    "background",
    "indicator",
  ]),
  semanticRole: z.string().min(1),
  consumerSceneIds: z.array(StableIdSchema).min(1),
  capabilityIds: z.array(StableIdSchema),
  profileUsage: z.array(z.enum(["compact", "wide"])).min(1),
  disposition: z.enum(["reuse", "adapt", "replace", "reject", "gap"]),
  evidenceIds: EvidenceIdsSchema,
});

/** A visible contradiction between sources that must not be silently resolved. */
export const DiscrepancySchema = z.object({
  id: StableIdSchema,
  gameId: StableIdSchema.optional(),
  claim: z.string().min(1),
  resolution: z.string().min(1),
  evidenceIds: z.array(StableIdSchema).min(2),
  confidence: ConfidenceSchema,
});

/** Phase 1 corpus envelope used before mechanic and ontology mappings are added. */
export const GameCorpusSchema = z.object({
  version: z.literal("apk-corpus.v1"),
  sourceRevision: z.string().min(7),
  evidence: z.array(EvidenceSchema).min(1),
  games: z.array(GameSchema).min(1),
  scenes: z.array(SceneSchema).min(1),
  discrepancies: z.array(DiscrepancySchema),
});

/** Versioned machine-readable envelope for every ontology deliverable. */
export const AuditDatasetSchema = z.object({
  version: z.literal("apk-audit.v1"),
  evidence: z.array(EvidenceSchema).min(1),
  games: z.array(GameSchema).min(1),
  scenes: z.array(SceneSchema).min(1),
  mechanics: z.array(MechanicSchema).min(1),
  capabilities: z.array(CapabilitySchema).min(1),
  responsiveProfiles: z.array(ResponsiveCompositionSchema),
  assets: z.array(AssetUsageSchema),
  discrepancies: z.array(DiscrepancySchema),
});

/** A fully parsed APK audit dataset. */
export type AuditDataset = z.infer<typeof AuditDatasetSchema>;

/**
 * Reports broken cross-artifact references and required mapping omissions.
 * @param dataset Parsed audit dataset to inspect.
 * @returns Stable, human-readable validation errors; an empty array means valid.
 */
export function validateReferentialIntegrity(dataset: AuditDataset): string[] {
  const errors: string[] = [];
  const evidenceIds = new Set(dataset.evidence.map((item) => item.id));
  const gameIds = new Set(dataset.games.map((item) => item.id));
  const sceneIds = new Set(dataset.scenes.map((item) => item.id));
  const capabilityIds = new Set(dataset.capabilities.map((item) => item.id));

  const checkEvidence = (owner: { id: string; evidenceIds: string[] }) => {
    for (const evidenceId of owner.evidenceIds) {
      if (!evidenceIds.has(evidenceId))
        errors.push(`${owner.id} references missing evidence ${evidenceId}`);
    }
  };
  const checkScenes = (owner: { id: string }, ids: string[]) => {
    for (const sceneId of ids) {
      if (!sceneIds.has(sceneId))
        errors.push(`${owner.id} references missing scene ${sceneId}`);
    }
  };

  for (const game of dataset.games) {
    checkEvidence(game);
    checkScenes(game, game.sceneIds);
    if (!dataset.mechanics.some((item) => item.gameId === game.id))
      errors.push(`${game.id} has no mechanic blueprint`);
    if (!dataset.responsiveProfiles.some((item) => item.gameId === game.id))
      errors.push(`${game.id} has no responsive profile`);
  }
  for (const scene of dataset.scenes) {
    checkEvidence(scene);
    if (!gameIds.has(scene.gameId))
      errors.push(`${scene.id} references missing game ${scene.gameId}`);
  }
  for (const mechanic of dataset.mechanics) {
    checkEvidence(mechanic);
    checkScenes(mechanic, mechanic.sceneIds);
    if (!gameIds.has(mechanic.gameId))
      errors.push(`${mechanic.id} references missing game ${mechanic.gameId}`);
  }
  for (const capability of dataset.capabilities) {
    checkEvidence(capability);
    checkScenes(capability, capability.consumerSceneIds);
    if (
      capability.disposition === "standardize" &&
      capability.consumerSceneIds.length === 0
    ) {
      errors.push(`${capability.id} is standardize without source consumers`);
    }
  }
  for (const profile of dataset.responsiveProfiles) {
    checkEvidence(profile);
    checkScenes(profile, profile.sceneIds);
    if (!gameIds.has(profile.gameId))
      errors.push(`${profile.id} references missing game ${profile.gameId}`);
  }
  for (const asset of dataset.assets) {
    checkEvidence(asset);
    checkScenes(asset, asset.consumerSceneIds);
    for (const capabilityId of asset.capabilityIds) {
      if (!capabilityIds.has(capabilityId))
        errors.push(
          `${asset.id} references missing capability ${capabilityId}`,
        );
    }
  }
  for (const discrepancy of dataset.discrepancies) {
    checkEvidence(discrepancy);
    if (discrepancy.gameId && !gameIds.has(discrepancy.gameId))
      errors.push(
        `${discrepancy.id} references missing game ${discrepancy.gameId}`,
      );
  }

  return [...new Set(errors)].sort();
}
