import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;
type EvidenceReference = {
  artifact: string;
  json_pointer: string;
  claim_id: string;
};
type RoleSpec = {
  role_id: string;
  semantic: EvidenceReference;
  physical: EvidenceReference;
  decision: EvidenceReference;
};
type TitleSpec = {
  title_id: string;
  source_identity_id: string;
  source_manifest_path: string;
  evidence_binding: "accepted_traversal_batch_a" | "accepted_traversal_batch_b";
  evidence_manifest_path: string;
  roles: readonly RoleSpec[];
};

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const TRACK_ID = "apk_legacy_traversal_cutover_20260727";
const TRACK_ROOT = `measure/tracks/${TRACK_ID}`;
const DOSSIER_ROOT = `${TRACK_ROOT}/phase2-binding-dossiers`;

const ACCEPTED_BATCH_A =
  "measure/archive/apk_corpus_audit_traversal_exploration_20260712/accepted-cohort-manifest-batch-a-v6.json";
const ACCEPTED_BATCH_B =
  "measure/archive/apk_corpus_audit_traversal_exploration_20260712/accepted-cohort-manifest-batch-b-v2.json";
const ASSET_CONTRACT_REVIEW =
  "measure/archive/apk_asset_contract_v2_20260728/current-byte-independent-review-v3.json";
const ASSET_CONTRACT_SOURCE =
  "packages/advantage-play-kit/src/assets/asset-contract-v2.ts";
const SUITABILITY_ACCEPTANCE =
  "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/product-owner-acceptance-v2.json";
const ASSET_CONTRACT_SOURCE_SHA256 =
  "96f745479559ae35b918204738073eec183d05b2e9c79556b00217bd07fb2da2";

const ACCEPTED_RELEASE = Object.freeze({
  version: "2026.07.23",
  catalogDigest:
    "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
  sourceReceiptDigest:
    "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
});

const claim = (
  artifact: string,
  json_pointer: string,
  claim_id: string,
): EvidenceReference => ({ artifact, json_pointer, claim_id });

const DRAGON_EVIDENCE =
  "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/claim-evidence-ledger-v3.json";
const SPELLWEAVER_EVIDENCE =
  "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json";
const SHADOW_EVIDENCE =
  "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/shadow-gate-dungeon/claim-evidence-ledger-v2.json";
const LABYRINTH_EVIDENCE =
  "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/labyrinth-goblin-king/claim-evidence-ledger-batch-b-v2.json";
const GRIFFIN_EVIDENCE =
  "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/griffin-riders-escape/claim-evidence-ledger-v2.json";

const EXPECTED_TITLES: readonly TitleSpec[] = [
  {
    title_id: "dragon-rider",
    source_identity_id: "vocabulary/dragon-rider",
    source_manifest_path: `${TRACK_ROOT}/legacy-source-manifests/dragon-rider.json`,
    evidence_binding: "accepted_traversal_batch_a",
    evidence_manifest_path: ACCEPTED_BATCH_A,
    roles: [
      {
        role_id: "player-avatar",
        semantic: claim(DRAGON_EVIDENCE, "/claim_atoms/1", "DR-STATE-001B"),
        physical: claim(DRAGON_EVIDENCE, "/claim_atoms/4", "DR-ASSET-001A"),
        decision: claim(DRAGON_EVIDENCE, "/claim_atoms/7", "DR-TEST-001B"),
      },
      {
        role_id: "traversal-gate",
        semantic: claim(DRAGON_EVIDENCE, "/claim_atoms/3", "DR-SCENE-002B"),
        physical: claim(DRAGON_EVIDENCE, "/claim_atoms/4", "DR-ASSET-001A"),
        decision: claim(DRAGON_EVIDENCE, "/claim_atoms/6", "DR-TEST-001A"),
      },
      {
        role_id: "learning-feedback",
        semantic: claim(DRAGON_EVIDENCE, "/claim_atoms/0", "DR-STATE-001A"),
        physical: claim(DRAGON_EVIDENCE, "/claim_atoms/4", "DR-ASSET-001A"),
        decision: claim(DRAGON_EVIDENCE, "/claim_atoms/7", "DR-TEST-001B"),
      },
    ],
  },
  {
    title_id: "spellweavers-run",
    source_identity_id: "catalog/spellweavers-run",
    source_manifest_path: `${TRACK_ROOT}/legacy-source-manifests/spellweavers-run.json`,
    evidence_binding: "accepted_traversal_batch_a",
    evidence_manifest_path: ACCEPTED_BATCH_A,
    roles: [
      {
        role_id: "player-lane",
        semantic: claim(SPELLWEAVER_EVIDENCE, "/13", "SW-MOVE-001"),
        physical: claim(SPELLWEAVER_EVIDENCE, "/37", "SW-CART-001"),
        decision: claim(SPELLWEAVER_EVIDENCE, "/28", "SW-INPUT-002"),
      },
      {
        role_id: "word-orb",
        semantic: claim(SPELLWEAVER_EVIDENCE, "/19", "SW-TRANS-002"),
        physical: claim(SPELLWEAVER_EVIDENCE, "/33", "SW-ASSET-001"),
        decision: claim(SPELLWEAVER_EVIDENCE, "/18", "SW-COLL-001"),
      },
      {
        role_id: "learning-feedback",
        semantic: claim(SPELLWEAVER_EVIDENCE, "/25", "SW-TRANS-005"),
        physical: claim(SPELLWEAVER_EVIDENCE, "/35", "SW-UI-001"),
        decision: claim(SPELLWEAVER_EVIDENCE, "/36", "SW-TRANS-007"),
      },
    ],
  },
  {
    title_id: "shadow-gate-dungeon",
    source_identity_id: "sentence/shadow-gate-dungeon",
    source_manifest_path: `${TRACK_ROOT}/legacy-source-manifests/shadow-gate-dungeon.json`,
    evidence_binding: "accepted_traversal_batch_b",
    evidence_manifest_path: ACCEPTED_BATCH_B,
    roles: [
      {
        role_id: "player-movement",
        semantic: claim(SHADOW_EVIDENCE, "/claims/6", "SGD-MOVE-001"),
        physical: claim(SHADOW_EVIDENCE, "/claims/13", "SGD-RESP-001"),
        decision: claim(SHADOW_EVIDENCE, "/claims/4", "SGD-INPUT-001"),
      },
      {
        role_id: "creature-hazard",
        semantic: claim(SHADOW_EVIDENCE, "/claims/7", "SGD-STEALTH-002"),
        physical: claim(SHADOW_EVIDENCE, "/claims/9", "SGD-COLL-001"),
        decision: claim(SHADOW_EVIDENCE, "/claims/3", "SGD-STEALTH-001"),
      },
      {
        role_id: "ordered-crystal-learning",
        semantic: claim(SHADOW_EVIDENCE, "/claims/10", "SGD-PROG-001"),
        physical: claim(SHADOW_EVIDENCE, "/claims/11", "SGD-TRANS-001"),
        decision: claim(SHADOW_EVIDENCE, "/claims/14", "SGD-RESULT-001"),
      },
    ],
  },
  {
    title_id: "labyrinth-goblin-king",
    source_identity_id: "sentence/labyrinth-goblin-king",
    source_manifest_path: `${TRACK_ROOT}/legacy-source-manifests/labyrinth-goblin-king.json`,
    evidence_binding: "accepted_traversal_batch_b",
    evidence_manifest_path: ACCEPTED_BATCH_B,
    roles: [
      {
        role_id: "player-maze",
        semantic: claim(LABYRINTH_EVIDENCE, "/claim_atoms/4", "LGK-MOVE-001"),
        physical: claim(LABYRINTH_EVIDENCE, "/claim_atoms/1", "LGK-MAZE-001"),
        decision: claim(LABYRINTH_EVIDENCE, "/claim_atoms/5", "LGK-COLL-001"),
      },
      {
        role_id: "ordered-word-orb",
        semantic: claim(LABYRINTH_EVIDENCE, "/claim_atoms/6", "LGK-ORB-001"),
        physical: claim(LABYRINTH_EVIDENCE, "/claim_atoms/3", "LGK-CONFIG-001"),
        decision: claim(LABYRINTH_EVIDENCE, "/claim_atoms/7", "LGK-TRANS-001"),
      },
      {
        role_id: "goblin-hazard",
        semantic: claim(LABYRINTH_EVIDENCE, "/claim_atoms/9", "LGK-GOBLIN-001"),
        physical: claim(LABYRINTH_EVIDENCE, "/claim_atoms/3", "LGK-CONFIG-001"),
        decision: claim(LABYRINTH_EVIDENCE, "/claim_atoms/8", "LGK-TRANS-002"),
      },
    ],
  },
  {
    title_id: "griffin-riders-escape",
    source_identity_id: "catalog/griffin-riders-escape",
    source_manifest_path: `${TRACK_ROOT}/legacy-source-manifests/griffin-riders-escape.json`,
    evidence_binding: "accepted_traversal_batch_b",
    evidence_manifest_path: ACCEPTED_BATCH_B,
    roles: [
      {
        role_id: "player-lane",
        semantic: claim(GRIFFIN_EVIDENCE, "/claims/3", "GRF-MOVE-001"),
        physical: claim(GRIFFIN_EVIDENCE, "/claims/10", "GRF-CART-001"),
        decision: claim(GRIFFIN_EVIDENCE, "/claims/8", "GRF-INPUT-001"),
      },
      {
        role_id: "target-gate",
        semantic: claim(GRIFFIN_EVIDENCE, "/claims/6", "GRF-TRANS-001"),
        physical: claim(GRIFFIN_EVIDENCE, "/claims/4", "GRF-WAVE-001"),
        decision: claim(GRIFFIN_EVIDENCE, "/claims/5", "GRF-COLL-001"),
      },
      {
        role_id: "learning-feedback",
        semantic: claim(GRIFFIN_EVIDENCE, "/claims/2", "GRF-START-001"),
        physical: claim(GRIFFIN_EVIDENCE, "/claims/8", "GRF-INPUT-001"),
        decision: claim(GRIFFIN_EVIDENCE, "/claims/6", "GRF-TRANS-001"),
      },
    ],
  },
] as const;

function loadJsonValue(relativePath: string): unknown {
  return JSON.parse(
    readFileSync(resolve(REPO_ROOT, relativePath), "utf8"),
  ) as unknown;
}

function loadJson(relativePath: string): JsonObject {
  const value = loadJsonValue(relativePath);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`INVALID_JSON_OBJECT: ${relativePath}`);
  }
  return value as JsonObject;
}

function sha256File(relativePath: string): string {
  return createHash("sha256")
    .update(readFileSync(resolve(REPO_ROOT, relativePath)))
    .digest("hex");
}

function objectValue(value: unknown, label: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`INVALID_OBJECT: ${label}`);
  }
  return value as JsonObject;
}

function arrayValue(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`INVALID_ARRAY: ${label}`);
  return value;
}

function requireEqual(actual: unknown, expected: unknown, code: string): void {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(code);
}

function requireKeys(
  value: JsonObject,
  keys: readonly string[],
  code: string,
): void {
  requireEqual(Object.keys(value).sort(), [...keys].sort(), code);
}

function jsonPointerValue(value: unknown, pointer: string): unknown {
  if (pointer === "") return value;
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, segment) => {
      if (Array.isArray(current)) return current[Number(segment)];
      if (typeof current === "object" && current !== null) {
        return (current as JsonObject)[segment];
      }
      return undefined;
    }, value);
}

function acceptedInput(path: string): JsonObject {
  return { path, sha256: sha256File(path) };
}

function expectedAcceptedInputs(title: TitleSpec): JsonObject {
  return {
    asset_contract_v2_review: acceptedInput(ASSET_CONTRACT_REVIEW),
    asset_contract_v2_source: {
      path: ASSET_CONTRACT_SOURCE,
      sha256: ASSET_CONTRACT_SOURCE_SHA256,
    },
    suitability_governance: acceptedInput(SUITABILITY_ACCEPTANCE),
    traversal_evidence: acceptedInput(title.evidence_manifest_path),
  };
}

function assertAcceptedInputs(dossier: JsonObject, title: TitleSpec): void {
  const inputs = objectValue(dossier.accepted_inputs, "accepted_inputs");
  requireEqual(
    inputs,
    expectedAcceptedInputs(title),
    `ACCEPTED_INPUT_BINDING_DRIFT: ${title.title_id}`,
  );

  const assetReview = loadJson(ASSET_CONTRACT_REVIEW);
  requireEqual(
    assetReview.status,
    "accepted-technical-review-owner-decision-required",
    "ASSET_CONTRACT_REVIEW_STATUS_UNSUPPORTED",
  );
  const currentContract = objectValue(
    objectValue(assetReview.current_bindings, "current_bindings").contract,
    "current_bindings.contract",
  );
  requireEqual(
    currentContract.sha256,
    ASSET_CONTRACT_SOURCE_SHA256,
    "ASSET_CONTRACT_SOURCE_BINDING_DRIFT",
  );
  const assetScope = objectValue(assetReview.scope, "asset review scope");
  const excluded = arrayValue(
    assetScope.excluded,
    "asset review scope.excluded",
  ).map(String);
  if (!excluded.includes("title adoption")) {
    throw new Error("ASSET_CONTRACT_SCOPE_OVERCLAIM");
  }

  const suitability = loadJson(SUITABILITY_ACCEPTANCE);
  requireEqual(
    suitability.decision,
    "ACCEPT_BOUNDED_EVIDENCE_ONLY_INGESTION_GOVERNANCE",
    "SUITABILITY_ACCEPTANCE_UNSUPPORTED",
  );
  const authorization = objectValue(
    suitability.authorization,
    "suitability authorization",
  );
  requireEqual(
    authorization.titleAdoptionAuthorized,
    false,
    "SUITABILITY_ACCEPTANCE_OVERCLAIM",
  );
  requireEqual(
    objectValue(suitability.real_asset_disposition, "real_asset_disposition")
      .status,
    "blocked",
    "SUITABILITY_REAL_ASSET_STATUS_UNSUPPORTED",
  );
}

function assertAcceptedTraversalEvidence(title: TitleSpec): void {
  const manifest = loadJson(title.evidence_manifest_path);
  requireEqual(manifest.status, "accepted", "TRAVERSAL_EVIDENCE_STATUS_DRIFT");
  requireEqual(manifest.revoked, false, "TRAVERSAL_EVIDENCE_REVOKED");
  requireEqual(manifest.consumable, true, "TRAVERSAL_EVIDENCE_NOT_CONSUMABLE");
  const scope = objectValue(manifest.scope, "traversal evidence scope");
  const packages = arrayValue(scope.packages, "traversal evidence packages");
  if (!packages.includes(title.source_identity_id)) {
    throw new Error(`TRAVERSAL_EVIDENCE_ROSTER_MISSING: ${title.title_id}`);
  }
  const excludedUse = arrayValue(
    scope.excluded_use,
    "traversal evidence excluded use",
  )
    .map(String)
    .join(" ")
    .toLowerCase();
  if (
    !excludedUse.includes("implementation") ||
    !excludedUse.includes("asset")
  ) {
    throw new Error(`TRAVERSAL_EVIDENCE_SCOPE_OVERCLAIM: ${title.title_id}`);
  }
}

function assertEvidenceReference(
  actual: unknown,
  expected: EvidenceReference,
  label: string,
): void {
  const reference = objectValue(actual, label);
  requireKeys(
    reference,
    ["artifact", "claim_id", "json_pointer"],
    `EVIDENCE_REFERENCE_SCHEMA: ${label}`,
  );
  requireEqual(reference, expected, `EVIDENCE_REFERENCE_DRIFT: ${label}`);
  const claimValue = jsonPointerValue(
    loadJsonValue(expected.artifact),
    expected.json_pointer,
  );
  const claimObject = objectValue(claimValue, `${label}: claim`);
  requireEqual(
    claimObject.claim_id,
    expected.claim_id,
    `EVIDENCE_CLAIM_DRIFT: ${label}`,
  );
}

function createPhysicalDescriptor(
  title: TitleSpec,
  role: RoleSpec,
): JsonObject {
  return {
    contractVersion: 2,
    descriptorId: `${title.title_id}-${role.role_id}-descriptor`,
    catalogEntryKey: `${title.title_id}/${role.role_id}`,
    release: { ...ACCEPTED_RELEASE },
    mediaKind: "animation",
    geometry: {
      width: 32,
      height: 32,
      frameWidth: 32,
      frameHeight: 32,
      columns: 1,
      rows: 1,
    },
    clips: [
      {
        id: "walk",
        frames: [{ column: 0, row: 0 }],
        timing: { fps: 8, loop: true },
      },
    ],
    directions: [{ direction: "down", clipId: "walk" }],
    anchor: { x: 0.5, y: 1 },
    renderScale: 1,
    collisionEnvelope: { x: 0.2, y: 0.1, width: 0.6, height: 0.9 },
    readabilityEnvelope: { minimumRenderPixels: 16, minimumContrastRatio: 1 },
  };
}

function createValidDossier(title: TitleSpec): JsonObject {
  const roles = title.roles.map((role) => ({
    role_id: role.role_id,
    required: true,
    semantic: {
      role: role.role_id,
      state: "active",
      intent: `Preserve the accepted ${role.role_id} traversal role without adopting unknown behavior.`,
    },
    physical_descriptor: createPhysicalDescriptor(title, role),
    evidence: {
      semantic: { ...role.semantic },
      physical: { ...role.physical },
      decision: { ...role.decision },
    },
  }));
  const decisions = title.roles.map((role) => ({
    role_id: role.role_id,
    outcome: "blocked",
    rationale:
      "Accepted evidence does not establish suitable physical asset adoption.",
    selected_asset_key: null,
    evidence: [role.semantic, role.physical, role.decision].map(
      (reference) => ({ ...reference }),
    ),
  }));

  return {
    schema_version: "apk-legacy-traversal-binding-dossier.v1",
    track_id: TRACK_ID,
    title_id: title.title_id,
    status: "candidate",
    source_manifest: {
      path: title.source_manifest_path,
      sha256: sha256File(title.source_manifest_path),
      evidence_binding: title.evidence_binding,
      status: "evidence-only",
    },
    accepted_inputs: expectedAcceptedInputs(title),
    release: { ...ACCEPTED_RELEASE },
    semantic_roles: roles,
    physical_descriptors: roles.map((role) => ({
      role_id: role.role_id,
      descriptor: role.physical_descriptor,
    })),
    decisions,
    delivery: {
      materialization: "selected-union-only",
      selected_union_keys: [],
      whole_pack_default: false,
      app_local_asset_copies: false,
      fallback: "none",
    },
    owner_acceptance: {
      status: "pending",
      required_before_green: true,
      receipt: null,
    },
  };
}

function assertPhysicalDescriptor(
  value: unknown,
  title: TitleSpec,
  role: RoleSpec,
): void {
  const descriptor = objectValue(
    value,
    `${title.title_id}:${role.role_id}: descriptor`,
  );
  requireKeys(
    descriptor,
    [
      "anchor",
      "catalogEntryKey",
      "clips",
      "collisionEnvelope",
      "contractVersion",
      "descriptorId",
      "directions",
      "geometry",
      "mediaKind",
      "readabilityEnvelope",
      "release",
      "renderScale",
    ],
    `PHYSICAL_DESCRIPTOR_SCHEMA: ${title.title_id}:${role.role_id}`,
  );
  requireEqual(
    descriptor.contractVersion,
    2,
    "PHYSICAL_DESCRIPTOR_VERSION_UNSUPPORTED",
  );
  requireEqual(
    descriptor.release,
    ACCEPTED_RELEASE,
    `PHYSICAL_DESCRIPTOR_RELEASE_DRIFT: ${title.title_id}:${role.role_id}`,
  );
  if (
    typeof descriptor.catalogEntryKey !== "string" ||
    !/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/u.test(descriptor.catalogEntryKey) ||
    descriptor.catalogEntryKey.includes("//") ||
    descriptor.catalogEntryKey.includes(".")
  ) {
    throw new Error(
      `PHYSICAL_DESCRIPTOR_PATH_UNSAFE: ${title.title_id}:${role.role_id}`,
    );
  }
  const geometry = objectValue(descriptor.geometry, "physical geometry");
  for (const key of [
    "width",
    "height",
    "frameWidth",
    "frameHeight",
    "columns",
    "rows",
  ]) {
    if (typeof geometry[key] !== "number" || geometry[key] <= 0) {
      throw new Error(
        `PHYSICAL_DESCRIPTOR_GEOMETRY_INVALID: ${title.title_id}:${role.role_id}`,
      );
    }
  }
  const clips = arrayValue(descriptor.clips, "physical clips");
  if (clips.length === 0) throw new Error("PHYSICAL_DESCRIPTOR_CLIPS_MISSING");
  const directions = arrayValue(descriptor.directions, "physical directions");
  if (directions.length === 0)
    throw new Error("PHYSICAL_DESCRIPTOR_DIRECTIONS_MISSING");
  const anchor = objectValue(descriptor.anchor, "physical anchor");
  if (typeof anchor.x !== "number" || typeof anchor.y !== "number") {
    throw new Error("PHYSICAL_DESCRIPTOR_ANCHOR_INVALID");
  }
  const collision = objectValue(
    descriptor.collisionEnvelope,
    "physical collision",
  );
  if (
    typeof collision.width !== "number" ||
    typeof collision.height !== "number"
  ) {
    throw new Error("PHYSICAL_DESCRIPTOR_COLLISION_INVALID");
  }
  const readability = objectValue(
    descriptor.readabilityEnvelope,
    "physical readability",
  );
  if (
    typeof readability.minimumRenderPixels !== "number" ||
    typeof readability.minimumContrastRatio !== "number"
  ) {
    throw new Error("PHYSICAL_DESCRIPTOR_READABILITY_INVALID");
  }
}

function assertDossier(dossier: JsonObject, title: TitleSpec): void {
  requireKeys(
    dossier,
    [
      "accepted_inputs",
      "decisions",
      "delivery",
      "owner_acceptance",
      "physical_descriptors",
      "release",
      "schema_version",
      "semantic_roles",
      "source_manifest",
      "status",
      "title_id",
      "track_id",
    ],
    `DOSSIER_SCHEMA_INVALID: ${title.title_id}`,
  );
  requireEqual(
    dossier.schema_version,
    "apk-legacy-traversal-binding-dossier.v1",
    "DOSSIER_VERSION_UNSUPPORTED",
  );
  requireEqual(dossier.track_id, TRACK_ID, "DOSSIER_SCOPE_DRIFT");
  requireEqual(dossier.title_id, title.title_id, "DOSSIER_TITLE_DRIFT");
  requireEqual(dossier.status, "candidate", "DOSSIER_STATUS_UNSUPPORTED");
  requireEqual(
    dossier.release,
    ACCEPTED_RELEASE,
    "STALE_STANDARD_PACK_RELEASE",
  );

  const sourceManifest = objectValue(
    dossier.source_manifest,
    "source_manifest",
  );
  requireKeys(
    sourceManifest,
    ["evidence_binding", "path", "sha256", "status"],
    "SOURCE_MANIFEST_BINDING_SCHEMA",
  );
  requireEqual(
    sourceManifest.path,
    title.source_manifest_path,
    "SOURCE_MANIFEST_PATH_DRIFT",
  );
  requireEqual(
    sourceManifest.sha256,
    sha256File(title.source_manifest_path),
    "STALE_SOURCE_MANIFEST_DIGEST",
  );
  requireEqual(
    sourceManifest.evidence_binding,
    title.evidence_binding,
    "SOURCE_MANIFEST_EVIDENCE_DRIFT",
  );
  requireEqual(
    sourceManifest.status,
    "evidence-only",
    "SOURCE_MANIFEST_AUTHORITY_OVERCLAIM",
  );
  const sourceManifestBytes = loadJson(title.source_manifest_path);
  requireEqual(
    sourceManifestBytes.title_id,
    title.title_id,
    "SOURCE_MANIFEST_TITLE_DRIFT",
  );
  requireEqual(
    sourceManifestBytes.source_identity_id,
    title.source_identity_id,
    "SOURCE_MANIFEST_IDENTITY_DRIFT",
  );
  requireEqual(
    sourceManifestBytes.status,
    "evidence-only",
    "SOURCE_MANIFEST_STATUS_DRIFT",
  );
  const sourceClaims = objectValue(
    sourceManifestBytes.claims,
    "source manifest claims",
  );
  if (Object.values(sourceClaims).some((value) => value !== false)) {
    throw new Error("SOURCE_MANIFEST_AUTHORITY_OVERCLAIM");
  }

  assertAcceptedInputs(dossier, title);
  assertAcceptedTraversalEvidence(title);

  const semanticRoles = arrayValue(dossier.semantic_roles, "semantic_roles");
  requireEqual(
    semanticRoles.map((value) => objectValue(value, "semantic role").role_id),
    title.roles.map((role) => role.role_id),
    `SEMANTIC_ROLE_SET_DRIFT: ${title.title_id}`,
  );
  for (const [index, rawRole] of semanticRoles.entries()) {
    const role = objectValue(rawRole, `semantic role ${index}`);
    const expectedRole = title.roles[index]!;
    requireKeys(
      role,
      ["evidence", "physical_descriptor", "required", "role_id", "semantic"],
      "SEMANTIC_ROLE_SCHEMA_INVALID",
    );
    requireEqual(
      role.required,
      true,
      `MUST_HAVE_ROLE_NOT_REQUIRED: ${expectedRole.role_id}`,
    );
    const semantic = objectValue(
      role.semantic,
      `${expectedRole.role_id}: semantic`,
    );
    requireKeys(
      semantic,
      ["intent", "role", "state"],
      `SEMANTIC_ROLE_CONTRACT_INVALID: ${expectedRole.role_id}`,
    );
    requireEqual(
      semantic.role,
      expectedRole.role_id,
      `SEMANTIC_ROLE_ID_DRIFT: ${expectedRole.role_id}`,
    );
    if (typeof semantic.intent !== "string" || semantic.intent.length === 0) {
      throw new Error(`SEMANTIC_ROLE_INTENT_MISSING: ${expectedRole.role_id}`);
    }
    const evidence = objectValue(
      role.evidence,
      `${expectedRole.role_id}: evidence`,
    );
    requireKeys(
      evidence,
      ["decision", "physical", "semantic"],
      `ROLE_EVIDENCE_SCHEMA_INVALID: ${expectedRole.role_id}`,
    );
    assertEvidenceReference(
      evidence.semantic,
      expectedRole.semantic,
      `${expectedRole.role_id}: semantic evidence`,
    );
    assertEvidenceReference(
      evidence.physical,
      expectedRole.physical,
      `${expectedRole.role_id}: physical evidence`,
    );
    assertEvidenceReference(
      evidence.decision,
      expectedRole.decision,
      `${expectedRole.role_id}: decision evidence`,
    );
    assertPhysicalDescriptor(role.physical_descriptor, title, expectedRole);
  }

  const descriptors = arrayValue(
    dossier.physical_descriptors,
    "physical_descriptors",
  );
  requireEqual(
    descriptors.map(
      (value) => objectValue(value, "physical descriptor binding").role_id,
    ),
    title.roles.map((role) => role.role_id),
    `PHYSICAL_DESCRIPTOR_ROLE_SET_DRIFT: ${title.title_id}`,
  );
  for (const [index, rawDescriptor] of descriptors.entries()) {
    const descriptor = objectValue(
      rawDescriptor,
      `physical descriptor ${index}`,
    );
    const role = title.roles[index]!;
    requireKeys(
      descriptor,
      ["descriptor", "role_id"],
      "PHYSICAL_DESCRIPTOR_BINDING_SCHEMA",
    );
    requireEqual(
      descriptor.role_id,
      role.role_id,
      `PHYSICAL_DESCRIPTOR_ROLE_DRIFT: ${role.role_id}`,
    );
    const semanticRole = objectValue(
      semanticRoles[index],
      `semantic role ${index}`,
    );
    requireEqual(
      descriptor.descriptor,
      semanticRole.physical_descriptor,
      `PHYSICAL_DESCRIPTOR_BINDING_DRIFT: ${role.role_id}`,
    );
    assertPhysicalDescriptor(descriptor.descriptor, title, role);
  }

  const decisions = arrayValue(dossier.decisions, "decisions");
  requireEqual(
    decisions.map((value) => objectValue(value, "decision").role_id),
    title.roles.map((role) => role.role_id),
    `DECISION_ROLE_SET_DRIFT: ${title.title_id}`,
  );
  for (const [index, rawDecision] of decisions.entries()) {
    const decision = objectValue(rawDecision, `decision ${index}`);
    const role = title.roles[index]!;
    requireKeys(
      decision,
      ["evidence", "outcome", "rationale", "role_id", "selected_asset_key"],
      "DECISION_SCHEMA_INVALID",
    );
    requireEqual(
      decision.role_id,
      role.role_id,
      `DECISION_ROLE_DRIFT: ${role.role_id}`,
    );
    if (
      decision.outcome !== "reuse-canonical" &&
      decision.outcome !== "ingest-canonical" &&
      decision.outcome !== "blocked"
    ) {
      throw new Error(`UNKNOWN_MUST_HAVE_ADOPTION: ${role.role_id}`);
    }
    if (decision.outcome !== "blocked") {
      throw new Error(`UNKNOWN_MUST_HAVE_ADOPTION: ${role.role_id}`);
    }
    requireEqual(
      decision.selected_asset_key,
      null,
      `BLOCKED_ROLE_SELECTED_ASSET: ${role.role_id}`,
    );
    const decisionEvidence = arrayValue(
      decision.evidence,
      `${role.role_id}: decision evidence`,
    );
    requireEqual(
      decisionEvidence,
      [role.semantic, role.physical, role.decision],
      `DECISION_EVIDENCE_DRIFT: ${role.role_id}`,
    );
    for (const [evidenceIndex, reference] of decisionEvidence.entries()) {
      assertEvidenceReference(
        reference,
        [role.semantic, role.physical, role.decision][evidenceIndex]!,
        `${role.role_id}: decision evidence ${evidenceIndex}`,
      );
    }
  }

  const delivery = objectValue(dossier.delivery, "delivery");
  requireKeys(
    delivery,
    [
      "app_local_asset_copies",
      "fallback",
      "materialization",
      "selected_union_keys",
      "whole_pack_default",
    ],
    "DELIVERY_SCHEMA_INVALID",
  );
  requireEqual(
    delivery.materialization,
    "selected-union-only",
    "WHOLE_PACK_DELIVERY_FORBIDDEN",
  );
  requireEqual(
    delivery.whole_pack_default,
    false,
    "WHOLE_PACK_DELIVERY_FORBIDDEN",
  );
  requireEqual(
    delivery.app_local_asset_copies,
    false,
    "APP_LOCAL_ASSET_COPY_FORBIDDEN",
  );
  requireEqual(delivery.fallback, "none", "SILENT_FALLBACK_FORBIDDEN");
  requireEqual(
    delivery.selected_union_keys,
    [],
    "WHOLE_PACK_DELIVERY_FORBIDDEN",
  );

  const ownerAcceptance = objectValue(
    dossier.owner_acceptance,
    "owner_acceptance",
  );
  requireKeys(
    ownerAcceptance,
    ["receipt", "required_before_green", "status"],
    "OWNER_ACCEPTANCE_SCHEMA_INVALID",
  );
  requireEqual(
    ownerAcceptance.status,
    "pending",
    "UNSUPPORTED_OWNER_ACCEPTANCE",
  );
  requireEqual(
    ownerAcceptance.required_before_green,
    true,
    "OWNER_ACCEPTANCE_GATE_DRIFT",
  );
  requireEqual(ownerAcceptance.receipt, null, "UNSUPPORTED_OWNER_ACCEPTANCE");
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("legacy traversal Phase 2 binding freeze", () => {
  it("binds the accepted Asset Contract v2, suitability governance, and traversal evidence inputs", () => {
    for (const title of EXPECTED_TITLES) {
      const dossier = createValidDossier(title);
      assertAcceptedInputs(dossier, title);
      assertAcceptedTraversalEvidence(title);
    }
  });

  it("rejects stale, incomplete, adopting, fallback, delivery, and owner mutations", () => {
    const title = EXPECTED_TITLES[0]!;
    const mutations: readonly [string, (dossier: JsonObject) => void][] = [
      [
        "STALE_STANDARD_PACK_RELEASE",
        (dossier) => {
          const release = objectValue(dossier.release, "release");
          release.catalogDigest = "0".repeat(64);
        },
      ],
      [
        "SEMANTIC_ROLE_SET_DRIFT",
        (dossier) => {
          dossier.semantic_roles = arrayValue(
            dossier.semantic_roles,
            "semantic_roles",
          ).slice(0, -1);
        },
      ],
      [
        "PHYSICAL_DESCRIPTOR_ROLE_SET_DRIFT",
        (dossier) => {
          dossier.physical_descriptors = arrayValue(
            dossier.physical_descriptors,
            "physical_descriptors",
          ).slice(0, -1);
        },
      ],
      [
        "UNKNOWN_MUST_HAVE_ADOPTION",
        (dossier) => {
          const decisions = arrayValue(dossier.decisions, "decisions").map(
            (value) => objectValue(value, "decision"),
          );
          decisions[0]!.outcome = "unknown";
          dossier.decisions = decisions;
        },
      ],
      [
        "SILENT_FALLBACK_FORBIDDEN",
        (dossier) => {
          const delivery = objectValue(dossier.delivery, "delivery");
          delivery.fallback = "legacy-source";
        },
      ],
      [
        "WHOLE_PACK_DELIVERY_FORBIDDEN",
        (dossier) => {
          const delivery = objectValue(dossier.delivery, "delivery");
          delivery.whole_pack_default = true;
        },
      ],
      [
        "APP_LOCAL_ASSET_COPY_FORBIDDEN",
        (dossier) => {
          const delivery = objectValue(dossier.delivery, "delivery");
          delivery.app_local_asset_copies = true;
        },
      ],
      [
        "UNSUPPORTED_OWNER_ACCEPTANCE",
        (dossier) => {
          const ownerAcceptance = objectValue(
            dossier.owner_acceptance,
            "owner_acceptance",
          );
          ownerAcceptance.status = "accepted";
          ownerAcceptance.receipt = {
            path: "measure/forged-owner-acceptance.json",
          };
        },
      ],
      [
        "STALE_SOURCE_MANIFEST_DIGEST",
        (dossier) => {
          const sourceManifest = objectValue(
            dossier.source_manifest,
            "source_manifest",
          );
          sourceManifest.sha256 = "0".repeat(64);
        },
      ],
    ];

    for (const [code, mutate] of mutations) {
      const dossier = cloneJson(createValidDossier(title));
      mutate(dossier);
      expect(() => assertDossier(dossier, title)).toThrow(code);
    }
  });

  it.each(EXPECTED_TITLES)(
    "requires the strict per-title binding dossier for $title_id",
    (title) => {
      const relativePath = `${DOSSIER_ROOT}/${title.title_id}.json`;
      let dossier: JsonObject;
      try {
        dossier = loadJson(relativePath);
      } catch {
        throw new Error(`MISSING_TRAVERSAL_BINDING_DOSSIER: ${relativePath}`);
      }
      assertDossier(dossier, title);
    },
  );
});
