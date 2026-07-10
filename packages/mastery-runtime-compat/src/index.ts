import { z } from "zod";

import rawRuntimeManifest from "../runtime-manifest.json" with { type: "json" };

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const CONSUMER_RANGE_PATTERN = /^(?:>=|>)\d+\.\d+\.\d+ (?:<=|<)\d+\.\d+\.\d+$/;

const SemVerSchema = z.string().regex(SEMVER_PATTERN, "must be an exact semantic version");
const CommitSchema = z.string().regex(COMMIT_PATTERN, "must be a full lowercase Git commit");
const VersionedContractSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*\.v\d+(?:\.\d+)*$/, "must be an explicitly versioned contract");

/** Validates one authority for an independently versioned runtime axis. */
export const RuntimeAuthoritySchema = z
  .object({
    axis: z.enum([
      "normative-spec",
      "engine-packages",
      "persistence",
      "knowledge-graph",
      "practice-contract",
      "srs-contract",
      "fixtures",
    ]),
    authority: z.string().trim().min(1),
    owner: z.string().trim().min(1),
  })
  .strict();

/** Validates the owning source for one runtime resource. */
export const RuntimeOwnershipSchema = z
  .object({
    resource: z.enum([
      "normative-spec",
      "knowledge-space-core",
      "knowledge-space-practice",
      "practice-core",
      "srs-engine",
      "mastery-persistence",
      "mastery-migrations",
      "knowledge-graph",
      "acceptance-fixtures",
    ]),
    owner: z.string().trim().min(1),
    authorityAxis: RuntimeAuthoritySchema.shape.axis,
  })
  .strict();

/** Validates an exact engine package and its allow-listed public exports. */
export const RuntimePackageSchema = z
  .object({
    name: z.string().regex(/^@reading-advantage\/[a-z0-9-]+$/),
    version: SemVerSchema,
    exports: z.array(z.string().regex(/^\.$|^\.\/[a-z0-9/-]+$/)).min(1),
  })
  .strict()
  .superRefine((entry, context) => {
    if (new Set(entry.exports).size !== entry.exports.length) {
      context.addIssue({
        code: "custom",
        path: ["exports"],
        message: "public exports must be unique",
      });
    }
  });

/** Validates one immutable and explicitly allow-listed mastery runtime release. */
export const RuntimeReleaseSetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9.-]+$/),
    normativeVersion: z.string().regex(/^kst-srs\.v\d+\.\d+$/),
    packages: z.array(RuntimePackageSchema).min(1),
    graph: z
      .object({
        release: z.string().regex(/^knowledge-space-[a-z0-9.-]+$/),
        schema: z.string().regex(/^knowledge-space\.v\d+$/),
      })
      .strict(),
    contracts: z
      .object({
        practice: VersionedContractSchema,
        srs: VersionedContractSchema,
        persistence: VersionedContractSchema,
      })
      .strict(),
    persistence: z
      .object({
        schema: VersionedContractSchema,
        migrationHead: z.string().regex(/^\d{4}_[a-z0-9_]+$/),
      })
      .strict(),
    fixtures: z
      .object({
        version: z.string().regex(/^mastery-fixtures\.v\d+\.\d+\.\d+$/),
        sourceCommit: CommitSchema,
      })
      .strict(),
    source: z.object({ commit: CommitSchema }).strict(),
    supportedConsumers: z
      .array(
        z
          .object({
            name: z.string().regex(/^[a-z0-9-]+$/),
            range: z.string().regex(CONSUMER_RANGE_PATTERN, "must be a bounded explicit semver range"),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((release, context) => {
    const packageNames = release.packages.map((entry) => entry.name);
    if (new Set(packageNames).size !== packageNames.length) {
      context.addIssue({ code: "custom", path: ["packages"], message: "package names must be unique" });
    }
    const consumers = release.supportedConsumers.map((entry) => entry.name);
    if (new Set(consumers).size !== consumers.length) {
      context.addIssue({
        code: "custom",
        path: ["supportedConsumers"],
        message: "supported consumers must be unique",
      });
    }
  });

/** Validates the complete runtime ownership and release governance manifest. */
export const RuntimeManifestSchema = z
  .object({
    schemaVersion: z.literal("mastery-runtime-compat.v1"),
    authorities: z.array(RuntimeAuthoritySchema).min(1),
    ownership: z.array(RuntimeOwnershipSchema).min(1),
    releaseSets: z.array(RuntimeReleaseSetSchema).min(1),
  })
  .strict()
  .superRefine((manifest, context) => {
    const axes = manifest.authorities.map((entry) => entry.axis);
    if (new Set(axes).size !== axes.length) {
      context.addIssue({ code: "custom", path: ["authorities"], message: "authority axes must be unique" });
    }
    const resources = manifest.ownership.map((entry) => entry.resource);
    if (new Set(resources).size !== resources.length) {
      context.addIssue({ code: "custom", path: ["ownership"], message: "owned resources must be unique" });
    }
    const releaseIds = manifest.releaseSets.map((entry) => entry.id);
    if (new Set(releaseIds).size !== releaseIds.length) {
      context.addIssue({ code: "custom", path: ["releaseSets"], message: "release-set IDs must be unique" });
    }
  });

/** A validated mastery runtime governance manifest. */
export type RuntimeManifest = z.infer<typeof RuntimeManifestSchema>;

/** A validated immutable mastery runtime release set. */
export type RuntimeReleaseSet = z.infer<typeof RuntimeReleaseSetSchema>;

/** Describes a consumer's complete runtime version and import surface. */
export const ConsumerDescriptorSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9-]+$/),
    version: SemVerSchema,
    releaseSet: z.string().min(1),
    normativeVersion: z.string().min(1),
    packages: z.record(z.string(), SemVerSchema),
    graph: z.object({ release: z.string().min(1), schema: z.string().min(1) }).strict(),
    contracts: z
      .object({
        practice: z.string().min(1),
        srs: z.string().min(1),
        persistence: z.string().min(1),
      })
      .strict(),
    persistence: z
      .object({ schema: z.string().min(1), migrationHead: z.string().min(1) })
      .strict(),
    fixtures: z.object({ version: z.string().min(1), sourceCommit: CommitSchema }).strict(),
    source: z.object({ commit: CommitSchema }).strict(),
    imports: z
      .array(
        z
          .object({
            package: z.string().min(1),
            export: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

/** A validated consumer descriptor accepted by the runtime compatibility gate. */
export type ConsumerDescriptor = z.infer<typeof ConsumerDescriptorSchema>;

/** One stable, actionable reason that a consumer is incompatible. */
export interface CompatibilityIssue {
  /** Stable code for automation and tests. */
  code: string;
  /** Descriptor path that must be corrected. */
  path: string;
  /** Human-readable remediation context. */
  message: string;
}

/** The fail-closed result returned by the runtime compatibility gate. */
export interface CompatibilityResult {
  /** Whether every release-set contract is satisfied. */
  compatible: boolean;
  /** All detected compatibility failures. */
  issues: CompatibilityIssue[];
}

/** Parses unknown input as the authoritative strict runtime manifest contract.
 * @param input Candidate JSON-compatible manifest data.
 * @returns The validated runtime manifest.
 * @throws When the manifest is incomplete, malformed, or contains undeclared fields.
 */
export function parseRuntimeManifest(input: unknown): RuntimeManifest {
  return RuntimeManifestSchema.parse(input);
}

/** The validated committed runtime manifest used by release and consumer tooling. */
export const runtimeManifest: RuntimeManifest = parseRuntimeManifest(rawRuntimeManifest);

/** Adds a compatibility issue while keeping diagnostics deterministic. */
function addIssue(
  issues: CompatibilityIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

/** Converts an exact semantic version to an ordinal comparison tuple. */
function parseSemVer(version: string): readonly [number, number, number] {
  const [major, minor, patch] = version.split(".").map(Number);
  return [major ?? 0, minor ?? 0, patch ?? 0];
}

/** Compares two exact semantic versions. */
function compareSemVer(left: string, right: string): number {
  const a = parseSemVer(left);
  const b = parseSemVer(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return (a[index] ?? 0) - (b[index] ?? 0);
  }
  return 0;
}

/** Checks the deliberately bounded two-comparator consumer range format. */
function satisfiesConsumerRange(version: string, range: string): boolean {
  const match = /^(>=|>)(\d+\.\d+\.\d+) (<=|<)(\d+\.\d+\.\d+)$/.exec(range);
  if (!match) return false;
  const lower = compareSemVer(version, match[2]!);
  const upper = compareSemVer(version, match[4]!);
  return (match[1] === ">=" ? lower >= 0 : lower > 0) &&
    (match[3] === "<=" ? upper <= 0 : upper < 0);
}

/** Maps descriptor validation failures to stable compatibility diagnostics. */
function invalidDescriptorIssues(error: z.ZodError): CompatibilityIssue[] {
  return error.issues.map((validationIssue) => {
    const path = validationIssue.path.join(".") || "$";
    const provenanceMissing =
      path === "source" ||
      path === "source.commit" ||
      path === "fixtures.sourceCommit";
    return {
      code: provenanceMissing ? "MISSING_PROVENANCE" : "INVALID_CONSUMER_DESCRIPTOR",
      path,
      message: provenanceMissing
        ? `Required immutable provenance is missing at ${path}`
        : `Consumer descriptor is invalid at ${path}: ${validationIssue.message}`,
    };
  });
}

/** Evaluates a consumer against an exact allow-listed runtime release set.
 * @param manifest Validated authoritative runtime manifest.
 * @param descriptor Candidate consumer descriptor from a file or programmatic caller.
 * @returns A structured fail-closed result with actionable issue codes and paths.
 */
export function evaluateRuntimeCompatibility(
  manifest: RuntimeManifest,
  descriptor: unknown,
): CompatibilityResult {
  const parsed = ConsumerDescriptorSchema.safeParse(descriptor);
  if (!parsed.success) {
    return { compatible: false, issues: invalidDescriptorIssues(parsed.error) };
  }

  const consumer = parsed.data;
  const issues: CompatibilityIssue[] = [];
  const release = manifest.releaseSets.find((entry) => entry.id === consumer.releaseSet);
  if (!release) {
    addIssue(
      issues,
      "UNKNOWN_RELEASE_SET",
      "releaseSet",
      `Release set ${consumer.releaseSet} is not declared by the runtime manifest`,
    );
    return { compatible: false, issues };
  }

  const consumerAllowance = release.supportedConsumers.find(
    (entry) => entry.name === consumer.name,
  );
  if (!consumerAllowance || !satisfiesConsumerRange(consumer.version, consumerAllowance.range)) {
    addIssue(
      issues,
      "UNSUPPORTED_CONSUMER",
      "name",
      `${consumer.name}@${consumer.version} is not allow-listed for ${release.id}`,
    );
  }

  if (consumer.normativeVersion !== release.normativeVersion) {
    addIssue(
      issues,
      "UNSUPPORTED_SPEC_VERSION",
      "normativeVersion",
      `Expected ${release.normativeVersion}; received ${consumer.normativeVersion}`,
    );
  }

  const declaredPackages = new Map(release.packages.map((entry) => [entry.name, entry]));
  for (const releasePackage of release.packages) {
    const actualVersion = consumer.packages[releasePackage.name];
    if (actualVersion !== releasePackage.version) {
      addIssue(
        issues,
        "PACKAGE_VERSION_MISMATCH",
        `packages.${releasePackage.name}`,
        `Expected ${releasePackage.name}@${releasePackage.version}; received ${actualVersion ?? "missing"}`,
      );
    }
  }
  for (const packageName of Object.keys(consumer.packages)) {
    if (!declaredPackages.has(packageName)) {
      addIssue(
        issues,
        "PACKAGE_VERSION_MISMATCH",
        `packages.${packageName}`,
        `${packageName} is absent from release set ${release.id}`,
      );
    }
  }

  if (consumer.graph.schema !== release.graph.schema) {
    addIssue(
      issues,
      "UNSUPPORTED_GRAPH_SCHEMA",
      "graph.schema",
      `Expected ${release.graph.schema}; received ${consumer.graph.schema}`,
    );
  }
  if (consumer.graph.release !== release.graph.release) {
    addIssue(
      issues,
      "GRAPH_RELEASE_MISMATCH",
      "graph.release",
      `Expected immutable graph release ${release.graph.release}; received ${consumer.graph.release}`,
    );
  }

  for (const contract of ["practice", "srs", "persistence"] as const) {
    if (consumer.contracts[contract] !== release.contracts[contract]) {
      addIssue(
        issues,
        "UNSUPPORTED_CONTRACT_VERSION",
        `contracts.${contract}`,
        `Expected ${release.contracts[contract]}; received ${consumer.contracts[contract]}`,
      );
    }
  }
  if (consumer.persistence.schema !== release.persistence.schema) {
    addIssue(
      issues,
      "UNSUPPORTED_PERSISTENCE_SCHEMA",
      "persistence.schema",
      `Expected ${release.persistence.schema}; received ${consumer.persistence.schema}`,
    );
  }
  if (consumer.persistence.migrationHead !== release.persistence.migrationHead) {
    addIssue(
      issues,
      "STALE_MIGRATION",
      "persistence.migrationHead",
      `Migration ${release.persistence.migrationHead} must be deployed before this runtime`,
    );
  }
  if (
    consumer.fixtures.version !== release.fixtures.version ||
    consumer.fixtures.sourceCommit !== release.fixtures.sourceCommit
  ) {
    addIssue(
      issues,
      "FIXTURE_PROVENANCE_MISMATCH",
      "fixtures",
      `Expected immutable fixture ${release.fixtures.version} from ${release.fixtures.sourceCommit}`,
    );
  }
  if (consumer.source.commit !== release.source.commit) {
    addIssue(
      issues,
      "SOURCE_PROVENANCE_MISMATCH",
      "source.commit",
      `Expected runtime source commit ${release.source.commit}; received ${consumer.source.commit}`,
    );
  }

  for (const importEntry of consumer.imports) {
    const releasePackage = declaredPackages.get(importEntry.package);
    if (!releasePackage) {
      addIssue(
        issues,
        "UNDECLARED_IMPORT",
        "imports",
        `${importEntry.package} is not part of release set ${release.id}`,
      );
    } else if (!releasePackage.exports.includes(importEntry.export)) {
      addIssue(
        issues,
        "UNDECLARED_EXPORT",
        "imports",
        `${importEntry.package}${importEntry.export} is not an allow-listed public export`,
      );
    }
  }

  return { compatible: issues.length === 0, issues };
}

/** Evaluates consumer compatibility using the established governance API name.
 * @param manifest Validated authoritative runtime manifest.
 * @param consumer Candidate consumer descriptor.
 * @returns A structured fail-closed compatibility result.
 */
export function evaluateConsumerCompatibility(
  manifest: RuntimeManifest,
  consumer: unknown,
): CompatibilityResult {
  return evaluateRuntimeCompatibility(manifest, consumer);
}
