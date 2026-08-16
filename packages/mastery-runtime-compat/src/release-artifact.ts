import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  stat,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

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
const PACKAGED_DIRECTORIES = [
  ...ENGINE_DIRECTORIES,
  "sales-knowledge",
] as const;
const CONSUMER_FIXTURE_FILES = [
  "check-consumer.mjs",
  "consumer.json",
  "package.json",
  "sales-advantage.json",
] as const;
const SALES_KNOWLEDGE_DIRECTORY = "sales-knowledge";
const EXTERNAL_RUNTIME_PACKAGES = [
  { name: "zod", sourceDirectory: "knowledge-space-core" },
  { name: "ts-fsrs", sourceDirectory: "srs-engine" },
] as const;
const GATE_RUNTIME_PACKAGE = {
  name: "zod",
  sourceDirectory: "mastery-runtime-compat",
} as const;
const GATE_ZOD_VERSION = "3.25.76";
const WORKSPACE_MANIFEST_PATH = resolve(REPOSITORY_ROOT, "pnpm-workspace.yaml");
const TRUSTED_WORK_DIRECTORY = "trusted-work";
const WORKSPACE_LEASE_DIRECTORY = ".workspace-build.lease";
const FORBIDDEN_LOCAL_DEPENDENCY_PROTOCOL =
  /^(?:workspace|file|link|portal|catalog):/;
const SALES_SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CLEANUP_RETRY_DELAYS_MS = [25, 50, 100, 200, 400] as const;
const WORKSPACE_LEASE_RETRY_DELAYS_MS = [
  25, 50, 100, 200, 400, 800, 1_600,
] as const;
const WORKSPACE_LEASE_STALE_AFTER_MS = 15 * 60 * 1_000;
const WORKSPACE_LEASE_MAX_WAIT_MS = 5 * 60 * 1_000;
const WORKSPACE_LEASE_MALFORMED_OWNER_AFTER_MS = WORKSPACE_LEASE_MAX_WAIT_MS;
const TEST_HOLD_LEASE_ENV = "RELEASE_ARTIFACT_TEST_HOLD_LEASE_MS";
const TEST_DELAY_BEFORE_CONSUMER_ENV =
  "RELEASE_ARTIFACT_TEST_DELAY_BEFORE_CONSUMER_MS";
const RUNTIME_DIST_FILES = [
  "check-consumer.js",
  "index.js",
  "release-artifact.js",
] as const;
const NPM_OPERATION_CONCURRENCY = 2;
const NPM_EMPTY_OUTPUT_RETRY_DELAYS_MS = [100, 250] as const;

let workspaceBuildQueue: Promise<void> = Promise.resolve();

type PackageExport =
  | string
  | PackageExport[]
  | { [condition: string]: PackageExport };

interface PackageJson {
  [key: string]: unknown;
  name: string;
  version: string;
  exports?: Record<string, PackageExport>;
  files?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface NpmPackEntry {
  filename: string;
  shasum?: string;
  files: Array<{ path: string }>;
}

interface ValidatedArtifactRoot {
  callerRoot: string;
  cacheRoot: string;
  cacheRealPath: string;
}

interface WorkspaceLeaseOwner {
  pid: number;
  token: string;
  acquiredAt: number;
  processStartIdentity?: string;
}

interface WorkspaceLease {
  path: string;
  token: string;
  capability?: WorkspaceLeaseCapability;
  runtime?: WorkspaceLeaseRuntimeContext;
}

interface WorkspaceLeaseCapability {
  parentHandle: FileHandle;
  operationLeasePath: string;
  leaseHandle?: FileHandle;
}

interface ReleaseInputSnapshot {
  manifestPath: string;
  descriptorPaths: string[];
  runtimeDistPath: string;
  consumerFixtureInputs: Array<{
    sourcePath: string;
    snapshotPath: string;
  }>;
  sourceDigestSha256: string;
  auditedHead: string;
}

interface WorkspaceLeaseRuntimeOptions {
  leasePath: string;
  now: () => number;
  maxWaitMs: number;
}

interface WorkspaceLeaseRuntime {
  acquire: () => Promise<WorkspaceLease>;
  release: (lease: WorkspaceLease) => Promise<void>;
}

interface ValidatedWorkspaceLeasePath {
  leasePath: string;
  parentPath: string;
  parentRealPath: string;
  parentDev: number;
  parentIno: number;
  cacheRoot: string;
  cacheRealPath: string;
  cacheDev: number;
}

interface WorkspaceLeaseRuntimeContext extends ValidatedWorkspaceLeasePath {
  now: () => number;
  maxWaitMs: number;
}

interface GateDependencyIdentity {
  package: { name: string; version: string };
  sourceRoot: string;
}

interface ResolvedRuntimeVersions {
  gateZod: string;
  engineZod: string;
  tsFsrs: string;
}

/** Identifies the exact Sales package and public evidence exports checked in a clean consumer. */
export interface ReleaseSalesKnowledgeIdentity {
  /** Published package name bound to the Sales graph release. */
  package: { name: string; version: string };
  /** Public verifier export used for the packed evidence proof. */
  verifierExport: string;
  /** Public evidence-manifest export used for the packed evidence proof. */
  evidenceManifestExport: string;
  /** Immutable source and artifact digests bound by the descriptor. */
  evidence: {
    releaseCandidateByteSha256: string;
    approvalByteSha256: string;
    staticSeedByteSha256: string;
    graphCanonicalSha256: string;
    bindingsCanonicalSha256: string;
  };
}

/** Options controlling a repository-local release-artifact proof. */
export interface ReleaseArtifactCheckOptions {
  /** Absolute caller-owned root beneath the repository `.cache` directory. */
  temporaryRoot: string;
  /** Checked-in consumer descriptors to copy into and verify from the clean consumer. */
  consumerDescriptorPaths: string[];
}

const SalesRuntimeAttestationSchema = z
  .object({
    schemaVersion: z.literal("sales-runtime-attestation.v1"),
    consumer: z
      .object({
        name: z.string().regex(/^[a-z0-9-]+$/),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
      })
      .strict(),
    salesKnowledge: z
      .object({
        package: z
          .object({
            name: z.literal("@reading-advantage/sales-knowledge"),
            version: z.literal("0.1.0"),
          })
          .strict(),
        verifierExport: z.literal("verifySalesReleaseEvidence"),
        evidenceManifestExport: z.literal("salesReleaseEvidenceManifest"),
        releaseId: z.string().regex(/^knowledge-space-[a-z0-9.-]+$/),
        evidence: z
          .object({
            releaseCandidateByteSha256: z.string().regex(SALES_SHA256_PATTERN),
            approvalByteSha256: z.string().regex(SALES_SHA256_PATTERN),
            staticSeedByteSha256: z.string().regex(SALES_SHA256_PATTERN),
            graphCanonicalSha256: z.string().regex(SALES_SHA256_PATTERN),
            bindingsCanonicalSha256: z.string().regex(SALES_SHA256_PATTERN),
          })
          .strict(),
      })
      .strict(),
    verification: z
      .object({ valid: z.literal(true), issues: z.array(z.unknown()) })
      .strict(),
    compatibility: z
      .object({ compatible: z.literal(true), issues: z.array(z.unknown()) })
      .strict(),
    resolvedVersions: z
      .object({
        gateZod: z.string().regex(/^\d+\.\d+\.\d+$/),
        engineZod: z.string().regex(/^\d+\.\d+\.\d+$/),
        tsFsrs: z.string().regex(/^\d+\.\d+\.\d+$/),
      })
      .strict(),
  })
  .strict();

type SalesRuntimeAttestation = z.infer<typeof SalesRuntimeAttestationSchema>;

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
  /** Consumer names whose copied descriptors passed the clean-consumer gate. */
  checkedConsumers: string[];
  /** Sales knowledge identity verified from the packed public package, when present. */
  verifiedSalesKnowledge: ReleaseSalesKnowledgeIdentity;
  /** Dependency versions resolved inside the clean consumer for gate and engines. */
  resolvedVersions: ResolvedRuntimeVersions;
  /** Git revision observed while the release inputs were snapshotted. */
  auditedHead: string;
  /** SHA-256 digest of the immutable release input snapshot. */
  sourceDigestSha256: string;
  /** SHA-256 digest for each archive consumed by the clean consumer. */
  archiveDigestsSha256: Record<string, string>;
}

async function executeLocal(
  file: string,
  args: string[],
  cwd: string,
  packageStateRoot?: string,
): Promise<{ stdout: string; stderr: string }> {
  const packageState =
    packageStateRoot == null
      ? {}
      : {
          npm_config_cache: resolve(packageStateRoot, "npm-cache"),
          npm_config_globalconfig: resolve(packageStateRoot, "npm-globalrc"),
          npm_config_userconfig: resolve(packageStateRoot, "npmrc"),
        };
  return execute(file, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "true",
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_ignore_scripts: "true",
      npm_config_offline: "true",
      ...packageState,
    },
    maxBuffer: 20 * 1024 * 1024,
  });
}

/** Serializes builds and reads from shared package dist directories across concurrent proofs. */
async function withWorkspaceBuildLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const previous = workspaceBuildQueue;
  let release!: () => void;
  workspaceBuildQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

interface FifoSemaphoreObserver {
  onStart: () => void;
  onFinish: () => void;
}

/** Creates a FIFO semaphore whose released tokens are handed directly to queued waiters. */
function createFifoSemaphore(
  concurrency: number,
  observer?: FifoSemaphoreObserver,
): { run: <T>(operation: () => Promise<T>) => Promise<T> } {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Semaphore concurrency must be a positive integer");
  }
  let active = 0;
  const waiters: Array<() => void> = [];
  return {
    async run<T>(operation: () => Promise<T>): Promise<T> {
      const hasImmediateToken = active < concurrency;
      if (!hasImmediateToken) {
        await new Promise<void>((resolveWaiter) => waiters.push(resolveWaiter));
      } else {
        active += 1;
      }
      observer?.onStart();
      try {
        return await operation();
      } finally {
        observer?.onFinish();
        const next = waiters.shift();
        if (next) {
          next();
        } else {
          active -= 1;
        }
      }
    },
  };
}

/** Limits concurrent npm pack subprocesses so their JSON output remains reliable. */
const npmOperationSemaphore = createFifoSemaphore(NPM_OPERATION_CONCURRENCY);

/** Runs a deterministic probe against the production FIFO npm-operation scheduler. */
export interface NpmOperationSchedulerProbe {
  /** Starts one named operation through the bounded scheduler. */
  run<T>(label: string, operation: () => Promise<T>): Promise<T>;
  /** Returns operation labels in the order the scheduler granted tokens. */
  startOrder(): string[];
  /** Returns the greatest number of operations active at once. */
  maxActive(): number;
}

/** Creates an instrumented FIFO scheduler probe for deterministic concurrency tests. */
export function createNpmOperationSchedulerForTest(
  concurrency = NPM_OPERATION_CONCURRENCY,
): NpmOperationSchedulerProbe {
  const startOrder: string[] = [];
  let active = 0;
  let maxActive = 0;
  const semaphore = createFifoSemaphore(concurrency, {
    onStart: () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
    },
    onFinish: () => {
      active -= 1;
    },
  });
  return {
    run<T>(label: string, operation: () => Promise<T>): Promise<T> {
      return semaphore.run(async () => {
        startOrder.push(label);
        return operation();
      });
    },
    startOrder: () => [...startOrder],
    maxActive: () => maxActive,
  };
}

async function withNpmOperationSlot<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return npmOperationSemaphore.run(operation);
}

/** Confirms two regular-file observations refer to the same unchanged inode. */
function sameRegularFile(
  before: {
    dev: number;
    ino: number;
    size: number;
    mtimeMs: number;
    isFile: () => boolean;
  },
  after: {
    dev: number;
    ino: number;
    size: number;
    mtimeMs: number;
    isFile: () => boolean;
  },
): boolean {
  return (
    before.isFile() &&
    after.isFile() &&
    before.dev === after.dev &&
    before.ino === after.ino &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs
  );
}

/** Reads only validated regular-file bytes and rejects symlink or replacement races. */
async function readRegularFileBytes(
  path: string,
  label: string,
): Promise<Buffer> {
  const before = await lstat(path);
  if (!before.isFile()) {
    throw new Error(
      `${label} must be a regular file, not a symlink or directory`,
    );
  }
  const bytes = await readFile(path);
  const after = await lstat(path);
  if (!sameRegularFile(before, after)) {
    throw new Error(`${label} changed while it was being read`);
  }
  return bytes;
}

/** Creates a new regular target from validated bytes without following a target symlink. */
async function writeNewRegularFile(
  path: string,
  bytes: Uint8Array,
  label: string,
): Promise<void> {
  await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
  const written = await lstat(path);
  if (!written.isFile()) {
    throw new Error(`${label} was not written as a regular file`);
  }
}

/** Parses the final JSON line emitted by the in-consumer packed proof. */
function parseSalesRuntimeAttestation(stdout: string): SalesRuntimeAttestation {
  const line = stdout
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .at(-1);
  if (!line) throw new Error("Packed Sales consumer emitted no attestation");
  let raw: unknown;
  try {
    raw = JSON.parse(line) as unknown;
  } catch (error) {
    throw new Error(
      `Packed Sales consumer emitted invalid attestation JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const parsed = SalesRuntimeAttestationSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Packed Sales consumer emitted an invalid attestation: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

/** Returns whether a candidate path is a strict descendant of a parent path. */
function isStrictlyInside(parent: string, candidate: string): boolean {
  const child = relative(parent, candidate);
  return (
    child !== "" &&
    child !== ".." &&
    !child.startsWith(`..${sep}`) &&
    !isAbsolute(child)
  );
}

/** Finds the nearest existing ancestor without creating or modifying any path. */
async function nearestExistingAncestor(path: string): Promise<string> {
  let candidate = path;
  while (true) {
    try {
      await lstat(candidate);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = resolve(candidate, "..");
      if (parent === candidate) return candidate;
      candidate = parent;
    }
  }
}

/** Rejects symlink path components below a trusted directory boundary. */
async function assertNoSymlinkComponents(
  trustedParent: string,
  candidate: string,
  label: string,
): Promise<void> {
  const child = relative(trustedParent, candidate);
  if (
    child === "" ||
    child === ".." ||
    child.startsWith(`..${sep}`) ||
    isAbsolute(child)
  ) {
    throw new Error(`${label} must remain inside its trusted parent`);
  }
  let current = trustedParent;
  for (const component of child.split(sep).filter(Boolean)) {
    current = resolve(current, component);
    try {
      const entry = await lstat(current);
      if (entry.isSymbolicLink()) {
        throw new Error(`${label} cannot contain symlink path components`);
      }
      if (!entry.isDirectory() && current !== candidate) {
        throw new Error(`${label} contains a non-directory path component`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}

/** Resolves and validates the repository cache boundary used by all trusted work. */
async function validateCacheBoundary(): Promise<{
  cacheRoot: string;
  cacheRealPath: string;
}> {
  const repositoryRealPath = await realpath(REPOSITORY_ROOT);
  const cacheRoot = resolve(REPOSITORY_ROOT, ".cache");
  const cacheEntry = await lstat(cacheRoot);
  if (!cacheEntry.isDirectory() || cacheEntry.isSymbolicLink()) {
    throw new Error("repository .cache must be a non-symlink directory");
  }
  const cacheRealPath = await realpath(cacheRoot);
  if (!isStrictlyInside(repositoryRealPath, cacheRealPath)) {
    throw new Error(
      "repository .cache must resolve strictly inside the repository",
    );
  }
  return { cacheRoot, cacheRealPath };
}

/** Validates a caller root before any release-artifact writes are attempted. */
async function validateTemporaryRoot(
  temporaryRoot: string,
): Promise<ValidatedArtifactRoot> {
  if (!isAbsolute(temporaryRoot)) {
    throw new Error(
      "temporaryRoot must be an absolute path beneath the repository .cache directory",
    );
  }

  const { cacheRoot, cacheRealPath } = await validateCacheBoundary();
  const candidate = resolve(temporaryRoot);
  if (!isStrictlyInside(cacheRoot, candidate)) {
    throw new Error(
      "temporaryRoot must be strictly beneath the repository .cache directory",
    );
  }

  await assertNoSymlinkComponents(cacheRoot, candidate, "temporaryRoot");
  const existingAncestor = await nearestExistingAncestor(candidate);
  const ancestorRealPath = await realpath(existingAncestor);
  if (
    ancestorRealPath !== cacheRealPath &&
    !isStrictlyInside(cacheRealPath, ancestorRealPath)
  ) {
    throw new Error(
      "temporaryRoot resolves outside the repository .cache directory",
    );
  }

  try {
    const candidateEntry = await lstat(candidate);
    if (candidateEntry.isSymbolicLink() || !candidateEntry.isDirectory()) {
      throw new Error("temporaryRoot must be a non-symlink directory");
    }
    const candidateRealPath = await realpath(candidate);
    if (
      candidateRealPath !== cacheRealPath &&
      !isStrictlyInside(cacheRealPath, candidateRealPath)
    ) {
      throw new Error(
        "temporaryRoot resolves outside the repository .cache directory",
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return { callerRoot: candidate, cacheRoot, cacheRealPath };
}

/** Creates the caller namespace without placing release artifacts beneath its mutable path. */
async function ensureCallerRootNamespace(
  root: ValidatedArtifactRoot,
): Promise<void> {
  try {
    const entry = await lstat(root.callerRoot);
    if (entry.isSymbolicLink() || !entry.isDirectory()) {
      throw new Error("temporaryRoot must be a non-symlink directory");
    }
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(root.callerRoot, { recursive: true });
  const created = await lstat(root.callerRoot);
  if (created.isSymbolicLink() || !created.isDirectory()) {
    throw new Error("temporaryRoot namespace was not created as a directory");
  }
}

/** Creates the trusted work directory that owns actual release artifacts and cleanup. */
async function ensureTrustedWorkRoot(
  root: ValidatedArtifactRoot,
): Promise<string> {
  const parent = resolve(root.cacheRealPath, "mastery-runtime-compat");
  await assertNoSymlinkComponents(
    root.cacheRealPath,
    parent,
    "trusted mastery-runtime-compat cache directory",
  );
  await mkdir(parent, { recursive: true });
  const parentEntry = await lstat(parent);
  if (parentEntry.isSymbolicLink() || !parentEntry.isDirectory()) {
    throw new Error("trusted mastery-runtime-compat cache directory is unsafe");
  }
  const trustedRoot = resolve(parent, TRUSTED_WORK_DIRECTORY);
  await assertNoSymlinkComponents(
    root.cacheRealPath,
    trustedRoot,
    "trusted release work directory",
  );
  await mkdir(trustedRoot, { recursive: true });
  const trustedEntry = await lstat(trustedRoot);
  if (trustedEntry.isSymbolicLink() || !trustedEntry.isDirectory()) {
    throw new Error("trusted release work directory is unsafe");
  }
  const trustedRealPath = await realpath(trustedRoot);
  if (!isStrictlyInside(root.cacheRealPath, trustedRealPath)) {
    throw new Error("trusted release work directory escaped repository .cache");
  }
  return trustedRealPath;
}

/** Validates a lease path before it receives a retained parent capability. */
async function validateWorkspaceLeasePath(
  leasePath: string,
  rejectCanonicalTrustedRoot: boolean,
): Promise<ValidatedWorkspaceLeasePath> {
  if (!isAbsolute(leasePath)) {
    throw new Error(
      "leasePath must be an absolute path beneath the repository .cache directory",
    );
  }
  const { cacheRoot, cacheRealPath } = await validateCacheBoundary();
  const candidate = resolve(leasePath);
  if (!isStrictlyInside(cacheRoot, candidate)) {
    throw new Error(
      "leasePath must be strictly beneath the repository .cache directory",
    );
  }
  await assertNoSymlinkComponents(cacheRoot, candidate, "leasePath");
  const canonicalTrustedRoot = resolve(
    cacheRealPath,
    "mastery-runtime-compat",
    TRUSTED_WORK_DIRECTORY,
  );
  if (
    rejectCanonicalTrustedRoot &&
    (candidate === canonicalTrustedRoot ||
      isStrictlyInside(canonicalTrustedRoot, candidate))
  ) {
    throw new Error(
      "leasePath cannot target the canonical trusted work directory",
    );
  }

  const parentPath = dirname(candidate);
  const parentEntry = await lstat(parentPath);
  if (parentEntry.isSymbolicLink() || !parentEntry.isDirectory()) {
    throw new Error("leasePath parent must be an existing directory");
  }
  const parentRealPath = await realpath(parentPath);
  if (
    parentRealPath !== cacheRealPath &&
    !isStrictlyInside(cacheRealPath, parentRealPath)
  ) {
    throw new Error("leasePath parent resolves outside the repository .cache");
  }

  try {
    const candidateEntry = await lstat(candidate);
    if (candidateEntry.isSymbolicLink() || !candidateEntry.isDirectory()) {
      throw new Error(
        "leasePath must be a non-symlink directory when it exists",
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const [cacheEntry, parentStat] = await Promise.all([
    stat(cacheRealPath),
    stat(parentPath),
  ]);
  if (cacheEntry.dev !== parentStat.dev) {
    throw new Error("leasePath must remain on the repository .cache device");
  }
  return {
    leasePath: candidate,
    parentPath,
    parentRealPath,
    parentDev: parentStat.dev,
    parentIno: parentStat.ino,
    cacheRoot,
    cacheRealPath,
    cacheDev: cacheEntry.dev,
  };
}

/** Validates the canonical production lease beneath the retained trusted work root. */
async function validateProductionWorkspaceLeasePath(
  trustedWorkRoot: string,
): Promise<ValidatedWorkspaceLeasePath> {
  return validateWorkspaceLeasePath(
    resolve(trustedWorkRoot, WORKSPACE_LEASE_DIRECTORY),
    false,
  );
}

/** Builds a descriptor-relative path for one retained file capability. */
function descriptorRelativePath(handle: FileHandle, child: string): string {
  const descriptorRoot =
    process.platform === "linux"
      ? "/proc/self/fd"
      : process.platform === "darwin"
        ? "/dev/fd"
        : null;
  if (descriptorRoot == null) {
    throw new Error(
      "workspace lease capability is unsupported on this platform",
    );
  }
  return resolve(descriptorRoot, String(handle.fd), child);
}

/** Opens the retained parent capability used by one isolated lease acquisition. */
async function createWorkspaceLeaseCapability(
  runtime: WorkspaceLeaseRuntimeContext,
): Promise<WorkspaceLeaseCapability> {
  const parentHandle = await open(runtime.parentPath, "r");
  try {
    const [openedParentStat, openedParentRealPath] = await Promise.all([
      parentHandle.stat(),
      realpath(runtime.parentPath),
    ]);
    if (
      openedParentRealPath !== runtime.parentRealPath ||
      !openedParentStat.isDirectory() ||
      openedParentStat.dev !== runtime.parentDev ||
      openedParentStat.ino !== runtime.parentIno
    ) {
      throw new Error("leasePath parent changed before capability creation");
    }
    return {
      parentHandle,
      operationLeasePath: descriptorRelativePath(
        parentHandle,
        basename(runtime.leasePath),
      ),
    };
  } catch (error) {
    await parentHandle.close().catch(() => undefined);
    throw error;
  }
}

/** Opens and verifies the lease directory without following a swapped symlink. */
async function openWorkspaceLeaseDirectory(
  capability: WorkspaceLeaseCapability,
): Promise<FileHandle> {
  const leaseHandle = await open(
    capability.operationLeasePath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
  );
  try {
    const [leaseEntry, leaseStat] = await Promise.all([
      lstat(capability.operationLeasePath),
      leaseHandle.stat(),
    ]);
    if (
      leaseEntry.isSymbolicLink() ||
      !leaseEntry.isDirectory() ||
      !leaseStat.isDirectory() ||
      leaseEntry.dev !== leaseStat.dev ||
      leaseEntry.ino !== leaseStat.ino
    ) {
      throw new Error("workspace lease directory changed before owner write");
    }
    return leaseHandle;
  } catch (error) {
    await leaseHandle.close().catch(() => undefined);
    throw error;
  }
}

/** Revalidates a retained lease parent before a filesystem operation. */
async function assertWorkspaceLeaseParent(
  runtime: WorkspaceLeaseRuntimeContext,
  capability: WorkspaceLeaseCapability,
): Promise<void> {
  const parentStat = await capability.parentHandle.stat();
  if (
    !parentStat.isDirectory() ||
    parentStat.dev !== runtime.parentDev ||
    parentStat.ino !== runtime.parentIno
  ) {
    throw new Error("leasePath parent capability changed before operation");
  }
  const capabilityParentRealPath = await realpath(
    dirname(capability.operationLeasePath),
  );
  if (
    capabilityParentRealPath !== runtime.cacheRealPath &&
    !isStrictlyInside(runtime.cacheRealPath, capabilityParentRealPath)
  ) {
    throw new Error(
      "leasePath parent capability escaped the repository .cache",
    );
  }
}

/** Rechecks a retained lease after acquisition before returning it. */
async function assertWorkspaceLeaseAfterAcquire(
  runtime: WorkspaceLeaseRuntimeContext,
  capability: WorkspaceLeaseCapability,
): Promise<void> {
  await assertWorkspaceLeaseParent(runtime, capability);
  const leaseHandle = capability.leaseHandle;
  if (leaseHandle == null) {
    throw new Error("workspace lease directory capability is missing");
  }
  const leaseStat = await leaseHandle.stat();
  const leaseEntry = await lstat(capability.operationLeasePath);
  if (
    leaseEntry.isSymbolicLink() ||
    !leaseEntry.isDirectory() ||
    !leaseStat.isDirectory() ||
    leaseEntry.dev !== leaseStat.dev ||
    leaseEntry.ino !== leaseStat.ino
  ) {
    throw new Error("acquired workspace lease changed before owner write");
  }
}

/** Returns whether a process identifier still names a live process. */
function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Returns a Linux process start identity, or null when the platform cannot provide one. */
async function readProcessStartIdentity(pid: number): Promise<string | null> {
  if (process.platform !== "linux") return null;
  try {
    const statLine = await readFile(`/proc/${pid}/stat`, "utf8");
    const closeParenthesis = statLine.lastIndexOf(")");
    const fields = statLine
      .slice(closeParenthesis + 2)
      .trim()
      .split(/\s+/);
    const startTime = fields[19];
    return startTime && /^\d+$/.test(startTime) ? startTime : null;
  } catch {
    return null;
  }
}

/** Checks a lease owner against both liveness and its platform process identity. */
async function isWorkspaceLeaseOwnerAlive(
  owner: WorkspaceLeaseOwner,
): Promise<boolean> {
  if (!isProcessAlive(owner.pid)) return false;
  if (owner.processStartIdentity == null) return true;
  const currentIdentity = await readProcessStartIdentity(owner.pid);
  return (
    currentIdentity == null || currentIdentity === owner.processStartIdentity
  );
}

/** Reads a valid lease owner, returning null for missing or malformed metadata. */
async function readWorkspaceLeaseOwner(
  leasePath: string,
  leaseIsDirectory = true,
): Promise<WorkspaceLeaseOwner | null> {
  const ownerPath = leaseIsDirectory
    ? resolve(leasePath, "owner.json")
    : leasePath;
  try {
    const ownerEntry = await lstat(ownerPath);
    if (ownerEntry.isSymbolicLink() || !ownerEntry.isFile()) return null;
    const owner = JSON.parse(
      await readFile(ownerPath, "utf8"),
    ) as WorkspaceLeaseOwner;
    if (
      !Number.isInteger(owner.pid) ||
      owner.pid <= 0 ||
      typeof owner.token !== "string" ||
      owner.token.length === 0 ||
      !Number.isFinite(owner.acquiredAt) ||
      (owner.processStartIdentity != null &&
        (typeof owner.processStartIdentity !== "string" ||
          !/^\d+$/.test(owner.processStartIdentity)))
    ) {
      return null;
    }
    return owner;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    return null;
  }
}

/** Removes a stale exclusive reclaim marker without disturbing an active reclaimer. */
async function clearStaleWorkspaceReclaimMarker(
  markerPath: string,
  now: () => number = Date.now,
): Promise<void> {
  try {
    const markerEntry = await lstat(markerPath);
    if (markerEntry.isSymbolicLink() || !markerEntry.isFile()) return;
    let marker: WorkspaceLeaseOwner | null = null;
    try {
      marker = JSON.parse(
        await readFile(markerPath, "utf8"),
      ) as WorkspaceLeaseOwner;
    } catch {
      // A truncated marker is reclaimable only after its own mtime is stale.
    }
    const stale =
      marker == null
        ? now() - markerEntry.mtimeMs >=
          WORKSPACE_LEASE_MALFORMED_OWNER_AFTER_MS
        : now() - marker.acquiredAt >= WORKSPACE_LEASE_STALE_AFTER_MS &&
          !(await isWorkspaceLeaseOwnerAlive(marker));
    if (stale) await rm(markerPath, { force: false }).catch(() => undefined);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/** Attempts to reclaim a stale lease without deleting a live valid owner. */
async function reclaimStaleWorkspaceLease(
  leasePath: string,
  now: () => number = Date.now,
): Promise<boolean> {
  let leaseEntry;
  try {
    leaseEntry = await lstat(leasePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  if (
    leaseEntry.isSymbolicLink() ||
    (!leaseEntry.isDirectory() && !leaseEntry.isFile())
  )
    return false;
  const leaseIsDirectory = leaseEntry.isDirectory();
  const owner = await readWorkspaceLeaseOwner(leasePath, leaseIsDirectory);
  const leaseIsStale =
    owner == null
      ? now() - leaseEntry.mtimeMs >= WORKSPACE_LEASE_MALFORMED_OWNER_AFTER_MS
      : now() - owner.acquiredAt >= WORKSPACE_LEASE_STALE_AFTER_MS &&
        !(await isWorkspaceLeaseOwnerAlive(owner));
  if (!leaseIsStale) return false;

  const reclaimPath = `${leasePath}.reclaim`;
  try {
    await writeFile(
      reclaimPath,
      `${JSON.stringify({
        pid: process.pid,
        token: `${process.pid}-${randomUUID()}`,
        acquiredAt: now(),
        processStartIdentity:
          (await readProcessStartIdentity(process.pid)) ?? undefined,
      })}\n`,
      { flag: "wx", mode: 0o600 },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      await clearStaleWorkspaceReclaimMarker(reclaimPath, now);
      return false;
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
  try {
    const currentEntry = await lstat(leasePath);
    if (
      currentEntry.isSymbolicLink() ||
      (!currentEntry.isDirectory() && !currentEntry.isFile())
    )
      return false;
    const currentOwner = await readWorkspaceLeaseOwner(
      leasePath,
      currentEntry.isDirectory(),
    );
    if (currentOwner != null) {
      if (await isWorkspaceLeaseOwnerAlive(currentOwner)) return false;
      if (
        owner != null &&
        (currentOwner.pid !== owner.pid ||
          currentOwner.token !== owner.token ||
          currentOwner.acquiredAt !== owner.acquiredAt)
      ) {
        return false;
      }
    } else if (!leaseIsStale) {
      return false;
    }
    await rm(leasePath, {
      recursive: currentEntry.isDirectory(),
      force: false,
    });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  } finally {
    await rm(reclaimPath, { force: true }).catch(() => undefined);
  }
}

/** Acquires a cross-process filesystem lease through a retained parent capability. */
async function acquireWorkspaceLease(
  runtime: WorkspaceLeaseRuntimeContext,
): Promise<WorkspaceLease> {
  const publicLeasePath = runtime.leasePath;
  const now = runtime.now;
  const maxWaitMs = runtime.maxWaitMs;
  const capability = await createWorkspaceLeaseCapability(runtime);
  const leasePath = capability.operationLeasePath;
  const token = `${process.pid}-${randomUUID()}`;
  const startedAt = now();
  let retainCapability = false;
  try {
    for (let attempt = 0; ; attempt += 1) {
      await assertWorkspaceLeaseParent(runtime, capability);
      try {
        await mkdir(leasePath);
        const leaseHandle = await openWorkspaceLeaseDirectory(capability);
        capability.leaseHandle = leaseHandle;
        await assertWorkspaceLeaseAfterAcquire(runtime, capability);
        const ownerTempPath = descriptorRelativePath(
          leaseHandle,
          `.owner-${token}.tmp`,
        );
        const ownerPath = descriptorRelativePath(leaseHandle, "owner.json");
        await assertWorkspaceLeaseParent(runtime, capability);
        try {
          await writeFile(
            ownerTempPath,
            `${JSON.stringify({
              pid: process.pid,
              token,
              acquiredAt: now(),
              processStartIdentity:
                (await readProcessStartIdentity(process.pid)) ?? undefined,
            })}\n`,
            { flag: "wx", mode: 0o600 },
          );
        } catch (error) {
          await assertWorkspaceLeaseAfterAcquire(runtime, capability);
          throw error;
        }
        await assertWorkspaceLeaseAfterAcquire(runtime, capability);
        await rename(ownerTempPath, ownerPath);
        await assertWorkspaceLeaseAfterAcquire(runtime, capability);
        retainCapability = true;
        return { path: publicLeasePath, token, capability, runtime };
      } catch (error) {
        const leaseHandle = capability.leaseHandle;
        capability.leaseHandle = undefined;
        await leaseHandle?.close().catch(() => undefined);
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await assertWorkspaceLeaseParent(runtime, capability);
        await reclaimStaleWorkspaceLease(leasePath, now);
        if (now() - startedAt >= maxWaitMs) {
          throw new Error("Timed out waiting for the shared workspace lease");
        }
        const delay =
          WORKSPACE_LEASE_RETRY_DELAYS_MS[
            Math.min(attempt, WORKSPACE_LEASE_RETRY_DELAYS_MS.length - 1)
          ];
        await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      }
    }
  } finally {
    if (!retainCapability) {
      await capability.parentHandle.close().catch(() => undefined);
    }
  }
}

/** Releases a cross-process workspace lease only when its owner token still matches. */
async function releaseWorkspaceLease(lease: WorkspaceLease): Promise<boolean> {
  const capability = lease.capability;
  const runtime = lease.runtime;
  if (capability == null || runtime == null) return false;
  const operationLeasePath = capability.operationLeasePath;
  let released = false;
  try {
    await assertWorkspaceLeaseParent(runtime, capability);
    try {
      await assertWorkspaceLeaseAfterAcquire(runtime, capability);
    } catch {
      released = true;
      return released;
    }
    const leaseHandle = capability.leaseHandle;
    if (leaseHandle == null) return false;
    const owner = await readWorkspaceLeaseOwner(
      descriptorRelativePath(leaseHandle, "."),
    );
    if (owner?.token !== lease.token) return false;
    await assertWorkspaceLeaseAfterAcquire(runtime, capability);
    await rm(operationLeasePath, { recursive: true, force: false });
    released = true;
    return released;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    released = true;
    return released;
  } finally {
    if (released) {
      await capability.leaseHandle?.close().catch(() => undefined);
      capability.leaseHandle = undefined;
      await capability.parentHandle.close().catch(() => undefined);
    }
  }
}

/**
 * Creates an internal workspace lease runtime for isolated tests.
 * @param options Validated test lease path, clock, and acquisition wait limit.
 * @returns An isolated acquire and token-checked release runtime.
 * @throws When options target an unsafe path or contain an invalid wait setting.
 */
export async function createWorkspaceLeaseRuntimeForTest(
  options: WorkspaceLeaseRuntimeOptions,
): Promise<WorkspaceLeaseRuntime> {
  if (typeof options.now !== "function") {
    throw new Error("workspace lease test clock must be a function");
  }
  if (!Number.isFinite(options.maxWaitMs) || options.maxWaitMs <= 0) {
    throw new Error(
      "workspace lease test wait must be a positive finite number",
    );
  }
  const validated = await validateWorkspaceLeasePath(options.leasePath, true);
  const runtime: WorkspaceLeaseRuntimeContext = {
    ...validated,
    now: options.now,
    maxWaitMs: options.maxWaitMs,
  };
  const activeCapabilities = new Set<WorkspaceLeaseCapability>();
  return {
    acquire: async () => {
      const lease = await acquireWorkspaceLease(runtime);
      if (lease.capability) activeCapabilities.add(lease.capability);
      return lease;
    },
    release: async (lease) => {
      const capability = lease.capability;
      if (
        lease.path !== runtime.leasePath ||
        capability == null ||
        !activeCapabilities.has(capability)
      ) {
        return;
      }
      try {
        await assertWorkspaceLeaseParent(runtime, capability);
      } catch {
        activeCapabilities.delete(capability);
        await capability.leaseHandle?.close().catch(() => undefined);
        capability.leaseHandle = undefined;
        await capability.parentHandle.close().catch(() => undefined);
        return;
      }
      const released = await releaseWorkspaceLease(lease);
      if (released) {
        activeCapabilities.delete(capability);
      }
    },
  };
}

/** Creates a unique child beneath the canonical trusted work root. */
async function createArtifactChild(trustedWorkRoot: string): Promise<string> {
  return mkdtemp(join(trustedWorkRoot, ".release-artifact-"));
}

/** Removes only a validated release child beneath the canonical trusted work root. */
async function removeArtifactChild(
  trustedWorkRoot: string,
  childPath: string,
): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    const rootEntry = await lstat(trustedWorkRoot);
    if (rootEntry.isSymbolicLink() || !rootEntry.isDirectory()) {
      throw new Error(
        "trusted release work directory is unsafe during cleanup",
      );
    }
    const rootRealPath = await realpath(trustedWorkRoot);
    if (
      !isStrictlyInside(
        (await validateCacheBoundary()).cacheRealPath,
        rootRealPath,
      )
    ) {
      throw new Error(
        "trusted release work directory escaped repository .cache",
      );
    }
    let childBefore;
    try {
      childBefore = await lstat(childPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    if (childBefore.isSymbolicLink() || !childBefore.isDirectory()) {
      throw new Error(
        "release artifact child is no longer a regular directory",
      );
    }
    const childRealPath = await realpath(childPath);
    if (!isStrictlyInside(rootRealPath, childRealPath)) {
      throw new Error(
        "release artifact child resolves outside the caller root",
      );
    }
    try {
      await rm(childPath, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const retryDelay = CLEANUP_RETRY_DELAYS_MS[attempt];
      if (code !== "ENOTEMPTY" || retryDelay == null) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, retryDelay));
    }
  }
}

async function readPackageJson(path: string): Promise<PackageJson> {
  return JSON.parse(await readFile(path, "utf8")) as PackageJson;
}

/** Reads the repository catalog values needed to normalize publishable manifests. */
async function readWorkspaceCatalogVersions(): Promise<Record<string, string>> {
  const lines = (await readFile(WORKSPACE_MANIFEST_PATH, "utf8")).split(
    /\r?\n/,
  );
  const catalog: Record<string, string> = {};
  let inCatalog = false;
  for (const line of lines) {
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true;
      continue;
    }
    if (inCatalog && line.length > 0 && !/^\s/.test(line)) {
      break;
    }
    if (!inCatalog) continue;
    const match = line.match(
      /^\s{2}(?:"([^"]+)"|'([^']+)'|([^:]+)):\s*(\S+)\s*$/,
    );
    if (!match) continue;
    const name = match[1] ?? match[2] ?? match[3];
    if (!name) continue;
    catalog[name.trim()] = match[4].replace(/^['"]|['"]$/g, "");
  }
  return catalog;
}

/** Resolves a dependency protocol to a publishable exact or catalog version. */
function resolvePublishDependencyVersion(
  dependencyName: string,
  requestedVersion: string,
  localPackageVersions: ReadonlyMap<string, string>,
  catalogVersions: Readonly<Record<string, string>>,
  packedPackageVersions: ReadonlyMap<string, string> = localPackageVersions,
): string {
  const packedVersion = packedPackageVersions.get(dependencyName);
  if (packedVersion) return packedVersion;
  if (requestedVersion.startsWith("workspace:")) {
    const localVersion = localPackageVersions.get(dependencyName);
    if (!localVersion) {
      throw new Error(
        `Cannot publish-normalize ${dependencyName}@${requestedVersion}: local package is not staged`,
      );
    }
    return localVersion;
  }
  if (requestedVersion.startsWith("catalog:")) {
    const catalogVersion = catalogVersions[dependencyName];
    if (!catalogVersion) {
      throw new Error(`Workspace catalog has no entry for ${dependencyName}`);
    }
    return catalogVersion;
  }
  if (FORBIDDEN_LOCAL_DEPENDENCY_PROTOCOL.test(requestedVersion)) {
    throw new Error(
      `Cannot publish-normalize unsupported dependency protocol ${dependencyName}@${requestedVersion}`,
    );
  }
  return requestedVersion;
}

/** Creates a publishable manifest with exact local runtime dependencies and no development metadata.
 * @param manifest Source package metadata.
 * @param localPackageVersions Exact versions for staged workspace packages.
 * @param catalogVersions Versions read from the repository workspace catalog.
 * @param packedPackageVersions Exact versions for every package staged into release artifacts.
 * @returns A publish-normalized package manifest suitable for npm packing.
 */
export function normalizePublishManifestForRelease(
  manifest: PackageJson,
  localPackageVersions: ReadonlyMap<string, string>,
  catalogVersions: Readonly<Record<string, string>>,
  packedPackageVersions: ReadonlyMap<string, string> = localPackageVersions,
): PackageJson {
  const normalized = JSON.parse(JSON.stringify(manifest)) as PackageJson;
  delete normalized.private;
  delete normalized.scripts;
  delete normalized.devDependencies;
  delete normalized.publishConfig;
  for (const section of [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ] as const) {
    const dependencies = normalized[section];
    if (!dependencies || typeof dependencies !== "object") continue;
    normalized[section] = Object.fromEntries(
      Object.entries(dependencies as Record<string, string>).map(
        ([name, version]) => [
          name,
          resolvePublishDependencyVersion(
            name,
            version,
            localPackageVersions,
            catalogVersions,
            packedPackageVersions,
          ),
        ],
      ),
    );
  }
  return normalized;
}

interface StagedPackage {
  directory: string;
  packageRoot: string;
  manifest: PackageJson;
}

interface PackedArtifact {
  name: string;
  archivePath: string;
  installArchivePath: string;
  archiveBytes: Buffer;
  archiveSha1: string;
  archiveSha256: string;
  workspaceDependencies: string[];
}

interface ExternalPackageSource {
  spec: { name: string; sourceDirectory: string };
  sourceRoot: string;
  manifest: PackageJson;
}

/** Finds an installed package root by walking upward from its resolved entrypoint. */
async function findPackageRootFromEntry(
  entryPath: string,
  packageName: string,
): Promise<string> {
  let candidate = dirname(entryPath);
  while (true) {
    try {
      const manifest = await readPackageJson(
        resolve(candidate, "package.json"),
      );
      if (manifest.name === packageName) return realpath(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const parent = resolve(candidate, "..");
    if (parent === candidate) break;
    candidate = parent;
  }
  throw new Error(
    `Resolved ${packageName} entrypoint has no matching package root`,
  );
}

/** Stages a built local package with only publishable files and normalized metadata. */
async function stagePublishPackage(
  sourceRoot: string,
  directory: string,
  manifest: PackageJson,
  stageRoot: string,
  localPackageVersions: ReadonlyMap<string, string>,
  catalogVersions: Readonly<Record<string, string>>,
  packedPackageVersions: ReadonlyMap<string, string>,
): Promise<StagedPackage> {
  const packageRoot = resolve(stageRoot, directory);
  await mkdir(packageRoot, { recursive: true });
  await cp(resolve(sourceRoot, "dist"), resolve(packageRoot, "dist"), {
    recursive: true,
  });
  const normalizedManifest = normalizePublishManifestForRelease(
    manifest,
    localPackageVersions,
    catalogVersions,
    packedPackageVersions,
  );
  await writeFile(
    resolve(packageRoot, "package.json"),
    `${JSON.stringify(normalizedManifest, null, 2)}\n`,
    "utf8",
  );
  return { directory, packageRoot, manifest: normalizedManifest };
}

/** Resolves an external runtime dependency from its package-local installed graph. */
async function readExternalPackageSource(spec: {
  name: string;
  sourceDirectory: string;
}): Promise<ExternalPackageSource> {
  const anchorRoot = resolve(REPOSITORY_ROOT, "packages", spec.sourceDirectory);
  let sourceRoot: string;
  try {
    sourceRoot = await realpath(resolve(anchorRoot, "node_modules", spec.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const requireFromAnchor = createRequire(
      resolve(anchorRoot, "package.json"),
    );
    sourceRoot = await findPackageRootFromEntry(
      requireFromAnchor.resolve(spec.name),
      spec.name,
    );
  }
  const manifest = await readPackageJson(resolve(sourceRoot, "package.json"));
  if (manifest.name !== spec.name) {
    throw new Error(
      `External package anchor ${spec.name} resolved to ${manifest.name}`,
    );
  }
  return { spec, sourceRoot, manifest };
}

/** Stages the compatibility gate's actual Zod 3 resolution beside its copied dist. */
async function stageGateDependency(
  source: ExternalPackageSource,
  stageRoot: string,
  catalogVersions: Readonly<Record<string, string>>,
): Promise<GateDependencyIdentity> {
  if (source.spec.name !== GATE_RUNTIME_PACKAGE.name) {
    throw new Error(
      `Compatibility gate dependency must be ${GATE_RUNTIME_PACKAGE.name}`,
    );
  }
  if (catalogVersions.zod !== "^3.25.76") {
    throw new Error(
      `Compatibility gate catalog must resolve zod from ^3.25.76, found ${catalogVersions.zod ?? "missing"}`,
    );
  }
  if (source.manifest.version !== GATE_ZOD_VERSION) {
    throw new Error(
      `Compatibility gate resolved zod ${source.manifest.version}, expected ${GATE_ZOD_VERSION}`,
    );
  }
  const packageRoot = resolve(stageRoot, "zod");
  await mkdir(stageRoot, { recursive: true });
  await cp(source.sourceRoot, packageRoot, {
    recursive: true,
    dereference: true,
  });
  const normalizedManifest = normalizePublishManifestForRelease(
    source.manifest,
    new Map(),
    catalogVersions,
    new Map([[source.manifest.name, source.manifest.version]]),
  );
  await writeFile(
    resolve(packageRoot, "package.json"),
    `${JSON.stringify(normalizedManifest, null, 2)}\n`,
    "utf8",
  );
  const stagedManifest = await readPackageJson(
    resolve(packageRoot, "package.json"),
  );
  if (
    stagedManifest.name !== GATE_RUNTIME_PACKAGE.name ||
    stagedManifest.version !== GATE_ZOD_VERSION
  ) {
    throw new Error(
      "Staged compatibility gate dependency metadata is not Zod 3.25.76",
    );
  }
  return {
    package: { name: stagedManifest.name, version: stagedManifest.version },
    sourceRoot: packageRoot,
  };
}

/** Stages an anchored external runtime dependency for an offline local npm archive. */
async function stageExternalPackage(
  source: ExternalPackageSource,
  stageRoot: string,
  catalogVersions: Readonly<Record<string, string>>,
  packedPackageVersions: ReadonlyMap<string, string>,
): Promise<StagedPackage> {
  const { spec, sourceRoot, manifest: sourceManifest } = source;
  const directory = spec.name.replace(/^@/, "").replace(/[\\/]/g, "-");
  const packageRoot = resolve(stageRoot, directory);
  await mkdir(stageRoot, { recursive: true });
  await cp(sourceRoot, packageRoot, { recursive: true, dereference: true });
  const normalizedManifest = normalizePublishManifestForRelease(
    sourceManifest,
    new Map(),
    catalogVersions,
    packedPackageVersions,
  );
  await writeFile(
    resolve(packageRoot, "package.json"),
    `${JSON.stringify(normalizedManifest, null, 2)}\n`,
    "utf8",
  );
  return { directory, packageRoot, manifest: normalizedManifest };
}

function exportTargets(manifest: PackageJson): string[] {
  const flatten = (entry: PackageExport): string[] => {
    if (typeof entry === "string") return [entry];
    if (Array.isArray(entry)) return entry.flatMap(flatten);
    return Object.values(entry).flatMap(flatten);
  };
  return Object.values(manifest.exports ?? {}).flatMap(flatten);
}

/** Rejects local protocols and verifies exact versions for every staged runtime dependency. */
function assertPackedDependencyVersions(
  manifest: PackageJson,
  localPackageVersions: ReadonlyMap<string, string>,
): string[] {
  const references = nonPublishableDependencyReferences(manifest);
  for (const section of [
    manifest.dependencies,
    manifest.optionalDependencies,
    manifest.peerDependencies,
  ]) {
    for (const [name, version] of Object.entries(section ?? {})) {
      const expectedVersion = localPackageVersions.get(name);
      if (expectedVersion && version !== expectedVersion) {
        throw new Error(
          `${manifest.name} packed dependency ${name} resolved to ${version}, expected ${expectedVersion}`,
        );
      }
    }
  }
  return references;
}

function nonPublishableDependencyReferences(manifest: PackageJson): string[] {
  const sections = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.optionalDependencies,
    manifest.peerDependencies,
  ];
  return sections.flatMap((section) =>
    Object.entries(section ?? {})
      .filter(([, version]) =>
        FORBIDDEN_LOCAL_DEPENDENCY_PROTOCOL.test(version),
      )
      .map(([name, version]) => `${manifest.name}:${name}@${version}`),
  );
}

/** Verifies exact and wildcard export targets against a packed artifact listing.
 * @param manifest Publishable package metadata containing export targets.
 * @param packedPaths Tar entries emitted by the package archive.
 * @throws When any conditional export target is absent from the archive.
 */
export function assertExportTargets(
  manifest: PackageJson,
  packedPaths: ReadonlySet<string>,
): void {
  for (const target of exportTargets(manifest)) {
    const packedTarget = `package/${target.replace(/^\.\//, "")}`;
    const wildcardIndex = packedTarget.indexOf("*");
    const present =
      wildcardIndex < 0
        ? packedPaths.has(packedTarget)
        : [...packedPaths].some((path) => {
            if (!path.startsWith(packedTarget.slice(0, wildcardIndex)))
              return false;
            const suffix = packedTarget.slice(wildcardIndex + 1);
            if (!path.endsWith(suffix)) return false;
            const wildcardValue = path.slice(
              wildcardIndex,
              suffix.length > 0 ? path.length - suffix.length : undefined,
            );
            return wildcardValue.length > 0 && !path.endsWith("/");
          });
    if (!present) {
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

/** Builds Sales knowledge and copies its immutable JSON/evidence assets into dist for packing. */
async function buildSalesKnowledgePackage(packageRoot: string): Promise<void> {
  await buildPackage(packageRoot);
  await executeLocal(
    process.execPath,
    [resolve(packageRoot, "scripts/copy-data.mjs")],
    REPOSITORY_ROOT,
  );
}

/** Builds every shared package whose dist output is consumed by the release proof. */
async function buildWorkspacePackages(
  packageMetadata: ReadonlyArray<{ directory: string; packageRoot: string }>,
): Promise<void> {
  await Promise.all(
    packageMetadata
      .filter(
        ({ directory }) =>
          directory === "knowledge-space-core" || directory === "practice-core",
      )
      .map(({ packageRoot }) => buildPackage(packageRoot)),
  );
  await Promise.all(
    packageMetadata
      .filter(
        ({ directory }) =>
          directory === "knowledge-space-practice" ||
          directory === "srs-engine",
      )
      .map(({ packageRoot }) => buildPackage(packageRoot)),
  );
  const salesPackage = packageMetadata.find(
    ({ directory }) => directory === SALES_KNOWLEDGE_DIRECTORY,
  );
  if (!salesPackage)
    throw new Error("Sales knowledge package metadata is missing");
  await buildSalesKnowledgePackage(salesPackage.packageRoot);
  await buildPackage(
    resolve(REPOSITORY_ROOT, "packages/mastery-runtime-compat"),
  );
}

/** Copies the shared compatibility entrypoints into the private artifact child while the lease is held. */
async function snapshotRuntimeDist(temporaryRoot: string): Promise<string> {
  const snapshotRoot = resolve(temporaryRoot, "runtime-dist-snapshot");
  await mkdir(snapshotRoot, { recursive: true });
  await Promise.all(
    RUNTIME_DIST_FILES.map(async (file) => {
      const sourcePath = resolve(
        REPOSITORY_ROOT,
        "packages/mastery-runtime-compat/dist",
        file,
      );
      const bytes = await readRegularFileBytes(
        sourcePath,
        `Shared runtime ${file}`,
      );
      await writeNewRegularFile(
        resolve(snapshotRoot, file),
        bytes,
        `Private runtime snapshot ${file}`,
      );
    }),
  );
  return snapshotRoot;
}

/** Snapshots a validated regular input into the private release child. */
async function snapshotReleaseInput(
  temporaryRoot: string,
  sourcePath: string,
  targetName: string,
): Promise<string> {
  const target = resolve(temporaryRoot, "input-snapshot", targetName);
  await mkdir(dirname(target), { recursive: true });
  await writeNewRegularFile(
    target,
    await readRegularFileBytes(sourcePath, `Release input ${targetName}`),
    `Release input snapshot ${targetName}`,
  );
  return target;
}

/** Snapshots every checked-in clean-consumer fixture before the fixture is used. */
async function snapshotConsumerFixtures(
  temporaryRoot: string,
): Promise<ReleaseInputSnapshot["consumerFixtureInputs"]> {
  return Promise.all(
    CONSUMER_FIXTURE_FILES.map(async (file) => ({
      sourcePath: resolve(FIXTURE_ROOT, file),
      snapshotPath: await snapshotReleaseInput(
        temporaryRoot,
        resolve(FIXTURE_ROOT, file),
        `consumer-fixture/${file}`,
      ),
    })),
  );
}

/** Calculates a SHA-256 digest from immutable bytes. */
function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Calculates the npm pack checksum used to bind an archive before path exposure. */
function sha1(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}

/** Rejects archive bytes that differ from the bytes bound when npm pack completed. */
async function assertPackedArchivesUnchanged(
  artifacts: ReadonlyArray<PackedArtifact>,
): Promise<void> {
  await Promise.all(
    artifacts.map(async (artifact) => {
      for (const archivePath of [
        artifact.archivePath,
        artifact.installArchivePath,
      ]) {
        try {
          const currentBytes = await readRegularFileBytes(
            archivePath,
            `Release archive ${artifact.name}`,
          );
          if (
            !currentBytes.equals(artifact.archiveBytes) ||
            sha1(currentBytes) !== artifact.archiveSha1 ||
            sha256(currentBytes) !== artifact.archiveSha256
          ) {
            throw new Error("archive bytes differ");
          }
        } catch {
          throw new Error(
            `RELEASE_ARCHIVE_MUTATION_CONFLICT release archive ${artifact.name} changed before consumption`,
          );
        }
      }
    }),
  );
}

/** Calculates a deterministic digest over named immutable release inputs. */
function digestReleaseInputs(
  inputs: ReadonlyArray<{ name: string; bytes: Uint8Array }>,
): string {
  const hash = createHash("sha256");
  for (const input of [...inputs].sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    hash.update(input.name);
    hash.update("\0");
    hash.update(String(input.bytes.byteLength));
    hash.update("\0");
    hash.update(input.bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}

/** Captures the manifest and descriptors that define one release proof. */
async function snapshotReleaseInputs(
  temporaryRoot: string,
  consumerDescriptorPaths: ReadonlyArray<string>,
  runtimeDistSnapshotRoot: string,
): Promise<ReleaseInputSnapshot> {
  const consumerFixtureInputs = await snapshotConsumerFixtures(temporaryRoot);
  const manifestSourcePath = resolve(
    REPOSITORY_ROOT,
    "packages/mastery-runtime-compat/runtime-manifest.json",
  );
  const manifestPath = await snapshotReleaseInput(
    temporaryRoot,
    manifestSourcePath,
    "runtime-manifest.json",
  );
  const descriptorPaths = await Promise.all(
    consumerDescriptorPaths.map((sourcePath, index) =>
      snapshotReleaseInput(
        temporaryRoot,
        sourcePath,
        `descriptors/${index}-${basename(sourcePath)}`,
      ),
    ),
  );
  const sourcePaths = [
    manifestPath,
    ...descriptorPaths,
    ...RUNTIME_DIST_FILES.map((file) => resolve(runtimeDistSnapshotRoot, file)),
    ...consumerFixtureInputs.map(({ snapshotPath }) => snapshotPath),
  ];
  const inputs = await Promise.all(
    sourcePaths.map(async (path) => ({
      name: relative(temporaryRoot, path),
      bytes: await readRegularFileBytes(
        path,
        "Immutable release input snapshot",
      ),
    })),
  );
  const { stdout } = await executeLocal(
    "git",
    ["rev-parse", "HEAD"],
    REPOSITORY_ROOT,
  );
  const auditedHead = stdout.trim();
  if (!/^[0-9a-f]{40}$/.test(auditedHead)) {
    throw new Error("Release proof could not record an audited Git HEAD");
  }
  return {
    manifestPath,
    descriptorPaths,
    runtimeDistPath: runtimeDistSnapshotRoot,
    consumerFixtureInputs,
    sourceDigestSha256: digestReleaseInputs(inputs),
    auditedHead,
  };
}

/** Rejects clean-consumer fixture changes after the immutable snapshot was created. */
async function assertConsumerFixturesUnchanged(
  consumerFixtureInputs: ReadonlyArray<{
    sourcePath: string;
    snapshotPath: string;
  }>,
): Promise<void> {
  await Promise.all(
    consumerFixtureInputs.map(async ({ sourcePath, snapshotPath }) => {
      try {
        const [sourceBytes, snapshotBytes] = await Promise.all([
          readRegularFileBytes(sourcePath, "Clean-consumer fixture source"),
          readRegularFileBytes(snapshotPath, "Clean-consumer fixture snapshot"),
        ]);
        if (!sourceBytes.equals(snapshotBytes)) {
          throw new Error("fixture bytes differ");
        }
      } catch {
        throw new Error(
          `RELEASE_INPUT_MUTATION_CONFLICT clean-consumer fixture ${basename(sourcePath)} changed after snapshot`,
        );
      }
    }),
  );
}

/** Applies a bounded test-only delay used to force cross-process lease overlap proofs. */
async function waitForTestHook(environmentName: string): Promise<void> {
  const rawDelay = process.env[environmentName];
  if (rawDelay == null) return;
  const delay = Number(rawDelay);
  if (!Number.isFinite(delay) || delay <= 0) return;
  await new Promise((resolveDelay) =>
    setTimeout(resolveDelay, Math.min(delay, 120_000)),
  );
}

/** Executes one isolated npm pack command and retries only missing JSON output. */
async function executeNpmPack(
  args: string[],
  packageRoot: string,
  packageStateRoot: string,
  label: string,
): Promise<{ stdout: string; stderr: string }> {
  return withNpmOperationSlot(async () => {
    for (let attempt = 0; ; attempt += 1) {
      const result = await executeLocal(
        "npm",
        args,
        packageRoot,
        packageStateRoot,
      );
      if (result.stdout.trim().length > 0) return result;
      const retryDelay = NPM_EMPTY_OUTPUT_RETRY_DELAYS_MS[attempt];
      if (retryDelay == null) {
        const diagnostic = result.stderr.trim();
        throw new Error(
          `${label} npm pack produced empty stdout${
            diagnostic.length > 0
              ? `; stderr: ${diagnostic.slice(0, 1000)}`
              : ""
          }`,
        );
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, retryDelay));
    }
  });
}

async function dryRunPack(
  packageRoot: string,
  manifest: PackageJson,
  packageStateRoot: string,
): Promise<void> {
  const isolatedStateRoot = resolve(
    packageStateRoot,
    "npm-dry-run",
    basename(packageRoot),
  );
  await mkdir(isolatedStateRoot, { recursive: true });
  const { stdout } = await executeNpmPack(
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    packageRoot,
    isolatedStateRoot,
    manifest.name,
  );
  const output = stdout.trim();
  if (output.length === 0)
    throw new Error(`${manifest.name} npm dry-run produced empty stdout`);
  let entries: NpmPackEntry[];
  try {
    entries = JSON.parse(output) as NpmPackEntry[];
  } catch (error) {
    throw new Error(
      `${manifest.name} npm dry-run produced invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const entry = entries[0];
  if (!entry || !entry.filename.endsWith(".tgz")) {
    throw new Error(`${manifest.name} did not produce an npm dry-run manifest`);
  }
  const dryRunPaths = new Set(
    entry.files.map((file) => `package/${file.path}`),
  );
  assertExportTargets(manifest, dryRunPaths);
}

/** Parses npm JSON output while reporting empty or malformed pack responses precisely. */
function parseNpmPackEntries(
  stdout: string,
  stderr: string,
  label: string,
): NpmPackEntry[] {
  const output = stdout.trim();
  if (output.length === 0) {
    const diagnostic = stderr.trim();
    throw new Error(
      `${label} npm pack produced empty stdout${
        diagnostic.length > 0 ? `; stderr: ${diagnostic.slice(0, 1000)}` : ""
      }`,
    );
  }
  try {
    const entries = JSON.parse(output) as unknown;
    if (!Array.isArray(entries)) throw new Error("expected a JSON array");
    return entries as NpmPackEntry[];
  } catch (error) {
    throw new Error(
      `${label} npm pack produced invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function createPackedArtifact(
  packageRoot: string,
  destination: string,
  packageStateRoot: string,
): Promise<{ archivePath: string; archiveSha1: string }> {
  const isolatedStateRoot = resolve(
    packageStateRoot,
    "npm-pack",
    basename(packageRoot),
  );
  await mkdir(isolatedStateRoot, { recursive: true });
  const archiveDestination = resolve(
    destination,
    "npm-artifacts",
    basename(packageRoot),
  );
  await mkdir(archiveDestination, { recursive: true });
  const { stdout, stderr } = await executeNpmPack(
    [
      "pack",
      "--json",
      "--ignore-scripts",
      "--pack-destination",
      archiveDestination,
    ],
    packageRoot,
    isolatedStateRoot,
    packageRoot,
  );
  const entry = parseNpmPackEntries(stdout, stderr, packageRoot)[0];
  if (
    !entry ||
    !entry.filename.endsWith(".tgz") ||
    !entry.shasum ||
    !/^[0-9a-f]{40}$/.test(entry.shasum)
  ) {
    throw new Error(`npm pack produced no artifact for ${packageRoot}`);
  }
  return {
    archivePath: resolve(archiveDestination, basename(entry.filename)),
    archiveSha1: entry.shasum,
  };
}

async function inspectPackedArtifact(
  archivePath: string,
): Promise<{ manifest: PackageJson; paths: Set<string> }> {
  const [{ stdout: manifestJson }, { stdout: archiveListing }] =
    await Promise.all([
      executeLocal(
        "tar",
        ["-xOf", archivePath, "package/package.json"],
        REPOSITORY_ROOT,
      ),
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
  archives: ReadonlyMap<string, PackedArtifact>,
  gateDependency: GateDependencyIdentity,
  runtimeDistSnapshotRoot: string,
  runtimeManifestSnapshotPath: string,
  consumerFixtureSnapshotPaths: ReadonlyArray<string>,
  consumerDescriptorSnapshotPaths: ReadonlyArray<string>,
): Promise<{
  checkedConsumers: string[];
  verifiedSalesKnowledge: ReleaseSalesKnowledgeIdentity;
  resolvedVersions: ResolvedRuntimeVersions;
}> {
  const consumerRoot = resolve(temporaryRoot, "consumer");
  await mkdir(consumerRoot, { recursive: true });
  await Promise.all(
    consumerFixtureSnapshotPaths.map(async (snapshotPath) => {
      const file = basename(snapshotPath);
      const bytes = await readRegularFileBytes(
        snapshotPath,
        `Clean-consumer fixture snapshot ${file}`,
      );
      await writeNewRegularFile(
        resolve(consumerRoot, file),
        bytes,
        `Clean-consumer fixture ${file}`,
      );
    }),
  );
  const manifestPath = resolve(consumerRoot, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const localArtifacts = Object.fromEntries(
    [...archives.entries()].map(([name, archive]) => [
      name,
      `file:${archive.installArchivePath}`,
    ]),
  );
  manifest.dependencies = localArtifacts;
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const runtimeDistRoot = resolve(consumerRoot, "dist");
  await mkdir(runtimeDistRoot, { recursive: true });
  await Promise.all(
    RUNTIME_DIST_FILES.map((file) =>
      cp(
        resolve(runtimeDistSnapshotRoot, file),
        resolve(runtimeDistRoot, file),
      ),
    ),
  );
  await cp(
    gateDependency.sourceRoot,
    resolve(runtimeDistRoot, "node_modules/zod"),
    { recursive: true, dereference: true },
  );
  await cp(
    runtimeManifestSnapshotPath,
    resolve(consumerRoot, "runtime-manifest.json"),
  );

  const descriptorRoot = resolve(consumerRoot, "descriptors");
  await mkdir(descriptorRoot, { recursive: true });
  const copiedDescriptors = await Promise.all(
    consumerDescriptorSnapshotPaths.map(async (descriptorPath, index) => {
      const descriptorBytes = await readRegularFileBytes(
        descriptorPath,
        "Consumer descriptor source",
      );
      const descriptor = JSON.parse(descriptorBytes.toString("utf8")) as {
        name?: unknown;
        version?: unknown;
        graph?: { release?: unknown };
      };
      if (
        typeof descriptor.name !== "string" ||
        descriptor.name.length === 0 ||
        typeof descriptor.version !== "string" ||
        typeof descriptor.graph?.release !== "string"
      ) {
        throw new Error(
          `Consumer descriptor ${descriptorPath} must declare a name`,
        );
      }
      const target = resolve(
        descriptorRoot,
        `${index}-${basename(descriptorPath)}`,
      );
      await writeNewRegularFile(
        target,
        descriptorBytes,
        "Consumer descriptor target",
      );
      return {
        descriptor: {
          name: descriptor.name,
          version: descriptor.version,
          graphRelease: descriptor.graph.release,
        },
        target,
      };
    }),
  );

  await assertPackedArchivesUnchanged([...archives.values()]);
  await executeLocal(
    "npm",
    [
      "install",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
    ],
    consumerRoot,
    temporaryRoot,
  );
  const checkedConsumers: string[] = [];
  let verifiedSalesKnowledge: ReleaseSalesKnowledgeIdentity | undefined;
  let resolvedVersions: ResolvedRuntimeVersions | undefined;
  for (const { descriptor, target } of copiedDescriptors) {
    const check = await executeLocal(
      process.execPath,
      [
        "check-consumer.mjs",
        resolve(consumerRoot, "dist/check-consumer.js"),
        target,
      ],
      consumerRoot,
    );
    const attestation = parseSalesRuntimeAttestation(check.stdout);
    if (
      attestation.consumer.name !== descriptor.name ||
      attestation.consumer.version !== descriptor.version ||
      attestation.salesKnowledge.releaseId !== descriptor.graphRelease
    ) {
      throw new Error(
        "Packed consumer attestation does not match its copied descriptor",
      );
    }
    checkedConsumers.push(attestation.consumer.name);
    resolvedVersions = attestation.resolvedVersions;
    if (attestation.consumer.name === "sales-advantage") {
      verifiedSalesKnowledge = {
        package: attestation.salesKnowledge.package,
        verifierExport: attestation.salesKnowledge.verifierExport,
        evidenceManifestExport:
          attestation.salesKnowledge.evidenceManifestExport,
        evidence: attestation.salesKnowledge.evidence,
      };
    }
  }
  if (verifiedSalesKnowledge == null) {
    throw new Error(
      "Packed consumer proof did not verify a Sales knowledge identity",
    );
  }
  if (resolvedVersions == null) {
    throw new Error(
      "Packed consumer proof did not attest resolved runtime versions",
    );
  }
  return { checkedConsumers, verifiedSalesKnowledge, resolvedVersions };
}

/**
 * Builds, packs, and offline-installs the shared engines and Sales knowledge package in a clean consumer.
 * @param options Caller-owned cache root and descriptors to verify from the isolated consumer.
 * @returns Deterministic release evidence with no registry publication or network use.
 * @throws When the root, build, pack metadata, exports, workspace rewriting, or clean consumption fails.
 */
export async function runReleaseArtifactCheck(
  options: ReleaseArtifactCheckOptions,
): Promise<ReleaseArtifactCheckResult> {
  if (options.consumerDescriptorPaths.length === 0) {
    throw new Error(
      "consumerDescriptorPaths must contain at least one descriptor",
    );
  }
  const callerRoot = await validateTemporaryRoot(options.temporaryRoot);
  await ensureCallerRootNamespace(callerRoot);
  const trustedWorkRoot = await ensureTrustedWorkRoot(callerRoot);
  const temporaryRoot = await createArtifactChild(trustedWorkRoot);
  try {
    const validatedProductionLease =
      await validateProductionWorkspaceLeasePath(trustedWorkRoot);
    const workspaceLeaseRuntime: WorkspaceLeaseRuntimeContext = {
      ...validatedProductionLease,
      now: Date.now,
      maxWaitMs: WORKSPACE_LEASE_MAX_WAIT_MS,
    };
    const workspaceLease = await acquireWorkspaceLease(workspaceLeaseRuntime);
    let packageMetadata!: Array<{
      directory: string;
      packageRoot: string;
      manifest: PackageJson;
    }>;
    let catalogVersions!: Record<string, string>;
    let localPackageVersions!: Map<string, string>;
    let stagedMetadata: StagedPackage[];
    let allPackedVersions: Map<string, string>;
    let gateDependency: GateDependencyIdentity;
    let runtimeDistSnapshotRoot: string;
    let releaseInputs: ReleaseInputSnapshot;
    try {
      ({
        stagedMetadata,
        allPackedVersions,
        gateDependency,
        runtimeDistSnapshotRoot,
        releaseInputs,
      } = await withWorkspaceBuildLock(async () => {
        packageMetadata = await Promise.all(
          PACKAGED_DIRECTORIES.map(async (directory) => {
            const packageRoot = resolve(REPOSITORY_ROOT, "packages", directory);
            const manifest = await readPackageJson(
              resolve(packageRoot, "package.json"),
            );
            return { directory, packageRoot, manifest };
          }),
        );
        catalogVersions = await readWorkspaceCatalogVersions();
        localPackageVersions = new Map(
          packageMetadata.map(({ manifest }) => [
            manifest.name,
            manifest.version,
          ]),
        );
        const externalSources = await Promise.all(
          EXTERNAL_RUNTIME_PACKAGES.map((spec) =>
            readExternalPackageSource(spec),
          ),
        );
        const gateSource =
          await readExternalPackageSource(GATE_RUNTIME_PACKAGE);
        const externalPackageVersions = new Map(
          externalSources.map(({ manifest }) => [
            manifest.name,
            manifest.version,
          ]),
        );
        allPackedVersions = new Map([
          ...localPackageVersions,
          ...externalPackageVersions,
        ]);
        await buildWorkspacePackages(packageMetadata);
        const stagedExternalMetadata = await Promise.all(
          externalSources.map((source) =>
            stageExternalPackage(
              source,
              resolve(temporaryRoot, "external-staging"),
              catalogVersions,
              allPackedVersions,
            ),
          ),
        );
        gateDependency = await stageGateDependency(
          gateSource,
          resolve(temporaryRoot, "gate-staging"),
          catalogVersions,
        );
        const stagedPackageMetadata = await Promise.all(
          packageMetadata.map(({ directory, packageRoot, manifest }) =>
            stagePublishPackage(
              packageRoot,
              directory,
              manifest,
              resolve(temporaryRoot, "publish-staging"),
              localPackageVersions,
              catalogVersions,
              allPackedVersions,
            ),
          ),
        );
        runtimeDistSnapshotRoot = await snapshotRuntimeDist(temporaryRoot);
        releaseInputs = await snapshotReleaseInputs(
          temporaryRoot,
          options.consumerDescriptorPaths,
          runtimeDistSnapshotRoot,
        );
        await waitForTestHook(TEST_HOLD_LEASE_ENV);
        return {
          stagedMetadata: [...stagedPackageMetadata, ...stagedExternalMetadata],
          allPackedVersions,
          gateDependency,
          runtimeDistSnapshotRoot,
          releaseInputs,
        };
      }));
    } finally {
      await releaseWorkspaceLease(workspaceLease);
    }
    await Promise.all(
      stagedMetadata.map(({ packageRoot, manifest }) =>
        dryRunPack(packageRoot, manifest, temporaryRoot),
      ),
    );

    const verifiedArchiveRoot = resolve(temporaryRoot, "verified-archives");
    await mkdir(verifiedArchiveRoot, { recursive: true });
    const packedArtifacts = await Promise.all(
      stagedMetadata.map(async ({ packageRoot, manifest }) => {
        const packedArchive = await createPackedArtifact(
          packageRoot,
          temporaryRoot,
          temporaryRoot,
        );
        const { archivePath, archiveSha1 } = packedArchive;
        const packed = await inspectPackedArtifact(archivePath);
        if (
          packed.manifest.name !== manifest.name ||
          packed.manifest.version !== manifest.version
        ) {
          throw new Error(
            `${manifest.name} packed metadata changed name or version`,
          );
        }
        if (localPackageVersions.has(manifest.name)) {
          assertExportTargets(packed.manifest, packed.paths);
        }
        const archiveBytes = await readRegularFileBytes(
          archivePath,
          `Release archive ${manifest.name}`,
        );
        if (sha1(archiveBytes) !== archiveSha1) {
          throw new Error(
            `RELEASE_ARCHIVE_MUTATION_CONFLICT release archive ${manifest.name} changed after npm pack`,
          );
        }
        const installArchivePath = resolve(
          verifiedArchiveRoot,
          `${manifest.name.replace(/^@/, "").replace(/[\\/]/g, "-")}.tgz`,
        );
        await writeNewRegularFile(
          installArchivePath,
          archiveBytes,
          `Verified release archive ${manifest.name}`,
        );
        return {
          name: manifest.name,
          archivePath,
          installArchivePath,
          archiveBytes,
          archiveSha1,
          archiveSha256: sha256(archiveBytes),
          workspaceDependencies: assertPackedDependencyVersions(
            packed.manifest,
            allPackedVersions,
          ),
        };
      }),
    );
    const archives = new Map(
      packedArtifacts.map((artifact) => [artifact.name, artifact] as const),
    );
    const workspaceDependencies = packedArtifacts.flatMap(
      ({ workspaceDependencies: references }) => references,
    );
    if (workspaceDependencies.length > 0) {
      throw new Error(
        `Packed artifacts retain non-publishable local dependencies: ${workspaceDependencies.join(", ")}`,
      );
    }

    await waitForTestHook(TEST_DELAY_BEFORE_CONSUMER_ENV);
    await assertConsumerFixturesUnchanged(releaseInputs.consumerFixtureInputs);
    const cleanConsumer = await runCleanConsumer(
      temporaryRoot,
      archives,
      gateDependency,
      runtimeDistSnapshotRoot,
      releaseInputs.manifestPath,
      releaseInputs.consumerFixtureInputs.map(
        ({ snapshotPath }) => snapshotPath,
      ),
      releaseInputs.descriptorPaths,
    );
    await assertConsumerFixturesUnchanged(releaseInputs.consumerFixtureInputs);
    const releasePackageNames = new Set(
      packageMetadata.map(({ manifest }) => manifest.name),
    );
    const archiveDigestsSha256 = Object.fromEntries(
      packedArtifacts
        .filter(({ name }) => releasePackageNames.has(name))
        .map(({ name, archiveSha256 }) => [name, archiveSha256] as const),
    );
    return {
      packages: packageMetadata.map(({ manifest }) => manifest.name),
      dryRun: true,
      exportsVerified: true,
      workspaceDependencies,
      cleanConsumer: true,
      auditedHead: releaseInputs.auditedHead,
      sourceDigestSha256: releaseInputs.sourceDigestSha256,
      archiveDigestsSha256,
      ...cleanConsumer,
    };
  } finally {
    await removeArtifactChild(trustedWorkRoot, temporaryRoot);
  }
}
