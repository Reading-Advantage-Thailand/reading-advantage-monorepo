import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execute = promisify(execFile);

const ROOT = resolve(import.meta.dirname, "../../../..");
const ENGINE_PACKAGES = [
  "knowledge-space-core",
  "knowledge-space-practice",
  "practice-core",
  "srs-engine",
] as const;
const PACKAGES = [...ENGINE_PACKAGES, "sales-knowledge"] as const;
const SALES_DESCRIPTOR_PATH = resolve(
  ROOT,
  "packages/mastery-runtime-compat/fixtures/consumer/sales-advantage.json",
);
const ARTIFACT_ROOT = resolve(
  ROOT,
  ".cache/mastery-runtime-compat/release-artifact-test",
);
const RED_LEASE_PARENT = resolve(
  ROOT,
  ".cache/mastery-runtime-compat/release-artifact-red",
);
const WORKSPACE_LEASE_ROOT = resolve(
  ROOT,
  ".cache/mastery-runtime-compat/trusted-work/.workspace-build.lease",
);
const WORKSPACE_LEASE_STALE_AFTER_MS = 15 * 60 * 1_000;
const RESOLVED_RUNTIME_VERSIONS = {
  gateZod: "3.25.76",
  engineZod: "4.4.3",
  tsFsrs: "5.4.1",
} as const;

type ReleaseModule = {
  runReleaseArtifactCheck: (options: {
    temporaryRoot: string;
    consumerDescriptorPaths: string[];
  }) => Promise<{
    packages: string[];
    dryRun: true;
    exportsVerified: true;
    workspaceDependencies: string[];
    cleanConsumer: true;
    checkedConsumers: string[];
    resolvedVersions: typeof RESOLVED_RUNTIME_VERSIONS;
  }>;
};

type WorkspaceLease = {
  path: string;
  token: string;
};

type WorkspaceLeaseRuntimeOptions = {
  leasePath: string;
  now: () => number;
  maxWaitMs: number;
};

type WorkspaceLeaseRuntime = {
  acquire: () => Promise<WorkspaceLease>;
  release: (lease: WorkspaceLease) => Promise<void>;
};

type WorkspaceLeaseRuntimeFactory = (
  options: WorkspaceLeaseRuntimeOptions,
) => Promise<WorkspaceLeaseRuntime>;

async function loadReleaseGate(): Promise<ReleaseModule | null> {
  try {
    const url = new URL("../release-artifact.js", import.meta.url).href;
    return (await import(url)) as ReleaseModule;
  } catch {
    return null;
  }
}

type TestLeaseOwnership = {
  leaseRoot: string;
  ownerPath: string;
  markerPath: string;
  marker: string;
};

/** Acquires the shared test lease directory without deleting a foreign owner. */
async function acquireTestLeaseDirectory(
  leaseRoot: string,
): Promise<TestLeaseOwnership> {
  const token = `test-${process.pid}-${randomUUID()}`;
  const markerPath = resolve(leaseRoot, `.test-owner-${token}`);
  const marker = `${token}\n`;
  const ownerPath = resolve(leaseRoot, "owner.json");
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      await mkdir(leaseRoot);
      await writeFile(markerPath, marker, { flag: "wx" });
      return { leaseRoot, ownerPath, markerPath, marker };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (Date.now() >= deadline) {
        throw new Error("Timed out waiting to acquire the shared test lease");
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    }
  }
}

/** Removes a test lease only when its marker and owner bytes still prove this test owns it. */
async function removeTestLeaseIfOwned(
  ownership: TestLeaseOwnership,
  expectedOwner: string,
): Promise<void> {
  try {
    const [marker, owner] = await Promise.all([
      readFile(ownership.markerPath, "utf8"),
      readFile(ownership.ownerPath, "utf8"),
    ]);
    if (marker !== ownership.marker || owner !== expectedOwner) return;
    const leaseEntry = await lstat(ownership.leaseRoot);
    if (leaseEntry.isSymbolicLink() || !leaseEntry.isDirectory()) return;
    await rm(ownership.leaseRoot, { recursive: true, force: false });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

/** Loads the private lease test seam and reports its required Red dependency. */
async function loadWorkspaceLeaseRuntimeFactory(): Promise<WorkspaceLeaseRuntimeFactory | null> {
  const url = new URL("../release-artifact.js", import.meta.url).href;
  const module = (await import(url)) as {
    createWorkspaceLeaseRuntimeForTest?: unknown;
  };
  expect(
    typeof module.createWorkspaceLeaseRuntimeForTest,
    "missing internal WorkspaceLeaseRuntime test seam",
  ).toBe("function");
  if (typeof module.createWorkspaceLeaseRuntimeForTest !== "function")
    return null;
  return module.createWorkspaceLeaseRuntimeForTest as WorkspaceLeaseRuntimeFactory;
}

type TestClock = {
  now: () => number;
  advance: (milliseconds: number) => void;
};

/** Creates a test clock that advances with wall time and supports deterministic offsets. */
function createTestClock(): TestClock {
  const startedAt = Date.now();
  let offset = 0;
  return {
    now: () => startedAt + (Date.now() - startedAt) + offset,
    advance: (milliseconds) => {
      offset += milliseconds;
    },
  };
}

/** Creates one isolated lease root and removes only that root after the contract runs. */
async function withIsolatedLeaseRoot<T>(
  operation: (root: string, leasePath: string) => Promise<T>,
): Promise<T> {
  await mkdir(RED_LEASE_PARENT, { recursive: true });
  const root = await mkdtemp(join(RED_LEASE_PARENT, "lease-"));
  const leasePath = resolve(root, ".workspace-build.lease");
  try {
    return await operation(root, leasePath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Waits for a child-created regular file without changing the lease path. */
async function waitForPath(path: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await lstat(path);
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
    }
  }
  throw new Error("Workspace lease child did not become ready");
}

/** Finds a positive process identifier that is not live for the dead-owner contract. */
function findDeadPid(): number {
  for (const candidate of [
    2_147_483_647,
    2_147_483_646,
    process.pid + 1_000_000,
  ]) {
    try {
      process.kill(candidate, 0);
    } catch (error) {
      if (error?.code === "ESRCH") return candidate;
    }
  }
  throw new Error("Workspace lease Red contract could not find a dead PID");
}

describe("WorkspaceLeaseRuntime Red contract", () => {
  it("keeps the private lease seam out of the release consumer surface", async () => {
    const source = await readFile(
      resolve(ROOT, "packages/mastery-runtime-compat/src/index.ts"),
      "utf8",
    );
    expect(source).not.toContain("createWorkspaceLeaseRuntimeForTest");
  });

  it("keeps production lease defaults unchanged", async () => {
    const source = await readFile(
      resolve(ROOT, "packages/mastery-runtime-compat/src/release-artifact.ts"),
      "utf8",
    );
    expect(source).toContain(
      "const WORKSPACE_LEASE_STALE_AFTER_MS = 15 * 60 * 1_000;",
    );
    expect(source).toContain(
      "const WORKSPACE_LEASE_MAX_WAIT_MS = 5 * 60 * 1_000;",
    );
  });

  it("reclaims an isolated stale malformed lease", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    await withIsolatedLeaseRoot(async (_root, leasePath) => {
      const clock = createTestClock();
      await mkdir(leasePath, { recursive: true });
      const malformedOwner = `{"pid":${process.pid},"token":"red-malformed-secret`;
      await writeFile(resolve(leasePath, "owner.json"), malformedOwner, {
        flag: "wx",
      });
      clock.advance(WORKSPACE_LEASE_STALE_AFTER_MS + 1);
      const runtime = await createRuntime({
        leasePath,
        now: clock.now,
        maxWaitMs: 1_000,
      });
      const lease = await runtime.acquire();
      const ownerBytes = await readFile(
        resolve(leasePath, "owner.json"),
        "utf8",
      );
      expect(ownerBytes).not.toBe(malformedOwner);
      expect(JSON.parse(ownerBytes).token).toBe(lease.token);
      await runtime.release(lease);
      await expect(lstat(leasePath)).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("reclaims an isolated stale dead-owner lease", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    await withIsolatedLeaseRoot(async (_root, leasePath) => {
      const clock = createTestClock();
      await mkdir(leasePath, { recursive: true });
      await writeFile(
        resolve(leasePath, "owner.json"),
        `${JSON.stringify({
          pid: findDeadPid(),
          token: "red-dead-owner-secret",
          acquiredAt: clock.now() - WORKSPACE_LEASE_STALE_AFTER_MS - 1,
        })}\n`,
        { flag: "wx" },
      );
      const runtime = await createRuntime({
        leasePath,
        now: clock.now,
        maxWaitMs: 1_000,
      });
      const lease = await runtime.acquire();
      expect(lease.path).toBe(leasePath);
      expect(lease.token).not.toBe("red-dead-owner-secret");
      await runtime.release(lease);
    });
  });

  it("keeps an isolated stale live-owner lease byte-identical until release", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    await withIsolatedLeaseRoot(async (root, leasePath) => {
      const clock = createTestClock();
      const readyPath = resolve(root, "live-owner-ready");
      const releasePath = resolve(root, "release-live-owner");
      const releasedPath = resolve(root, "live-owner-released");
      const liveOwnerScript = `
        import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
        import { resolve } from "node:path";
        const leasePath = process.argv[1];
        const readyPath = process.argv[2];
        const releasePath = process.argv[3];
        const releasedPath = process.argv[4];
        const acquiredAt = Number(process.argv[5]);
        await mkdir(leasePath);
        const ownerPath = resolve(leasePath, "owner.json");
        const ownerBytes = JSON.stringify({
          pid: process.pid,
          token: "red-live-owner-" + process.pid,
          acquiredAt,
        }) + "\\n";
        await writeFile(ownerPath, ownerBytes, { flag: "wx" });
        await writeFile(readyPath, "ready\\n", { flag: "wx" });
        try {
          for (;;) {
            try {
              await lstat(releasePath);
              break;
            } catch (error) {
              if (error?.code !== "ENOENT") throw error;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
            }
          }
        } finally {
          if ((await readFile(ownerPath, "utf8")) === ownerBytes) {
            await rm(leasePath, { recursive: true, force: false });
          }
          await writeFile(releasedPath, "released\\n", { flag: "wx" });
        }
      `;
      const liveOwnerProcess = execute(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          liveOwnerScript,
          leasePath,
          readyPath,
          releasePath,
          releasedPath,
          String(clock.now() - WORKSPACE_LEASE_STALE_AFTER_MS - 1),
        ],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
      );
      try {
        await waitForPath(readyPath);
        const ownerBytes = await readFile(
          resolve(leasePath, "owner.json"),
          "utf8",
        );
        const runtime = await createRuntime({
          leasePath,
          now: clock.now,
          maxWaitMs: 1_000,
        });
        let acquired = false;
        const acquirePromise = runtime.acquire().then((lease) => {
          acquired = true;
          return lease;
        });
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
        expect(acquired).toBe(false);
        expect(await readFile(resolve(leasePath, "owner.json"), "utf8")).toBe(
          ownerBytes,
        );
        await writeFile(releasePath, "release\\n", { flag: "wx" });
        const lease = await acquirePromise;
        await liveOwnerProcess;
        await expect(lstat(releasedPath)).resolves.toBeTruthy();
        await runtime.release(lease);
      } finally {
        await writeFile(releasePath, "release\\n", { flag: "wx" }).catch(
          (error) => {
            if (error?.code !== "EEXIST" && error?.code !== "ENOENT")
              throw error;
          },
        );
        await liveOwnerProcess.catch(() => undefined);
      }
    });
  });

  it("bounds a live-owner timeout without exposing owner bytes", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    await withIsolatedLeaseRoot(async (_root, leasePath) => {
      const clock = createTestClock();
      const secret = "red-timeout-owner-secret";
      await mkdir(leasePath, { recursive: true });
      await writeFile(
        resolve(leasePath, "owner.json"),
        `${JSON.stringify({
          pid: process.pid,
          token: secret,
          acquiredAt: clock.now(),
        })}\n`,
        { flag: "wx" },
      );
      const runtime = await createRuntime({
        leasePath,
        now: clock.now,
        maxWaitMs: 100,
      });
      const startedAt = Date.now();
      let errorText = "";
      try {
        await runtime.acquire();
        throw new Error(
          "Workspace lease Red contract unexpectedly acquired a live lease",
        );
      } catch (error) {
        errorText = error instanceof Error ? error.message : String(error);
      }
      expect(Date.now() - startedAt).toBeLessThan(2_000);
      expect(errorText).toMatch(/timed out.*workspace lease/i);
      expect(errorText).not.toContain(secret);
      expect(errorText).not.toContain(leasePath);
    });
  });

  it("refuses a wrong token and leaves the isolated owner unchanged", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    await withIsolatedLeaseRoot(async (_root, leasePath) => {
      const clock = createTestClock();
      const runtime = await createRuntime({
        leasePath,
        now: clock.now,
        maxWaitMs: 1_000,
      });
      const lease = await runtime.acquire();
      const ownerBefore = await readFile(
        resolve(leasePath, "owner.json"),
        "utf8",
      );
      await runtime.release({ path: lease.path, token: "wrong-token" });
      expect(await readFile(resolve(leasePath, "owner.json"), "utf8")).toBe(
        ownerBefore,
      );
      await expect(lstat(leasePath)).resolves.toBeTruthy();
      await runtime.release(lease);
      await expect(lstat(leasePath)).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("keeps isolated lease acquisition off the canonical shared lease", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    await withIsolatedLeaseRoot(async (_root, leasePath) => {
      expect(leasePath).not.toBe(WORKSPACE_LEASE_ROOT);
      const runtime = await createRuntime({
        leasePath,
        now: Date.now,
        maxWaitMs: 1_000,
      });
      const lease = await runtime.acquire();
      expect(lease.path).toBe(leasePath);
      await runtime.release(lease);
    });
  });

  it("keeps the existing cross-process packed proof on the default lease path", async () => {
    const source = await readFile(
      resolve(
        ROOT,
        "packages/mastery-runtime-compat/src/__tests__/release-artifact.test.ts",
      ),
      "utf8",
    );
    const start = source.indexOf(
      '\n  it("forces lease overlap while one process consumes a private dist snapshot"',
    );
    const end = source.indexOf(
      '\n  it("reclaims a stale truncated lease owner without touching a live lease"',
    );
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const defaultProof = source.slice(start, end);
    expect(defaultProof).toContain("runReleaseArtifactCheck({");
    expect(defaultProof).toContain("temporaryRoot: process.argv[1]");
    expect(defaultProof).not.toContain("createWorkspaceLeaseRuntimeForTest");
  });

  it("rejects traversal and outside-cache lease overrides", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    const options = { now: Date.now, maxWaitMs: 1_000 };
    await expect(
      createRuntime({
        ...options,
        leasePath: resolve(ARTIFACT_ROOT, "..", "..", "..", "red-traversal"),
      }),
    ).rejects.toThrow(/cache|trusted|lease path/i);
    await expect(
      createRuntime({
        ...options,
        leasePath: resolve(
          ROOT,
          "packages/mastery-runtime-compat/red-outside-cache",
        ),
      }),
    ).rejects.toThrow(/cache|trusted|lease path/i);
  });

  it("rejects symlinked lease paths", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    await withIsolatedLeaseRoot(async (root) => {
      const linkPath = resolve(root, "lease-link");
      await symlink(resolve(ROOT, ".cache"), linkPath);
      await expect(
        createRuntime({
          leasePath: resolve(linkPath, "workspace-build.lease"),
          now: Date.now,
          maxWaitMs: 1_000,
        }),
      ).rejects.toThrow(/symlink|trusted|lease path/i);
    });
  });

  it("rejects a cross-volume lease override", async () => {
    const createRuntime = await loadWorkspaceLeaseRuntimeFactory();
    if (!createRuntime) return;
    const cacheDevice = (await lstat(resolve(ROOT, ".cache"))).dev;
    const crossVolumeRoot = "/proc";
    const crossVolumeDevice = (await stat(crossVolumeRoot)).dev;
    expect(crossVolumeDevice).not.toBe(cacheDevice);
    await expect(
      createRuntime({
        leasePath: resolve(
          crossVolumeRoot,
          "reading-advantage-workspace-build.lease",
        ),
        now: Date.now,
        maxWaitMs: 1_000,
      }),
    ).rejects.toThrow(/volume|cache|trusted|lease path/i);
  });
});

describe("mastery runtime packed release contract", () => {
  it("has deterministic package metadata as a harness control", async () => {
    for (const directory of ENGINE_PACKAGES) {
      const manifest = JSON.parse(
        await readFile(
          resolve(ROOT, "packages", directory, "package.json"),
          "utf8",
        ),
      ) as {
        name: string;
        version: string;
        files?: string[];
        exports?: unknown;
      };
      expect(manifest.name).toBe(`@reading-advantage/${directory}`);
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(manifest.files).toContain("dist");
      expect(manifest.exports).toBeTruthy();
    }
  });

  it("keeps workspace catalog resolution for packing while isolating clean-consumer install", async () => {
    const source = await readFile(
      resolve(ROOT, "packages/mastery-runtime-compat/src/release-artifact.ts"),
      "utf8",
    );
    const consumerSource = await readFile(
      resolve(
        ROOT,
        "packages/mastery-runtime-compat/fixtures/consumer/check-consumer.mjs",
      ),
      "utf8",
    );
    const executedPnpmCommand =
      /\b(?:executeLocal|execFile|spawn|spawnSync)\(\s*["']pnpm["']/;
    expect(source).not.toMatch(executedPnpmCommand);
    expect(consumerSource).not.toMatch(executedPnpmCommand);
    expect(source).toMatch(/executeNpmPack\(\s*\[\s*"pack",\s*"--json"/s);
    expect(source).toMatch(
      /executeLocal\(\s*"npm",\s*\[\s*"install",\s*"--offline"/s,
    );
    expect(source).toContain(
      'name: "zod", sourceDirectory: "knowledge-space-core"',
    );
    expect(source).toContain('name: "ts-fsrs", sourceDirectory: "srs-engine"');
    expect(source).toContain('sourceDirectory: "mastery-runtime-compat"');
    expect(source).toContain("NPM_OPERATION_CONCURRENCY = 2");
    expect(source).toContain("NPM_EMPTY_OUTPUT_RETRY_DELAYS_MS");
    expect(source).toContain("withNpmOperationSlot");
    expect(source).toContain("createFifoSemaphore");
    expect(source).not.toContain(
      'resolve(REPOSITORY_ROOT, "node_modules", packageName)',
    );
    expect(consumerSource).toContain("!isAbsolute(child)");
  });

  it("hands FIFO npm tokens to queued work without semaphore barging", async () => {
    const module = (await import("../release-artifact.js")) as {
      createNpmOperationSchedulerForTest: (concurrency?: number) => {
        run<T>(label: string, operation: () => Promise<T>): Promise<T>;
        startOrder(): string[];
        maxActive(): number;
      };
    };
    type LegacyProbe = {
      run<T>(label: string, operation: () => Promise<T>): Promise<T>;
      startOrder(): string[];
      maxActive(): number;
    };
    const createLegacyProbe = (beforeWake: () => void): LegacyProbe => {
      let active = 0;
      let maxActive = 0;
      const startOrder: string[] = [];
      const waiters: Array<() => void> = [];
      return {
        async run<T>(label: string, operation: () => Promise<T>): Promise<T> {
          if (active >= 2) {
            await new Promise<void>((resolveWaiter) =>
              waiters.push(resolveWaiter),
            );
          }
          active += 1;
          startOrder.push(label);
          maxActive = Math.max(maxActive, active);
          try {
            return await operation();
          } finally {
            active -= 1;
            const next = waiters.shift();
            if (next) {
              beforeWake();
              next();
            }
          }
        },
        startOrder: () => [...startOrder],
        maxActive: () => maxActive,
      };
    };
    const legacyCompleted: string[] = [];
    let legacyC!: Promise<void>;
    let releaseLegacyA!: () => void;
    let releaseLegacyB!: () => void;
    let releaseLegacyC!: () => void;
    let releaseLegacyW!: () => void;
    const legacy = createLegacyProbe(() => {
      legacyC = legacy.run("C", async () => {
        await new Promise<void>((resolve) => {
          releaseLegacyC = resolve;
        });
        legacyCompleted.push("C");
      });
    });
    const legacyA = legacy.run("A", () =>
      new Promise<void>((resolve) => {
        releaseLegacyA = resolve;
      }).then(() => {
        legacyCompleted.push("A");
      }),
    );
    const legacyB = legacy.run("B", () =>
      new Promise<void>((resolve) => {
        releaseLegacyB = resolve;
      }).then(() => {
        legacyCompleted.push("B");
      }),
    );
    const legacyW = legacy.run("W", () =>
      new Promise<void>((resolve) => {
        releaseLegacyW = resolve;
      }).then(() => {
        legacyCompleted.push("W");
      }),
    );
    releaseLegacyA();
    await Promise.resolve();
    await Promise.resolve();
    for (
      let attempt = 0;
      attempt < 10 && !legacy.startOrder().includes("W");
      attempt += 1
    ) {
      await Promise.resolve();
    }
    expect(legacy.startOrder()).toEqual(["A", "B", "C", "W"]);
    expect(legacy.maxActive()).toBe(3);
    expect(legacyC).toBeDefined();
    releaseLegacyC();
    await legacyC;
    releaseLegacyW();
    await legacyW;
    releaseLegacyB();
    await Promise.all([legacyA, legacyB]);
    expect(
      legacyCompleted.filter((label) => label === "W" || label === "C"),
    ).toEqual(["C", "W"]);

    const scheduler = module.createNpmOperationSchedulerForTest(2);
    const completed: string[] = [];
    let releaseA!: () => void;
    let releaseB!: () => void;
    let releaseW!: () => void;
    const a = scheduler.run("A", () =>
      new Promise<void>((resolve) => {
        releaseA = resolve;
      }).then(() => {
        completed.push("A");
      }),
    );
    const b = scheduler.run("B", () =>
      new Promise<void>((resolve) => {
        releaseB = resolve;
      }).then(() => {
        completed.push("B");
      }),
    );
    const w = scheduler.run("W", () =>
      new Promise<void>((resolve) => {
        releaseW = resolve;
      }).then(() => {
        completed.push("W");
      }),
    );

    // Yield through operation completion and A's release path, then enqueue C
    // before W's already-woken continuation can acquire the handed-off token.
    releaseA();
    await Promise.resolve();
    await Promise.resolve();
    const c = scheduler.run("C", async () => {
      completed.push("C");
    });
    for (
      let attempt = 0;
      attempt < 10 && !scheduler.startOrder().includes("W");
      attempt += 1
    ) {
      await Promise.resolve();
    }
    expect(scheduler.startOrder()).toEqual(["A", "B", "W"]);
    expect(scheduler.maxActive()).toBeLessThanOrEqual(2);

    releaseW();
    await w;
    await c;
    releaseB();
    await Promise.all([a, b]);
    expect(scheduler.startOrder()).toEqual(["A", "B", "W", "C"]);
    expect(completed.filter((label) => label === "W" || label === "C")).toEqual(
      ["W", "C"],
    );
  });

  it("normalizes workspace and catalog dependencies before packing", async () => {
    const module = (await import("../release-artifact.js")) as {
      normalizePublishManifestForRelease: (
        manifest: Record<string, unknown>,
        localPackageVersions: ReadonlyMap<string, string>,
        catalogVersions: Readonly<Record<string, string>>,
        packedPackageVersions?: ReadonlyMap<string, string>,
      ) => Record<string, unknown>;
    };
    const normalized = module.normalizePublishManifestForRelease(
      {
        name: "@reading-advantage/example",
        version: "0.1.0",
        exports: { ".": "./dist/index.js" },
        private: true,
        scripts: { build: "tsc" },
        devDependencies: { vitest: "catalog:" },
        dependencies: {
          "@reading-advantage/knowledge-space-core": "workspace:*",
          zod: "catalog:",
        },
      },
      new Map([["@reading-advantage/knowledge-space-core", "0.1.0"]]),
      { zod: "^4.1.12" },
    );
    expect(normalized).not.toHaveProperty("private");
    expect(normalized).not.toHaveProperty("scripts");
    expect(normalized).not.toHaveProperty("devDependencies");
    expect(normalized.dependencies).toEqual({
      "@reading-advantage/knowledge-space-core": "0.1.0",
      zod: "^4.1.12",
    });

    const pinned = module.normalizePublishManifestForRelease(
      {
        name: "@reading-advantage/example",
        version: "0.1.0",
        dependencies: {
          "@reading-advantage/knowledge-space-core": "workspace:*",
          zod: "^4.1.12",
        },
      },
      new Map([["@reading-advantage/knowledge-space-core", "0.1.0"]]),
      {},
      new Map([
        ["@reading-advantage/knowledge-space-core", "0.1.0"],
        ["zod", "4.4.3"],
      ]),
    );
    expect(pinned.dependencies).toEqual({
      "@reading-advantage/knowledge-space-core": "0.1.0",
      zod: "4.4.3",
    });
  });

  it("validates conditional wildcard exports by matching packed substitutions", async () => {
    const module = (await import("../release-artifact.js")) as {
      assertExportTargets: (
        manifest: Record<string, unknown>,
        packedPaths: ReadonlySet<string>,
      ) => void;
    };
    const manifest = {
      name: "zod",
      version: "4.4.3",
      exports: {
        "./v4/locales/*": {
          types: "./v4/locales/*",
          import: "./v4/locales/*",
          require: "./v4/locales/*",
        },
      },
    };
    expect(() =>
      module.assertExportTargets(
        manifest,
        new Set(["package/v4/locales/en.js", "package/v4/locales/en.d.cts"]),
      ),
    ).not.toThrow();
    expect(() =>
      module.assertExportTargets(manifest, new Set(["package/v4/index.js"])),
    ).toThrow(/wildcard|absent/i);
  });

  it("dry-runs the engines and Sales knowledge then validates the isolated Sales consumer", async () => {
    const module = await loadReleaseGate();
    expect(
      module,
      "missing reusable src/release-artifact.ts gate",
    ).not.toBeNull();
    if (!module) return;

    const result = await module.runReleaseArtifactCheck({
      temporaryRoot: ARTIFACT_ROOT,
      consumerDescriptorPaths: [SALES_DESCRIPTOR_PATH],
    });
    expect(result.packages).toEqual(
      PACKAGES.map((name) => `@reading-advantage/${name}`),
    );
    expect(result).toMatchObject({
      dryRun: true,
      exportsVerified: true,
      workspaceDependencies: [],
      cleanConsumer: true,
      checkedConsumers: ["sales-advantage"],
      resolvedVersions: RESOLVED_RUNTIME_VERSIONS,
    });
  }, 240_000);

  it("forces lease overlap while one process consumes a private dist snapshot", async () => {
    const root = resolve(
      ROOT,
      ".cache/mastery-runtime-compat/release-artifact-test",
      `two-process-${randomUUID()}`,
    );
    const sentinelPath = resolve(root, "caller-sentinel.txt");
    await mkdir(root, { recursive: true });
    await writeFile(sentinelPath, "do not remove\n", "utf8");
    const releaseModuleUrl = pathToFileURL(
      resolve(ROOT, "packages/mastery-runtime-compat/dist/release-artifact.js"),
    ).href;
    const childScript = `
      const release = await import(${JSON.stringify(releaseModuleUrl)});
      const result = await release.runReleaseArtifactCheck({
        temporaryRoot: process.argv[1],
        consumerDescriptorPaths: [process.argv[2]],
      });
      process.stdout.write(JSON.stringify(result.resolvedVersions) + "\\n");
    `;
    const runChild = (extraEnv: Record<string, string> = {}) =>
      execute(
        process.execPath,
        ["--input-type=module", "-e", childScript, root, SALES_DESCRIPTOR_PATH],
        {
          cwd: ROOT,
          encoding: "utf8",
          env: { ...process.env, CI: "true", ...extraEnv },
          maxBuffer: 20 * 1024 * 1024,
        },
      );

    try {
      const firstPromise = runChild({
        RELEASE_ARTIFACT_TEST_HOLD_LEASE_MS: "1500",
        RELEASE_ARTIFACT_TEST_DELAY_BEFORE_CONSUMER_MS: "30000",
      });
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
      const secondPromise = runChild();
      const [first, second] = await Promise.all([firstPromise, secondPromise]);
      expect(JSON.parse(first.stdout.trim())).toEqual(
        RESOLVED_RUNTIME_VERSIONS,
      );
      expect(JSON.parse(second.stdout.trim())).toEqual(
        RESOLVED_RUNTIME_VERSIONS,
      );
      expect(await readFile(sentinelPath, "utf8")).toBe("do not remove\n");
      expect(await readdir(root)).toEqual(["caller-sentinel.txt"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 420_000);

  it("reclaims a stale truncated lease owner without touching a live lease", async () => {
    const root = resolve(
      ROOT,
      ".cache/mastery-runtime-compat/release-artifact-test",
      `truncated-lease-${randomUUID()}`,
    );
    const leaseRoot = WORKSPACE_LEASE_ROOT;
    const ownerPath = resolve(leaseRoot, "owner.json");
    const truncatedOwner = `{"pid":${process.pid},"token":"truncated-${randomUUID()}`;
    await mkdir(root, { recursive: true });
    let truncatedOwnership: TestLeaseOwnership | undefined;
    let liveOwnerProcess:
      | Promise<{ stdout: string; stderr: string }>
      | undefined;
    let liveReleasePath: string | undefined;

    try {
      truncatedOwnership = await acquireTestLeaseDirectory(leaseRoot);
      await writeFile(ownerPath, truncatedOwner, { flag: "wx" });
      const staleTime = new Date(Date.now() - 16 * 60 * 1_000);
      await utimes(leaseRoot, staleTime, staleTime);
      const module = await loadReleaseGate();
      expect(module).not.toBeNull();
      if (!module) return;
      const result = await module.runReleaseArtifactCheck({
        temporaryRoot: root,
        consumerDescriptorPaths: [SALES_DESCRIPTOR_PATH],
      });
      expect(result.resolvedVersions).toEqual(RESOLVED_RUNTIME_VERSIONS);
      await expect(lstat(leaseRoot)).rejects.toMatchObject({ code: "ENOENT" });

      const readyPath = resolve(root, "live-owner-ready");
      liveReleasePath = resolve(root, "release-live-owner");
      const releasedPath = resolve(root, "live-owner-released");
      const liveOwnerScript = `
        import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
        import { resolve } from "node:path";
        const leasePath = process.argv[1];
        const ready = process.argv[2];
        const release = process.argv[3];
        const released = process.argv[4];
        const token = "live-owner-" + process.pid;
        await mkdir(leasePath);
        const ownerPath = resolve(leasePath, "owner.json");
        const ownerBytes = JSON.stringify({
          pid: process.pid,
          token,
          acquiredAt: Date.now() - 16 * 60 * 1_000,
        }) + "\\n";
        await writeFile(
          ownerPath,
          ownerBytes,
          { flag: "wx" },
        );
        await writeFile(ready, "ready\\n", { flag: "wx" });
        try {
          for (;;) {
            try {
              await lstat(release);
              break;
            } catch (error) {
              if (error?.code !== "ENOENT") throw error;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
            }
          }
        } finally {
          try {
            if ((await readFile(ownerPath, "utf8")) === ownerBytes) {
              await rm(leasePath, { recursive: true, force: false });
            }
          } catch (error) {
            if (error?.code !== "ENOENT") throw error;
          }
          await writeFile(released, "released\\n", { flag: "wx" });
        }
      `;
      liveOwnerProcess = execute(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          liveOwnerScript,
          leaseRoot,
          readyPath,
          liveReleasePath,
          releasedPath,
        ],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
      );
      for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
          await lstat(readyPath);
          break;
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 20));
          if (attempt === 99) throw new Error("Live lease owner did not start");
        }
      }
      const liveOwnerBytes = await readFile(ownerPath, "utf8");
      let gateSettled = false;
      const liveResultPromise = module
        .runReleaseArtifactCheck({
          temporaryRoot: root,
          consumerDescriptorPaths: [SALES_DESCRIPTOR_PATH],
        })
        .finally(() => {
          gateSettled = true;
        });
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
      expect(gateSettled).toBe(false);
      expect(await readFile(ownerPath, "utf8")).toBe(liveOwnerBytes);
      await writeFile(liveReleasePath, "release\\n", { flag: "wx" });
      const liveResult = await liveResultPromise;
      await liveOwnerProcess;
      expect(liveResult.resolvedVersions).toEqual(RESOLVED_RUNTIME_VERSIONS);
      await expect(lstat(releasedPath)).resolves.toBeTruthy();
      await expect(lstat(leaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      if (liveReleasePath) {
        await writeFile(liveReleasePath, "release\\n", { flag: "wx" }).catch(
          (error) => {
            if (error?.code !== "EEXIST" && error?.code !== "ENOENT")
              throw error;
          },
        );
      }
      if (liveOwnerProcess) await liveOwnerProcess.catch(() => undefined);
      if (truncatedOwnership) {
        await removeTestLeaseIfOwned(truncatedOwnership, truncatedOwner);
      }
      await rm(root, { recursive: true, force: true });
    }
  }, 240_000);
});
