import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../..");
const FIXTURE_ROOT = resolve(
  REPOSITORY_ROOT,
  "packages/mastery-runtime-compat/fixtures/consumer",
);
const ENGINE_DIRECTORIES = [
  "knowledge-space-core",
  "knowledge-space-practice",
  "practice-core",
  "srs-engine",
] as const;

interface PackageJson {
  name: string;
  version: string;
  exports: Record<string, string | { types?: string; import?: string; default?: string }>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface NpmPackEntry {
  filename: string;
  files: Array<{ path: string }>;
}

/** Auditable result returned by the safe local release-artifact gate. */
export interface ReleaseArtifactCheckResult {
  /** Package names in deterministic dependency-independent release order. */
  packages: string[];
  /** Confirms every package passed an npm dry-run pack. */
  dryRun: true;
  /** Confirms all declared export targets exist in the packed artifact. */
  exportsVerified: true;
  /** Workspace protocol values found in packed package metadata. */
  workspaceDependencies: string[];
  /** Confirms the offline clean consumer installed and ran the shared gate. */
  cleanConsumer: true;
}

async function executeLocal(
  file: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  return execute(file, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "true",
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
    maxBuffer: 20 * 1024 * 1024,
  });
}

async function readPackageJson(path: string): Promise<PackageJson> {
  return JSON.parse(await readFile(path, "utf8")) as PackageJson;
}

function exportTargets(manifest: PackageJson): string[] {
  return Object.values(manifest.exports).flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    return [entry.types, entry.import, entry.default].filter(
      (value): value is string => typeof value === "string",
    );
  });
}

function workspaceReferences(manifest: PackageJson): string[] {
  const sections = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.optionalDependencies,
    manifest.peerDependencies,
  ];
  return sections.flatMap((section) =>
    Object.entries(section ?? {})
      .filter(([, version]) => version.startsWith("workspace:"))
      .map(([name, version]) => `${manifest.name}:${name}@${version}`),
  );
}

function assertExportTargets(
  manifest: PackageJson,
  packedPaths: ReadonlySet<string>,
): void {
  for (const target of exportTargets(manifest)) {
    const packedTarget = `package/${target.replace(/^\.\//, "")}`;
    if (!packedPaths.has(packedTarget)) {
      throw new Error(
        `${manifest.name} export target ${target} is absent from its release artifact`,
      );
    }
  }
}

async function buildPackage(packageRoot: string): Promise<void> {
  await executeLocal(
    resolve(REPOSITORY_ROOT, "node_modules/.bin/tsc"),
    ["-p", resolve(packageRoot, "tsconfig.json")],
    REPOSITORY_ROOT,
  );
}

async function dryRunPack(
  packageRoot: string,
  manifest: PackageJson,
): Promise<void> {
  const { stdout } = await executeLocal(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    packageRoot,
  );
  const entries = JSON.parse(stdout) as NpmPackEntry[];
  const entry = entries[0];
  if (!entry || !entry.filename.endsWith(".tgz")) {
    throw new Error(`${manifest.name} did not produce an npm dry-run manifest`);
  }
  const dryRunPaths = new Set(entry.files.map((file) => `package/${file.path}`));
  assertExportTargets(manifest, dryRunPaths);
}

async function createPackedArtifact(
  packageRoot: string,
  destination: string,
): Promise<string> {
  const { stdout } = await executeLocal(
    "pnpm",
    ["pack", "--pack-destination", destination],
    packageRoot,
  );
  const archiveName = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".tgz"))
    .at(-1);
  if (!archiveName) {
    throw new Error(`pnpm pack produced no artifact for ${packageRoot}`);
  }
  return resolve(destination, basename(archiveName));
}

async function inspectPackedArtifact(
  archivePath: string,
): Promise<{ manifest: PackageJson; paths: Set<string> }> {
  const [{ stdout: manifestJson }, { stdout: archiveListing }] =
    await Promise.all([
      executeLocal("tar", ["-xOf", archivePath, "package/package.json"], REPOSITORY_ROOT),
      executeLocal("tar", ["-tzf", archivePath], REPOSITORY_ROOT),
    ]);
  return {
    manifest: JSON.parse(manifestJson) as PackageJson,
    paths: new Set(
      archiveListing
        .split(/\r?\n/)
        .map((entry) => entry.replace(/\/$/, ""))
        .filter(Boolean),
    ),
  };
}

async function runCleanConsumer(
  temporaryRoot: string,
  archives: ReadonlyMap<string, string>,
): Promise<void> {
  const consumerRoot = resolve(temporaryRoot, "consumer");
  await cp(FIXTURE_ROOT, consumerRoot, { recursive: true });
  const manifestPath = resolve(consumerRoot, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const localArtifacts = Object.fromEntries(
    [...archives.entries()].map(([name, archive]) => [name, `file:${archive}`]),
  );
  manifest.dependencies = localArtifacts;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const overrides = Object.entries(localArtifacts)
    .map(([name, artifact]) => `  ${JSON.stringify(name)}: ${JSON.stringify(artifact)}`)
    .join("\n");
  await writeFile(
    resolve(consumerRoot, "pnpm-workspace.yaml"),
    `packages:\n  - .\noverrides:\n${overrides}\n`,
    "utf8",
  );

  await executeLocal(
    "pnpm",
    ["install", "--offline", "--ignore-scripts", "--frozen-lockfile=false"],
    consumerRoot,
  );
  await executeLocal(
    process.execPath,
    [
      "check-consumer.mjs",
      resolve(REPOSITORY_ROOT, "packages/mastery-runtime-compat/dist/check-consumer.js"),
      resolve(consumerRoot, "consumer.json"),
    ],
    consumerRoot,
  );
}

/**
 * Builds, dry-run packs, inspects, and offline-installs the four engine packages.
 * @returns Deterministic release evidence with no registry publication or network use.
 * @throws When build, pack metadata, exports, workspace rewriting, or clean consumption fails.
 */
export async function runReleaseArtifactCheck(): Promise<ReleaseArtifactCheckResult> {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "mastery-release-artifact-"));
  try {
    const packageMetadata = await Promise.all(
      ENGINE_DIRECTORIES.map(async (directory) => {
        const packageRoot = resolve(REPOSITORY_ROOT, "packages", directory);
        const manifest = await readPackageJson(resolve(packageRoot, "package.json"));
        return { directory, packageRoot, manifest };
      }),
    );

    await Promise.all(packageMetadata.map(({ packageRoot }) => buildPackage(packageRoot)));
    await buildPackage(resolve(REPOSITORY_ROOT, "packages/mastery-runtime-compat"));
    await Promise.all(
      packageMetadata.map(({ packageRoot, manifest }) =>
        dryRunPack(packageRoot, manifest),
      ),
    );

    const archives = new Map<string, string>();
    const workspaceDependencies: string[] = [];
    for (const { packageRoot, manifest } of packageMetadata) {
      const archivePath = await createPackedArtifact(packageRoot, temporaryRoot);
      const packed = await inspectPackedArtifact(archivePath);
      if (
        packed.manifest.name !== manifest.name ||
        packed.manifest.version !== manifest.version
      ) {
        throw new Error(`${manifest.name} packed metadata changed name or version`);
      }
      assertExportTargets(packed.manifest, packed.paths);
      workspaceDependencies.push(...workspaceReferences(packed.manifest));
      archives.set(manifest.name, archivePath);
    }
    if (workspaceDependencies.length > 0) {
      throw new Error(
        `Packed artifacts retain workspace dependencies: ${workspaceDependencies.join(", ")}`,
      );
    }

    await runCleanConsumer(temporaryRoot, archives);
    return {
      packages: packageMetadata.map(({ manifest }) => manifest.name),
      dryRun: true,
      exportsVerified: true,
      workspaceDependencies,
      cleanConsumer: true,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
