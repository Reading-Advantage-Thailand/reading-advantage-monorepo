import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;
type ArchiveReader = (relativePath: string) => Uint8Array;
type ExpectedLegacySource = {
  path: string;
  role: string;
  classification: string;
  evidence_locator: JsonObject;
};

const LEGACY_SOURCE_EVIDENCE = Object.freeze({
  "dragon-rider":
    "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/claim-evidence-ledger-v3.json",
  "spellweavers-run":
    "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json",
  "shadow-gate-dungeon":
    "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/shadow-gate-dungeon/claim-evidence-ledger-v2.json",
  "labyrinth-goblin-king":
    "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/labyrinth-goblin-king/claim-evidence-ledger-batch-b-v2.json",
  "griffin-riders-escape":
    "measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/griffin-riders-escape/claim-evidence-ledger-v2.json",
});

const LEGACY_SOURCE_PATH_PREFIXES = [
  "apps/advantage-games/src/",
  "apps/advantage-games/tests/",
  "apps/reading-advantage/",
  "packages/game-cartridges/src/cartridges/",
];
const GENERATED_SOURCE_PATH_RE =
  /(?:^|\/)(?:\.next|build|coverage|dist|generated|node_modules|playwright-report|test-results)(?:\/|$)|\.(?:map|tsbuildinfo)$/i;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const TRACK_ID = "apk_legacy_traversal_cutover_20260727";
const TRACK_ROOT = `measure/tracks/${TRACK_ID}`;
const PER_TITLE_MANIFEST_ROOT = `${TRACK_ROOT}/legacy-source-manifests`;
const GIT_TRACKED_PATHS = new Set(
  execFileSync("git", ["ls-files", "-z"], {
    cwd: REPO_ROOT,
    maxBuffer: 64 * 1024 * 1024,
  })
    .toString("utf8")
    .split("\0")
    .filter(Boolean),
);

const EXPECTED_SOURCE_BINDINGS = Object.freeze({
  accepted_readiness_receipt: {
    archive_preferred_path:
      "measure/archive/apk_denominator_readiness_t11_integrity_20260727/accepted-readiness-receipt-v1.json",
    receipt_declared_path:
      "measure/tracks/apk_denominator_readiness_t11_integrity_20260727/accepted-readiness-receipt-v1.json",
    sha256: "d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720",
  },
  phase1_crosswalk: {
    archive_preferred_path:
      "measure/archive/apk_denominator_readiness_t11_integrity_20260727/phase1-denominator-crosswalk.json",
    receipt_declared_path:
      "measure/tracks/apk_denominator_readiness_t11_integrity_20260727/phase1-denominator-crosswalk.json",
    sha256: "eb395d3d365115696fc31359406a4e9f126604ca159ea8358a0eb8931c8c5f57",
  },
  identity_ledger: {
    archive_preferred_path:
      "measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json",
    sha256: "a31c99650bf1abd6623e64b2e9a23c4c481ce970036b52cfbe08c74b1c09c407",
  },
  accepted_traversal_batch_a: {
    archive_preferred_path:
      "measure/archive/apk_corpus_audit_traversal_exploration_20260712/accepted-cohort-manifest-batch-a-v6.json",
    sha256: "f5a215f44815c79025e86e97a3217d7a85c4a33db86f80db2909f30dd3a9caa3",
  },
  accepted_traversal_batch_b: {
    archive_preferred_path:
      "measure/archive/apk_corpus_audit_traversal_exploration_20260712/accepted-cohort-manifest-batch-b-v2.json",
    sha256: "41243b620fb02c413bd7ed2887d59905a02036299ce763b11f70499d63ea99af",
  },
});

const EXPECTED_TITLES = Object.freeze([
  {
    title_id: "dragon-rider",
    title: "Dragon Rider",
    assignment_index: 11,
    source_identity_id: "vocabulary/dragon-rider",
    identity_record_index: 21,
    evidence_binding: "accepted_traversal_batch_a",
  },
  {
    title_id: "spellweavers-run",
    title: "Spellweaver's Run",
    assignment_index: 13,
    source_identity_id: "catalog/spellweavers-run",
    identity_record_index: 8,
    evidence_binding: "accepted_traversal_batch_a",
  },
  {
    title_id: "shadow-gate-dungeon",
    title: "Shadow Gate Dungeon",
    assignment_index: 14,
    source_identity_id: "sentence/shadow-gate-dungeon",
    identity_record_index: 17,
    evidence_binding: "accepted_traversal_batch_b",
  },
  {
    title_id: "labyrinth-goblin-king",
    title: "Labyrinth of the Goblin King",
    assignment_index: 15,
    source_identity_id: "sentence/labyrinth-goblin-king",
    identity_record_index: 14,
    evidence_binding: "accepted_traversal_batch_b",
  },
  {
    title_id: "griffin-riders-escape",
    title: "Griffin Rider's Escape",
    assignment_index: 16,
    source_identity_id: "catalog/griffin-riders-escape",
    identity_record_index: 2,
    evidence_binding: "accepted_traversal_batch_b",
  },
]);

const EXPECTED_CLAIMS = Object.freeze({
  semantic_adoption_claimed: false,
  asset_selection_claimed: false,
  asset_suitability_claimed: false,
  asset_adoption_claimed: false,
  implementation_claimed: false,
  advantage_games_qc_claimed: false,
  reading_host_proof_claimed: false,
  primary_host_proof_claimed: false,
  retirement_claimed: false,
  cutover_claimed: false,
  release_authority_granted: false,
});

const EXPECTED_READINESS_BOUNDARY = Object.freeze({
  receipt_status: "accepted-active",
  authorized_child_work_only: true,
  cohort_currently_ready: false,
  cartridge_cutover_authorized: false,
  meaning:
    "The receipt removes only the denominator/readiness predecessor block for this five-title child track. It does not satisfy Task 1 or any downstream task.",
});

const EXPECTED_REQUIRED_GATES = [
  "accepted Asset Contract v2 output",
  "accepted per-title/per-role suitability and canonical-ingestion dossier",
  "accepted semantic adoption binding",
  "deterministic traversal cartridge revalidation and selected-output proof",
  "Advantage Games, Reading, and Primary host proof with authoritative completion persistence",
  "exact legacy retirement disposition plus independent review and product-owner acceptance",
] as const;

const EXPECTED_ARCHIVE_RULE =
  "For each predecessor, archive_preferred_path is the only consumable local path after archival. receipt_declared_path is retained solely to reconcile the immutable receipt text and is not a fallback.";
const EXPECTED_REVOCATION_RULE =
  "Any bound-byte drift or revoked predecessor invalidates this evidence-only manifest.";

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonObject(value: unknown, label: string): JsonObject {
  if (!isJsonObject(value)) throw new Error(`INVALID_JSON_OBJECT: ${label}`);
  return value;
}

function jsonArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`INVALID_JSON_ARRAY: ${label}`);
  return value;
}

function requireEqual(actual: unknown, expected: unknown, code: string): void {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(code);
}

function loadJsonValue(relativePath: string): unknown {
  return JSON.parse(
    readFileSync(resolve(REPO_ROOT, relativePath), "utf8"),
  ) as unknown;
}

function loadJson(relativePath: string): JsonObject {
  return jsonObject(loadJsonValue(relativePath), relativePath);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function defaultArchiveReader(relativePath: string): Uint8Array {
  return readFileSync(resolve(REPO_ROOT, relativePath));
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function jsonPointerValue(value: unknown, pointer: string): unknown {
  if (pointer === "") return value;
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, segment) => {
      if (Array.isArray(current)) return current[Number(segment)];
      if (isJsonObject(current)) return current[segment];
      return undefined;
    }, value as unknown);
}

function sourcePathFromClaim(value: JsonObject): string | undefined {
  if (typeof value.file_path === "string") return value.file_path;
  if (typeof value.relative_path === "string") return value.relative_path;
  const citation = isJsonObject(value.citation) ? value.citation : undefined;
  return citation && typeof citation.path === "string"
    ? citation.path
    : undefined;
}

function isLegacySourcePath(path: string): boolean {
  return (
    !GENERATED_SOURCE_PATH_RE.test(path) &&
    LEGACY_SOURCE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

function collectLegacySourceEvidence(
  value: unknown,
  artifact: string,
  pointer: string,
  output: ExpectedLegacySource[],
): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      collectLegacySourceEvidence(
        child,
        artifact,
        `${pointer}/${index}`,
        output,
      ),
    );
    return;
  }
  if (!isJsonObject(value)) return;

  const claimId = typeof value.claim_id === "string" ? value.claim_id : null;
  const sourcePath = sourcePathFromClaim(value);
  const role =
    typeof value.category === "string"
      ? value.category
      : typeof value.role === "string"
        ? value.role
        : null;
  const classification =
    typeof value.evidence_class === "string"
      ? value.evidence_class
      : typeof value.source_class === "string"
        ? value.source_class
        : null;

  if (
    claimId &&
    sourcePath &&
    role &&
    classification &&
    isLegacySourcePath(sourcePath)
  ) {
    output.push({
      path: sourcePath,
      role,
      classification,
      evidence_locator: {
        artifact,
        json_pointer: pointer,
        claim_id: claimId,
      },
    });
  }

  for (const [key, child] of Object.entries(value)) {
    collectLegacySourceEvidence(
      child,
      artifact,
      `${pointer}/${escapeJsonPointerSegment(key)}`,
      output,
    );
  }
}

function expectedLegacySourcesForTitle(
  title: (typeof EXPECTED_TITLES)[number],
): ExpectedLegacySource[] {
  const artifact =
    LEGACY_SOURCE_EVIDENCE[
      title.title_id as keyof typeof LEGACY_SOURCE_EVIDENCE
    ];
  const candidates: ExpectedLegacySource[] = [];
  collectLegacySourceEvidence(
    loadJsonValue(artifact),
    artifact,
    "",
    candidates,
  );

  const unique = new Map<string, ExpectedLegacySource>();
  for (const candidate of candidates) {
    if (!unique.has(candidate.path)) unique.set(candidate.path, candidate);
  }
  const sources = [...unique.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  if (sources.length === 0) {
    throw new Error(`ACCEPTED_LEGACY_SOURCE_SET_EMPTY: ${title.title_id}`);
  }
  return sources;
}

function normalizeGitPath(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`EMPTY_LEGACY_SOURCE_PATH: ${label}`);
  }
  const slashPath = value.replaceAll("\\", "/");
  const normalized = posix.normalize(slashPath);
  if (
    value !== slashPath ||
    normalized !== value ||
    normalized === "." ||
    normalized.startsWith("/") ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new Error(`UNNORMALIZED_LEGACY_SOURCE_PATH: ${label}`);
  }
  return normalized;
}

function assertSourceEvidenceLocator(
  record: JsonObject,
  expected: ExpectedLegacySource,
  label: string,
): void {
  requireEqual(
    record.evidence_locator,
    expected.evidence_locator,
    `LEGACY_SOURCE_EVIDENCE_LOCATOR_DRIFT: ${label}`,
  );
  const locator = jsonObject(
    record.evidence_locator,
    `${label}: evidence_locator`,
  );
  const artifact = String(locator.artifact);
  const pointed = jsonPointerValue(
    loadJsonValue(artifact),
    String(locator.json_pointer),
  );
  const claim = jsonObject(pointed, `${label}: evidence claim`);
  requireEqual(
    sourcePathFromClaim(claim),
    expected.path,
    `UNBOUND_LEGACY_SOURCE_PATH: ${label}`,
  );
  requireEqual(
    claim.claim_id,
    jsonObject(expected.evidence_locator, `${label}: expected locator`)
      .claim_id,
    `LEGACY_SOURCE_CLAIM_LOCATOR_DRIFT: ${label}`,
  );
}

function assertLegacySourcePaths(
  manifest: JsonObject,
  title: (typeof EXPECTED_TITLES)[number],
  label: string,
): void {
  requireEqual(
    manifest.legacy_source_paths_status,
    "observation-only-not-adoption-or-approval",
    `LEGACY_SOURCE_DISPOSITION_DRIFT: ${label}`,
  );
  const rawSources = jsonArray(
    manifest.legacy_source_paths,
    `${label}: legacy_source_paths`,
  );
  if (rawSources.length === 0) {
    throw new Error(`EMPTY_LEGACY_SOURCE_PATHS: ${label}`);
  }

  const expectedSources = expectedLegacySourcesForTitle(title);
  const expectedByPath = new Map(
    expectedSources.map((source) => [source.path, source]),
  );
  const actualPaths = new Set<string>();

  for (const rawSource of rawSources) {
    const source = jsonObject(rawSource, `${label}: source path`);
    requireEqual(
      Object.keys(source).sort(),
      [
        "classification",
        "disposition",
        "evidence_locator",
        "path",
        "role",
        "sha256",
      ],
      `LEGACY_SOURCE_SCHEMA_INVALID: ${label}`,
    );
    const path = normalizeGitPath(source.path, label);
    if (GENERATED_SOURCE_PATH_RE.test(path)) {
      throw new Error(`GENERATED_LEGACY_SOURCE_PATH: ${path}`);
    }
    if (actualPaths.has(path)) {
      throw new Error(`DUPLICATE_LEGACY_SOURCE_PATH: ${path}`);
    }
    actualPaths.add(path);
    if (!GIT_TRACKED_PATHS.has(path)) {
      throw new Error(`LEGACY_SOURCE_PATH_NOT_GIT_TRACKED: ${path}`);
    }
    const currentHash = sha256(readFileSync(resolve(REPO_ROOT, path)));
    if (source.sha256 !== currentHash) {
      throw new Error(`CURRENT_BYTE_HASH_DRIFT: ${path}`);
    }
    requireEqual(
      source.disposition,
      "evidence-only",
      `EVIDENCE_ONLY_SOURCE_DISPOSITION_DRIFT: ${path}`,
    );

    const expected = expectedByPath.get(path);
    if (!expected) {
      throw new Error(`UNBOUND_LEGACY_SOURCE_PATH: ${path}`);
    }
    requireEqual(
      source.role,
      expected.role,
      `LEGACY_SOURCE_ROLE_DRIFT: ${path}`,
    );
    requireEqual(
      source.classification,
      expected.classification,
      `LEGACY_SOURCE_CLASSIFICATION_DRIFT: ${path}`,
    );
    assertSourceEvidenceLocator(source, expected, path);
  }

  const expectedPaths = expectedSources.map((source) => source.path);
  const actualPathList = [...actualPaths].sort();
  const missingPaths = expectedPaths.filter((path) => !actualPaths.has(path));
  if (missingPaths.length > 0) {
    throw new Error(`OMITTED_LEGACY_SOURCE_PATH: ${missingPaths.join(",")}`);
  }
  const extraPaths = actualPathList.filter((path) => !expectedByPath.has(path));
  if (extraPaths.length > 0) {
    throw new Error(`EXTRA_LEGACY_SOURCE_PATH: ${extraPaths.join(",")}`);
  }
  requireEqual(
    actualPathList,
    expectedPaths,
    `LEGACY_SOURCE_PATH_SET_DRIFT: ${label}`,
  );
}

function createValidPerTitleManifest(
  title: (typeof EXPECTED_TITLES)[number],
): JsonObject {
  return {
    track_id: TRACK_ID,
    title_id: title.title_id,
    title: title.title,
    source_identity_id: title.source_identity_id,
    assignment_index: title.assignment_index,
    identity_record_index: title.identity_record_index,
    evidence_binding: title.evidence_binding,
    status: "evidence-only",
    legacy_source_paths_status: "observation-only-not-adoption-or-approval",
    legacy_source_paths: expectedLegacySourcesForTitle(title).map((source) => ({
      path: source.path,
      sha256: sha256(readFileSync(resolve(REPO_ROOT, source.path))),
      role: source.role,
      classification: source.classification,
      evidence_locator: cloneJson(source.evidence_locator),
      disposition: "evidence-only",
    })),
    claims: cloneJson(EXPECTED_CLAIMS),
  };
}

function expectedTitleBinding(
  title: (typeof EXPECTED_TITLES)[number],
): JsonObject {
  return {
    ...title,
    crosswalk_locator: {
      assignment_index: title.assignment_index,
      assignment_locator: {
        artifact: "accepted_partition",
        json_pointer: `/assignments/${title.assignment_index}`,
      },
      source_locator: {
        artifact: "identity_ledger",
        json_pointer: `/identity_records/${title.identity_record_index}`,
      },
    },
    identity_ledger_locator: {
      artifact: "identity_ledger",
      json_pointer: `/identity_records/${title.identity_record_index}`,
    },
  };
}

function assertTask1Manifest(manifest: JsonObject): void {
  requireEqual(
    Object.keys(manifest).sort(),
    [
      "archive_resolution_rule",
      "claims",
      "readiness_boundary",
      "required_before_any_adoption_or_cutover",
      "revocation_rule",
      "schema_version",
      "source_bindings",
      "status",
      "task",
      "titles",
      "track_id",
    ],
    "MANIFEST_SCHEMA_INVALID: top-level fields",
  );
  requireEqual(
    manifest.schema_version,
    "apk-legacy-traversal-task1-source-readiness-manifest.v1",
    "MANIFEST_SCHEMA_INVALID: schema version",
  );
  requireEqual(manifest.track_id, TRACK_ID, "MANIFEST_SCOPE_DRIFT: track");
  requireEqual(
    manifest.task,
    "Task 1: source/readiness manifest preparation",
    "MANIFEST_SCHEMA_INVALID: task",
  );
  requireEqual(
    manifest.status,
    "evidence-only",
    "EVIDENCE_ONLY_STATUS_DRIFT: status",
  );
  requireEqual(
    manifest.archive_resolution_rule,
    EXPECTED_ARCHIVE_RULE,
    "ARCHIVE_RULE_DRIFT",
  );
  requireEqual(
    manifest.source_bindings,
    EXPECTED_SOURCE_BINDINGS,
    "SOURCE_BINDING_DRIFT: declared bindings",
  );
  requireEqual(
    manifest.readiness_boundary,
    EXPECTED_READINESS_BOUNDARY,
    "READINESS_BOUNDARY_DRIFT",
  );
  requireEqual(
    manifest.claims,
    EXPECTED_CLAIMS,
    "EVIDENCE_ONLY_OVERCLAIM: claims",
  );
  requireEqual(
    manifest.required_before_any_adoption_or_cutover,
    EXPECTED_REQUIRED_GATES,
    "DOWNSTREAM_GATE_DRIFT",
  );
  requireEqual(
    manifest.revocation_rule,
    EXPECTED_REVOCATION_RULE,
    "REVOCATION_RULE_DRIFT",
  );

  const titles = jsonArray(manifest.titles, "titles");
  requireEqual(
    titles.length,
    EXPECTED_TITLES.length,
    "TITLE_ROSTER_DRIFT: five titles required",
  );
  const titleIds = titles.map((title) => jsonObject(title, "title").title_id);
  requireEqual(
    new Set(titleIds).size,
    EXPECTED_TITLES.length,
    "DUPLICATE_TITLE: title ids must be unique",
  );
  requireEqual(
    titles.map((title) => jsonObject(title, "title")),
    EXPECTED_TITLES.map(expectedTitleBinding),
    "TITLE_BINDING_DRIFT: exact five-title identities required",
  );
}

function assertArchiveBindings(
  manifest: JsonObject,
  readArchive: ArchiveReader = defaultArchiveReader,
): void {
  requireEqual(
    manifest.source_bindings,
    EXPECTED_SOURCE_BINDINGS,
    "SOURCE_BINDING_DRIFT: declared bindings",
  );
  for (const binding of Object.values(EXPECTED_SOURCE_BINDINGS)) {
    let bytes: Uint8Array;
    try {
      bytes = readArchive(binding.archive_preferred_path);
    } catch {
      throw new Error(
        `MISSING_ARCHIVE_INPUT: ${binding.archive_preferred_path}`,
      );
    }
    if (sha256(bytes) !== binding.sha256) {
      throw new Error(`BOUND_BYTE_DRIFT: ${binding.archive_preferred_path}`);
    }
  }
}

function assertReadinessReceipt(): void {
  const receipt = loadJson(
    EXPECTED_SOURCE_BINDINGS.accepted_readiness_receipt.archive_preferred_path,
  );
  requireEqual(receipt.status, "accepted", "READINESS_RECEIPT_INVALID: status");
  requireEqual(
    receipt.revocation_state,
    "active",
    "READINESS_RECEIPT_INVALID: revocation",
  );
  const governance = jsonObject(
    receipt.readiness_governance,
    "readiness_governance",
  );
  requireEqual(
    governance.any_cohort_currently_ready_by_this_receipt,
    false,
    "READINESS_OVERCLAIM",
  );
  requireEqual(
    governance.any_cartridge_cutover_authorized_by_this_receipt,
    false,
    "CUTOVER_OVERCLAIM",
  );
  const authorization = jsonObject(
    receipt.downstream_authorization,
    "downstream_authorization",
  );
  const authorizedTitles = jsonObject(
    authorization.authorized_child_cohorts,
    "authorized_child_cohorts",
  );
  requireEqual(
    authorizedTitles[TRACK_ID],
    EXPECTED_TITLES.map((title) => title.title),
    "READINESS_ROSTER_DRIFT",
  );
}

function assertCrosswalkAndIdentityBindings(): void {
  const crosswalk = loadJson(
    EXPECTED_SOURCE_BINDINGS.phase1_crosswalk.archive_preferred_path,
  );
  const ledger = loadJson(
    EXPECTED_SOURCE_BINDINGS.identity_ledger.archive_preferred_path,
  );
  const assignments = jsonArray(crosswalk.assignments, "assignments");
  const identityRecords = jsonArray(
    ledger.identity_records,
    "identity_records",
  );

  for (const title of EXPECTED_TITLES) {
    const assignment = jsonObject(
      assignments[title.assignment_index],
      `assignment ${title.assignment_index}`,
    );
    requireEqual(
      assignment.canonical_identity_label,
      title.title,
      "TITLE_LABEL_DRIFT",
    );
    requireEqual(
      assignment.cohort,
      "Traversal and exploration",
      "TITLE_COHORT_DRIFT",
    );
    requireEqual(
      assignment.classification,
      "source_identity",
      "SOURCE_CLASS_DRIFT",
    );
    requireEqual(
      assignment.source_identity_id,
      title.source_identity_id,
      "WRONG_SOURCE_IDENTITY",
    );
    requireEqual(
      assignment.assignment_locator,
      {
        artifact: "accepted_partition",
        json_pointer: `/assignments/${title.assignment_index}`,
      },
      "ASSIGNMENT_LOCATOR_DRIFT",
    );
    requireEqual(
      assignment.source_locator,
      {
        artifact: "identity_ledger",
        json_pointer: `/identity_records/${title.identity_record_index}`,
      },
      "SOURCE_LOCATOR_DRIFT",
    );
    const identityRecord = jsonObject(
      identityRecords[title.identity_record_index],
      `identity ${title.identity_record_index}`,
    );
    requireEqual(
      identityRecord.canonical_identity_id,
      title.source_identity_id,
      "WRONG_SOURCE_IDENTITY",
    );
    requireEqual(
      identityRecord.catalog_identity_id,
      title.title_id,
      "CATALOG_IDENTITY_DRIFT",
    );
  }
}

function assertAcceptedTraversalEvidence(): void {
  const expectedPackages = {
    accepted_traversal_batch_a: [
      "vocabulary/dragon-rider",
      "catalog/spellweavers-run",
    ],
    accepted_traversal_batch_b: [
      "sentence/shadow-gate-dungeon",
      "sentence/labyrinth-goblin-king",
      "catalog/griffin-riders-escape",
    ],
  } as const;

  for (const [bindingName, packages] of Object.entries(expectedPackages)) {
    const evidence = loadJson(
      EXPECTED_SOURCE_BINDINGS[
        bindingName as keyof typeof EXPECTED_SOURCE_BINDINGS
      ].archive_preferred_path,
    );
    requireEqual(evidence.status, "accepted", "ACCEPTED_EVIDENCE_STATUS_DRIFT");
    requireEqual(evidence.revoked, false, "ACCEPTED_EVIDENCE_REVOKED");
    requireEqual(evidence.consumable, true, "ACCEPTED_EVIDENCE_NOT_CONSUMABLE");
    const scope = jsonObject(evidence.scope, "scope");
    const scopePackages = jsonArray(scope.packages, "scope.packages");
    for (const packageId of packages) {
      if (!scopePackages.includes(packageId))
        throw new Error(`EVIDENCE_ROSTER_MISSING: ${packageId}`);
    }
    const excludedUse = jsonArray(scope.excluded_use, "scope.excluded_use")
      .map(String)
      .join(" ");
    if (!excludedUse.toLowerCase().includes("implementation")) {
      throw new Error(
        "EVIDENCE_SCOPE_OVERCLAIM: implementation exclusion missing",
      );
    }
  }
}

function assertPerTitleLegacySourceManifest(
  title: (typeof EXPECTED_TITLES)[number],
): void {
  const relativePath = `${PER_TITLE_MANIFEST_ROOT}/${title.title_id}.json`;
  let manifest: JsonObject;
  try {
    manifest = loadJson(relativePath);
  } catch {
    throw new Error(`MISSING_EXACT_LEGACY_SOURCE_MANIFEST: ${relativePath}`);
  }
  requireEqual(
    manifest.track_id,
    TRACK_ID,
    `TITLE_MANIFEST_SCOPE_DRIFT: ${relativePath}`,
  );
  requireEqual(
    manifest.title_id,
    title.title_id,
    `TITLE_MANIFEST_IDENTITY_DRIFT: ${relativePath}`,
  );
  requireEqual(
    manifest.title,
    title.title,
    `TITLE_MANIFEST_LABEL_DRIFT: ${relativePath}`,
  );
  requireEqual(
    manifest.source_identity_id,
    title.source_identity_id,
    `TITLE_MANIFEST_SOURCE_DRIFT: ${relativePath}`,
  );
  requireEqual(
    manifest.assignment_index,
    title.assignment_index,
    `TITLE_MANIFEST_ASSIGNMENT_DRIFT: ${relativePath}`,
  );
  requireEqual(
    manifest.identity_record_index,
    title.identity_record_index,
    `TITLE_MANIFEST_IDENTITY_RECORD_DRIFT: ${relativePath}`,
  );
  requireEqual(
    manifest.evidence_binding,
    title.evidence_binding,
    `TITLE_MANIFEST_EVIDENCE_DRIFT: ${relativePath}`,
  );
  requireEqual(
    Object.keys(manifest).sort(),
    [
      "assignment_index",
      "claims",
      "evidence_binding",
      "identity_record_index",
      "legacy_source_paths",
      "legacy_source_paths_status",
      "source_identity_id",
      "status",
      "title",
      "title_id",
      "track_id",
    ],
    `TITLE_MANIFEST_SCHEMA_INVALID: ${relativePath}`,
  );
  requireEqual(
    manifest.status,
    "evidence-only",
    `TITLE_MANIFEST_STATUS_DRIFT: ${relativePath}`,
  );
  requireEqual(
    manifest.claims,
    EXPECTED_CLAIMS,
    `EVIDENCE_ONLY_MANIFEST_OVERCLAIM: ${relativePath}`,
  );
  assertLegacySourcePaths(manifest, title, relativePath);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("legacy traversal Task 1 source/readiness manifest", () => {
  const manifest = loadJson(
    `${TRACK_ROOT}/task1-source-readiness-manifest-v1.json`,
  );

  it("binds exactly the five title identities and locators", () => {
    assertTask1Manifest(manifest);
    expect(jsonArray(manifest.titles, "titles")).toHaveLength(5);
  });

  it("resolves all five archive-preferred inputs at their accepted hashes", () => {
    assertArchiveBindings(manifest);
  });

  it("keeps accepted readiness evidence bounded and archive-preferred", () => {
    assertReadinessReceipt();
    assertCrosswalkAndIdentityBindings();
    assertAcceptedTraversalEvidence();
  });

  it.each(EXPECTED_TITLES)(
    "requires the exact per-title legacy source manifest for $title_id",
    (title) => {
      assertPerTitleLegacySourceManifest(title);
    },
  );

  it("rejects empty, duplicate, extra, omitted, wrong-hash, generated, and unbound paths", () => {
    const title = EXPECTED_TITLES[0];
    const valid = createValidPerTitleManifest(title);
    const validPaths = jsonArray(valid.legacy_source_paths, "valid paths");

    const empty = cloneJson(valid);
    empty.legacy_source_paths = [];
    expect(() =>
      assertLegacySourcePaths(empty, title, "empty fixture"),
    ).toThrow("EMPTY_LEGACY_SOURCE_PATHS");

    const emptyPath = cloneJson(valid);
    const emptyPathRecords = jsonArray(
      emptyPath.legacy_source_paths,
      "empty path records",
    ).map((path) => jsonObject(path, "empty path record"));
    emptyPathRecords[0] = { ...emptyPathRecords[0], path: "" };
    emptyPath.legacy_source_paths = emptyPathRecords;
    expect(() =>
      assertLegacySourcePaths(emptyPath, title, "empty path fixture"),
    ).toThrow("EMPTY_LEGACY_SOURCE_PATH");

    const duplicate = cloneJson(valid);
    duplicate.legacy_source_paths = [...validPaths, cloneJson(validPaths[0])];
    expect(() =>
      assertLegacySourcePaths(duplicate, title, "duplicate fixture"),
    ).toThrow("DUPLICATE_LEGACY_SOURCE_PATH");

    const omitted = cloneJson(valid);
    omitted.legacy_source_paths = validPaths.slice(0, -1);
    expect(() =>
      assertLegacySourcePaths(omitted, title, "omitted fixture"),
    ).toThrow("OMITTED_LEGACY_SOURCE_PATH");

    const wrongHash = cloneJson(valid);
    const wrongHashPaths = jsonArray(
      wrongHash.legacy_source_paths,
      "wrong hash paths",
    ).map((path) => jsonObject(path, "wrong hash path"));
    wrongHashPaths[0] = {
      ...wrongHashPaths[0],
      sha256: "0".repeat(64),
    };
    wrongHash.legacy_source_paths = wrongHashPaths;
    expect(() =>
      assertLegacySourcePaths(wrongHash, title, "wrong hash fixture"),
    ).toThrow("CURRENT_BYTE_HASH_DRIFT");

    const generated = cloneJson(valid);
    const generatedPaths = jsonArray(
      generated.legacy_source_paths,
      "generated paths",
    ).map((path) => jsonObject(path, "generated path"));
    generatedPaths[0] = {
      ...generatedPaths[0],
      path: "dist/generated-legacy-source.ts",
    };
    generated.legacy_source_paths = generatedPaths;
    expect(() =>
      assertLegacySourcePaths(generated, title, "generated fixture"),
    ).toThrow("GENERATED_LEGACY_SOURCE_PATH");

    const unbound = cloneJson(valid);
    const unboundPaths = jsonArray(
      unbound.legacy_source_paths,
      "unbound paths",
    ).map((path) => jsonObject(path, "unbound path"));
    unboundPaths[0] = {
      ...unboundPaths[0],
      path: "packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts",
      sha256: sha256(
        readFileSync(
          resolve(
            REPO_ROOT,
            "packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts",
          ),
        ),
      ),
    };
    unbound.legacy_source_paths = unboundPaths;
    expect(() =>
      assertLegacySourcePaths(unbound, title, "unbound fixture"),
    ).toThrow("UNBOUND_LEGACY_SOURCE_PATH");
  });

  it("rejects role, classification, locator, and non-evidence-only disposition drift", () => {
    const title = EXPECTED_TITLES[0];
    const mutations = [
      {
        code: "LEGACY_SOURCE_ROLE_DRIFT",
        mutate: (manifest: JsonObject) => {
          const paths = jsonArray(
            manifest.legacy_source_paths,
            "role paths",
          ).map((path) => jsonObject(path, "role path"));
          paths[0] = { ...paths[0], role: "wrong-role" };
          manifest.legacy_source_paths = paths;
        },
      },
      {
        code: "LEGACY_SOURCE_CLASSIFICATION_DRIFT",
        mutate: (manifest: JsonObject) => {
          const paths = jsonArray(
            manifest.legacy_source_paths,
            "classification paths",
          ).map((path) => jsonObject(path, "classification path"));
          paths[0] = { ...paths[0], classification: "generated" };
          manifest.legacy_source_paths = paths;
        },
      },
      {
        code: "LEGACY_SOURCE_EVIDENCE_LOCATOR_DRIFT",
        mutate: (manifest: JsonObject) => {
          const paths = jsonArray(
            manifest.legacy_source_paths,
            "locator paths",
          ).map((path) => jsonObject(path, "locator path"));
          paths[0] = {
            ...paths[0],
            evidence_locator: {
              artifact: "measure/forged-evidence.json",
              json_pointer: "/claims/0",
              claim_id: "forged-claim",
            },
          };
          manifest.legacy_source_paths = paths;
        },
      },
      {
        code: "EVIDENCE_ONLY_SOURCE_DISPOSITION_DRIFT",
        mutate: (manifest: JsonObject) => {
          const paths = jsonArray(
            manifest.legacy_source_paths,
            "disposition paths",
          ).map((path) => jsonObject(path, "disposition path"));
          paths[0] = { ...paths[0], disposition: "adopted" };
          manifest.legacy_source_paths = paths;
        },
      },
    ] as const;

    for (const mutation of mutations) {
      const manifest = createValidPerTitleManifest(title);
      mutation.mutate(manifest);
      expect(() =>
        assertLegacySourcePaths(manifest, title, `${mutation.code} fixture`),
      ).toThrow(mutation.code);
    }
  });

  it("rejects bound-byte drift and a missing archive input", () => {
    const driftedPath =
      EXPECTED_SOURCE_BINDINGS.phase1_crosswalk.archive_preferred_path;
    expect(() =>
      assertArchiveBindings(manifest, (relativePath) =>
        relativePath === driftedPath
          ? Buffer.from("drift")
          : defaultArchiveReader(relativePath),
      ),
    ).toThrow(`BOUND_BYTE_DRIFT: ${driftedPath}`);

    const missingPath =
      EXPECTED_SOURCE_BINDINGS.identity_ledger.archive_preferred_path;
    expect(() =>
      assertArchiveBindings(manifest, (relativePath) => {
        if (relativePath === missingPath) throw new Error("fixture missing");
        return defaultArchiveReader(relativePath);
      }),
    ).toThrow(`MISSING_ARCHIVE_INPUT: ${missingPath}`);
  });

  it("rejects duplicate titles, wrong source identity, and evidence-only overclaim", () => {
    const duplicateTitle = cloneJson(manifest);
    const duplicateTitles = jsonArray(duplicateTitle.titles, "titles").map(
      (title) => jsonObject(title, "title"),
    );
    duplicateTitles[1] = {
      ...duplicateTitles[1],
      title_id: duplicateTitles[0]?.title_id,
    };
    duplicateTitle.titles = duplicateTitles;
    expect(() => assertTask1Manifest(duplicateTitle)).toThrow(
      "DUPLICATE_TITLE",
    );

    const wrongIdentity = cloneJson(manifest);
    const wrongTitles = jsonArray(wrongIdentity.titles, "titles").map((title) =>
      jsonObject(title, "title"),
    );
    wrongTitles[2] = {
      ...wrongTitles[2],
      source_identity_id: "sentence/not-shadow-gate",
    };
    wrongIdentity.titles = wrongTitles;
    expect(() => assertTask1Manifest(wrongIdentity)).toThrow(
      "TITLE_BINDING_DRIFT",
    );

    const overclaim = cloneJson(manifest);
    overclaim.claims = {
      ...jsonObject(overclaim.claims, "claims"),
      cutover_claimed: true,
    };
    expect(() => assertTask1Manifest(overclaim)).toThrow(
      "EVIDENCE_ONLY_OVERCLAIM",
    );
  });
});
