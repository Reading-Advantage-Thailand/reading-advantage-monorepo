import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "../..");
const MANIFEST_PATH = resolve(PACKAGE_ROOT, "runtime-manifest.json");

const ENGINE_PACKAGES = [
  "@reading-advantage/knowledge-space-core",
  "@reading-advantage/knowledge-space-practice",
  "@reading-advantage/practice-core",
  "@reading-advantage/srs-engine",
] as const;

const REQUIRED_AUTHORITY_AXES = [
  "normative-spec",
  "engine-packages",
  "persistence",
  "knowledge-graph",
  "practice-contract",
  "srs-contract",
  "fixtures",
] as const;

const REQUIRED_OWNERS = [
  "normative-spec",
  "knowledge-space-core",
  "knowledge-space-practice",
  "practice-core",
  "srs-engine",
  "mastery-persistence",
  "mastery-migrations",
  "knowledge-graph",
  "acceptance-fixtures",
] as const;

interface PackageManifest {
  name: string;
  version: string;
  exports: Record<string, unknown>;
}

interface AuthorityEntry {
  axis: string;
  authority: string;
  owner: string;
}

interface OwnershipEntry {
  resource: string;
  owner: string;
  authorityAxis: string;
}

interface RuntimePackageEntry {
  name: string;
  version: string;
  exports: string[];
}

interface ReleaseSet {
  id: string;
  normativeVersion: string;
  packages: RuntimePackageEntry[];
  graph: { release: string; schema: string };
  contracts: { practice: string; srs: string; persistence: string };
  persistence: { schema: string; migrationHead: string };
  fixtures: { version: string; sourceCommit: string };
  source: { commit: string };
  supportedConsumers: Array<{ name: string; range: string }>;
}

interface RuntimeManifest {
  schemaVersion: string;
  authorities: AuthorityEntry[];
  ownership: OwnershipEntry[];
  releaseSets: ReleaseSet[];
}

interface ConsumerDescriptor {
  name: string;
  version: string;
  releaseSet: string;
  normativeVersion: string;
  packages: Record<string, string>;
  graph: { release: string; schema: string };
  contracts: { practice: string; srs: string; persistence: string };
  persistence: { schema: string; migrationHead: string };
  fixtures: { version: string; sourceCommit: string };
  source: { commit: string };
  imports: Array<{ package: string; export: string }>;
}

interface CompatibilityIssue {
  code: string;
  path: string;
  message: string;
}

interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
}

interface GovernanceModule {
  parseRuntimeManifest(input: unknown): RuntimeManifest;
  evaluateConsumerCompatibility(
    manifest: RuntimeManifest,
    consumer: unknown,
  ): CompatibilityResult;
}

/** Reads JSON without coupling the Red suite to a TypeScript JSON-import mode. */
async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

/** Reads the checked-in package metadata that is authoritative for package versions. */
async function readEnginePackageManifests(): Promise<PackageManifest[]> {
  return Promise.all(
    ENGINE_PACKAGES.map(async (packageName) => {
      const directory = packageName.replace("@reading-advantage/", "");
      return (await readJson(
        resolve(REPOSITORY_ROOT, "packages", directory, "package.json"),
      )) as PackageManifest;
    }),
  );
}

/** Loads the governance API through a non-literal specifier so absence is a Red assertion, not a transform error. */
async function loadGovernanceModule(): Promise<GovernanceModule | null> {
  const moduleSpecifier = "../index.js";
  try {
    return (await import(moduleSpecifier)) as GovernanceModule;
  } catch {
    return null;
  }
}

/** Loads and validates the authoritative manifest with an actionable Red failure. */
async function loadValidatedManifest(): Promise<{
  api: GovernanceModule;
  manifest: RuntimeManifest;
}> {
  const api = await loadGovernanceModule();
  expect(
    api,
    "runtime governance API is absent; implement src/index.ts with strict manifest parsing and compatibility evaluation",
  ).not.toBeNull();

  let rawManifest: unknown;
  try {
    rawManifest = await readJson(MANIFEST_PATH);
  } catch {
    expect.fail(
      "runtime-manifest.json is absent; add the authoritative version, ownership, provenance, and release-set manifest",
    );
  }

  return {
    api: api as GovernanceModule,
    manifest: (api as GovernanceModule).parseRuntimeManifest(rawManifest),
  };
}

/** Creates an allow-listed Codecamp consumer from the manifest's current release set. */
function createCompatibleConsumer(release: ReleaseSet): ConsumerDescriptor {
  return {
    name: "codecamp-advantage",
    version: "1.0.0",
    releaseSet: release.id,
    normativeVersion: release.normativeVersion,
    packages: Object.fromEntries(
      release.packages.map((entry) => [entry.name, entry.version]),
    ),
    graph: structuredClone(release.graph),
    contracts: structuredClone(release.contracts),
    persistence: structuredClone(release.persistence),
    fixtures: structuredClone(release.fixtures),
    source: structuredClone(release.source),
    imports: release.packages.map((entry) => ({
      package: entry.name,
      export: entry.exports.includes(".") ? "." : entry.exports[0]!,
    })),
  };
}

/** Returns the current kst-srs.v3.2 release or fails with the missing mapping. */
function currentRelease(manifest: RuntimeManifest): ReleaseSet {
  const release = manifest.releaseSets.find(
    (candidate) => candidate.normativeVersion === "kst-srs.v3.2",
  );
  expect(
    release,
    "manifest must map one exact engine release set to normative version kst-srs.v3.2",
  ).toBeDefined();
  return release as ReleaseSet;
}

/** Expects an incompatible result carrying a stable machine-readable issue code. */
function expectRejected(
  result: CompatibilityResult,
  expectedCode: string,
): void {
  expect(result.compatible).toBe(false);
  expect(result.issues.map((issue) => issue.code)).toContain(expectedCode);
  for (const issue of result.issues) {
    expect(issue.path.length).toBeGreaterThan(0);
    expect(issue.message.length).toBeGreaterThan(0);
  }
}

describe("runtime manifest Red harness controls", () => {
  it("reads the exact four authoritative engine package manifests", async () => {
    const packages = await readEnginePackageManifests();

    expect(packages.map((entry) => entry.name).sort()).toEqual(
      [...ENGINE_PACKAGES].sort(),
    );
    expect(
      packages.every((entry) => /^\d+\.\d+\.\d+$/.test(entry.version)),
    ).toBe(true);
    expect(
      packages.every((entry) => Object.keys(entry.exports).length > 0),
    ).toBe(true);
  });

  it("proves consumer fixture mutations are isolated", () => {
    const release = {
      id: "control",
      normativeVersion: "kst-srs.v3.2",
      packages: [
        { name: ENGINE_PACKAGES[0], version: "0.1.0", exports: ["."] },
      ],
      graph: { release: "control", schema: "knowledge-space.v3" },
      contracts: {
        practice: "practice.v3",
        srs: "srs.v3",
        persistence: "mastery-persistence.v1",
      },
      persistence: {
        schema: "mastery-persistence.v1",
        migrationHead: "0027_mastery_persistence",
      },
      fixtures: { version: "fixtures.v3.2.0", sourceCommit: "a".repeat(40) },
      source: { commit: "b".repeat(40) },
      supportedConsumers: [
        { name: "codecamp-advantage", range: ">=1.0.0 <2.0.0" },
      ],
    } satisfies ReleaseSet;
    const original = createCompatibleConsumer(release);
    const mutation = structuredClone(original);
    mutation.graph.schema = "knowledge-space.v4";

    expect(original.graph.schema).toBe("knowledge-space.v3");
    expect(mutation.graph.schema).toBe("knowledge-space.v4");
  });
});

describe("authoritative runtime manifest", () => {
  it("declares unique authorities and explicit ownership for every runtime axis", async () => {
    const { manifest } = await loadValidatedManifest();
    const axes = manifest.authorities.map((entry) => entry.axis);
    const resources = manifest.ownership.map((entry) => entry.resource);

    expect(manifest.schemaVersion).toBe("mastery-runtime-compat.v1");
    expect(new Set(axes).size).toBe(axes.length);
    expect(axes.sort()).toEqual([...REQUIRED_AUTHORITY_AXES].sort());
    expect(new Set(resources).size).toBe(resources.length);
    expect(resources.sort()).toEqual([...REQUIRED_OWNERS].sort());
    for (const entry of manifest.authorities) {
      expect(entry.authority.trim().length).toBeGreaterThan(0);
      expect(entry.owner.trim().length).toBeGreaterThan(0);
    }
    for (const entry of manifest.ownership) {
      expect(axes).toContain(entry.authorityAxis);
      expect(entry.owner.trim().length).toBeGreaterThan(0);
    }
  });

  it("maps exact package manifests and all independent version axes to kst-srs.v3.2", async () => {
    const [{ manifest }, packageManifests] = await Promise.all([
      loadValidatedManifest(),
      readEnginePackageManifests(),
    ]);
    const release = currentRelease(manifest);
    const expectedVersions = new Map(
      packageManifests.map((entry) => [entry.name, entry.version]),
    );

    expect(release.packages.map((entry) => entry.name).sort()).toEqual(
      [...ENGINE_PACKAGES].sort(),
    );
    for (const entry of release.packages) {
      expect(entry.version).toBe(expectedVersions.get(entry.name));
      expect(entry.exports.length).toBeGreaterThan(0);
      expect(new Set(entry.exports).size).toBe(entry.exports.length);
    }
    expect(release.graph.release).toMatch(/^knowledge-space-[a-z0-9.-]+$/);
    expect(release.graph.schema).toBe("knowledge-space.v3");
    expect(release.contracts.practice).toBe("practice.v3");
    expect(release.contracts.srs).toBe("srs.v3");
    expect(release.contracts.persistence).toBe("mastery-persistence.v1");
    expect(release.persistence.schema).toBe("mastery-persistence.v1");
    expect(release.persistence.migrationHead).toBe(
      "0028_mastery_tenant_hardening",
    );
    expect(release.fixtures.version).toMatch(/^mastery-fixtures\.v3\.2\.\d+$/);
    expect(release.fixtures.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(release.source.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("forbids wildcard/latest ranges and allow-lists Codecamp explicitly", async () => {
    const { manifest } = await loadValidatedManifest();
    const release = currentRelease(manifest);

    expect(release.supportedConsumers).toContainEqual({
      name: "codecamp-advantage",
      range: ">=1.0.0 <2.0.0",
    });
    for (const consumer of release.supportedConsumers) {
      expect(consumer.range).not.toMatch(/\*|latest|x/i);
      expect(consumer.range).toMatch(/\d+\.\d+\.\d+/);
    }
    expect(JSON.stringify(release.packages)).not.toMatch(/\*|latest/i);
  });
});

describe("strict consumer compatibility evaluator", () => {
  it("accepts the exact allow-listed Codecamp release set", async () => {
    const { api, manifest } = await loadValidatedManifest();
    const result = api.evaluateConsumerCompatibility(
      manifest,
      createCompatibleConsumer(currentRelease(manifest)),
    );

    expect(result).toEqual({ compatible: true, issues: [] });
  });

  it("rejects a consumer that is not explicitly allow-listed", async () => {
    const { api, manifest } = await loadValidatedManifest();
    const consumer = createCompatibleConsumer(currentRelease(manifest));
    consumer.name = "unlisted-school-lms";

    expectRejected(
      api.evaluateConsumerCompatibility(manifest, consumer),
      "UNSUPPORTED_CONSUMER",
    );
  });

  it("rejects mismatched package versions instead of inferring engine compatibility", async () => {
    const { api, manifest } = await loadValidatedManifest();
    const consumer = createCompatibleConsumer(currentRelease(manifest));
    consumer.packages[ENGINE_PACKAGES[0]] = "1.0.0";

    expectRejected(
      api.evaluateConsumerCompatibility(manifest, consumer),
      "PACKAGE_VERSION_MISMATCH",
    );
  });

  it.each([
    [
      "normative spec",
      (consumer: ConsumerDescriptor) => {
        consumer.normativeVersion = "kst-srs.v4.0";
      },
      "UNSUPPORTED_SPEC_VERSION",
    ],
    [
      "knowledge graph",
      (consumer: ConsumerDescriptor) => {
        consumer.graph.schema = "knowledge-space.v4";
      },
      "UNSUPPORTED_GRAPH_SCHEMA",
    ],
    [
      "practice contract",
      (consumer: ConsumerDescriptor) => {
        consumer.contracts.practice = "practice.v4";
      },
      "UNSUPPORTED_CONTRACT_VERSION",
    ],
    [
      "SRS contract",
      (consumer: ConsumerDescriptor) => {
        consumer.contracts.srs = "srs.v4";
      },
      "UNSUPPORTED_CONTRACT_VERSION",
    ],
    [
      "persistence contract",
      (consumer: ConsumerDescriptor) => {
        consumer.contracts.persistence = "mastery-persistence.v2";
      },
      "UNSUPPORTED_CONTRACT_VERSION",
    ],
  ])(
    "rejects an unknown future major for %s",
    async (_label, mutate, issueCode) => {
      const { api, manifest } = await loadValidatedManifest();
      const consumer = createCompatibleConsumer(currentRelease(manifest));
      mutate(consumer);

      expectRejected(
        api.evaluateConsumerCompatibility(manifest, consumer),
        issueCode,
      );
    },
  );

  it("rejects a stale persistence migration head", async () => {
    const { api, manifest } = await loadValidatedManifest();
    const consumer = createCompatibleConsumer(currentRelease(manifest));
    consumer.persistence.migrationHead = "0026_pre_mastery";

    expectRejected(
      api.evaluateConsumerCompatibility(manifest, consumer),
      "STALE_MIGRATION",
    );
  });

  it.each([
    [
      "release source",
      (consumer: Record<string, unknown>) => {
        delete consumer.source;
      },
    ],
    [
      "fixture source",
      (consumer: Record<string, unknown>) => {
        const fixtures = consumer.fixtures as Record<string, unknown>;
        delete fixtures.sourceCommit;
      },
    ],
  ])("rejects missing %s provenance", async (_label, mutate) => {
    const { api, manifest } = await loadValidatedManifest();
    const consumer = createCompatibleConsumer(currentRelease(manifest));
    mutate(consumer as unknown as Record<string, unknown>);

    expectRejected(
      api.evaluateConsumerCompatibility(manifest, consumer),
      "MISSING_PROVENANCE",
    );
  });

  it("rejects a package import outside the selected release set", async () => {
    const { api, manifest } = await loadValidatedManifest();
    const consumer = createCompatibleConsumer(currentRelease(manifest));
    consumer.imports.push({
      package: "@reading-advantage/undeclared-engine",
      export: ".",
    });

    expectRejected(
      api.evaluateConsumerCompatibility(manifest, consumer),
      "UNDECLARED_IMPORT",
    );
  });

  it("rejects a package subpath absent from the declared public exports", async () => {
    const { api, manifest } = await loadValidatedManifest();
    const consumer = createCompatibleConsumer(currentRelease(manifest));
    consumer.imports.push({
      package: ENGINE_PACKAGES[0],
      export: "./internal",
    });

    expectRejected(
      api.evaluateConsumerCompatibility(manifest, consumer),
      "UNDECLARED_EXPORT",
    );
  });
});
