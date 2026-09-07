import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it, vi } from "vitest";

import { evaluateConsumerCompatibility, runtimeManifest } from "../index.js";
import { createWorkspaceLeaseRuntimeForTest } from "../release-artifact.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, writeFile: vi.fn(actual.writeFile) };
});

const execute = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "../../../..");
const ADVERSARIAL_ROOT = resolve(
  ROOT,
  ".cache/mastery-runtime-compat/phase0-adversarial",
);
const TRUSTED_WORK_ROOT = resolve(
  ROOT,
  ".cache/mastery-runtime-compat/trusted-work",
);
const SALES_DESCRIPTOR_PATH = resolve(
  ROOT,
  "packages/mastery-runtime-compat/fixtures/consumer/sales-advantage.json",
);

type JsonRecord = Record<string, unknown>;

/** Runs a lease test in a unique cache directory. */
async function withIsolatedLeaseRoot<T>(
  operation: (leasePath: string) => Promise<T>,
): Promise<T> {
  await mkdir(ADVERSARIAL_ROOT, { recursive: true });
  const root = await mkdtemp(join(ADVERSARIAL_ROOT, "lease-"));
  const leasePath = resolve(root, ".workspace-build.lease");
  try {
    return await operation(leasePath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Pauses a polling loop without relying on a test runner timer. */
async function pause(milliseconds: number): Promise<void> {
  await new Promise<void>((resolvePause) =>
    setTimeout(resolvePause, milliseconds),
  );
}

/** Finds the first archive below one release-artifact child. */
async function findArchive(directory: string): Promise<string | undefined> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  for (const entry of entries) {
    const candidate = resolve(directory, entry.name);
    if (entry.isFile() && entry.name.endsWith(".tgz")) return candidate;
    if (entry.isDirectory()) {
      const nested = await findArchive(candidate);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Waits until the release proof has produced an archive in its private child. */
async function waitForPackedArchive(
  initialEntries: ReadonlySet<string>,
): Promise<string> {
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    let entries: string[];
    try {
      entries = await readdir(TRUSTED_WORK_ROOT);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      entries = [];
    }
    for (const entry of entries) {
      if (initialEntries.has(entry) || !entry.startsWith(".release-artifact-"))
        continue;
      const archive = await findArchive(resolve(TRUSTED_WORK_ROOT, entry));
      if (archive) return archive;
    }
    await pause(100);
  }
  throw new Error("Packed archive did not become visible");
}

/** Creates a valid replacement archive with one additional package file. */
async function replaceArchive(
  archivePath: string,
  replacementRoot: string,
): Promise<string> {
  const extractedRoot = await mkdtemp(join(replacementRoot, "extract-"));
  const replacementPath = resolve(replacementRoot, "replacement.tgz");
  await execute("tar", ["-xzf", archivePath, "-C", extractedRoot], {
    cwd: ROOT,
    encoding: "utf8",
  });
  await writeFile(
    resolve(extractedRoot, "package", "adversarial-substitution.txt"),
    `${randomUUID()}\n`,
    { flag: "wx" },
  );
  await execute(
    "tar",
    ["-czf", replacementPath, "-C", extractedRoot, "package"],
    { cwd: ROOT, encoding: "utf8" },
  );
  return replacementPath;
}

/** Returns subprocess failure text without including binary output. */
function subprocessFailureText(error: unknown): string {
  if (typeof error !== "object" || error == null) return String(error);
  const candidate = error as { message?: unknown; stderr?: unknown };
  return [candidate.message, candidate.stderr]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
}

describe("Sales Phase 0 adversarial contracts", () => {
  it("rejects malformed descriptors without accepting or throwing", async () => {
    const descriptor = JSON.parse(
      await readFile(SALES_DESCRIPTOR_PATH, "utf8"),
    ) as JsonRecord;
    const graph = descriptor.graph as JsonRecord;
    const candidates: unknown[] = [
      { ...descriptor, packages: "not-a-package-map" },
      { ...descriptor, imports: [null] },
      { ...descriptor, graph: { ...graph, release: 42 } },
    ];

    const results = candidates.map((candidate) =>
      evaluateConsumerCompatibility(runtimeManifest, candidate),
    );

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.every((issue) => issue.path && issue.message)).toBe(
        true,
      );
    }
  });

  it("does not write the lease owner through a swapped lease symlink", async () => {
    const writeFileMock = vi.mocked(writeFile);
    const realWriteFile = writeFileMock.getMockImplementation();
    expect(realWriteFile).toBeDefined();
    if (!realWriteFile) return;

    await withIsolatedLeaseRoot(async (leasePath) => {
      const outsideRoot = await mkdtemp(join(ADVERSARIAL_ROOT, "outside-"));
      const runtime = await createWorkspaceLeaseRuntimeForTest({
        leasePath,
        now: Date.now,
        maxWaitMs: 1_000,
      });
      writeFileMock.mockImplementationOnce(async (path, data, options) => {
        await rm(leasePath, { recursive: true, force: false });
        await symlink(outsideRoot, leasePath);
        return realWriteFile(path, data, options);
      });

      try {
        await expect(runtime.acquire()).rejects.toThrow(
          /regular|symlink|changed/i,
        );
        expect(await readdir(outsideRoot)).toEqual([]);
      } finally {
        writeFileMock.mockClear();
        writeFileMock.mockImplementation(realWriteFile);
        await rm(outsideRoot, { recursive: true, force: true });
      }
    });
  });

  it("rejects a valid archive substituted before clean-consumer use", async () => {
    await mkdir(TRUSTED_WORK_ROOT, { recursive: true });
    await mkdir(ADVERSARIAL_ROOT, { recursive: true });
    const initialEntries = new Set(await readdir(TRUSTED_WORK_ROOT));
    const temporaryRoot = resolve(
      ADVERSARIAL_ROOT,
      `archive-substitution-${randomUUID()}`,
    );
    const releaseModuleUrl = pathToFileURL(
      resolve(ROOT, "packages/mastery-runtime-compat/dist/release-artifact.js"),
    ).href;
    const childScript = `
      const release = await import(${JSON.stringify(releaseModuleUrl)});
      const result = await release.runReleaseArtifactCheck({
        temporaryRoot: process.argv[1],
        consumerDescriptorPaths: [process.argv[2]],
      });
      process.stdout.write(JSON.stringify(result.archiveDigestsSha256) + "\\n");
    `;
    const childPromise = execute(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        childScript,
        temporaryRoot,
        SALES_DESCRIPTOR_PATH,
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          CI: "true",
          RELEASE_ARTIFACT_TEST_DELAY_BEFORE_CONSUMER_MS: "30000",
        },
        maxBuffer: 20 * 1024 * 1024,
      },
    );
    let archivePath: string | undefined;
    let originalPath: string | undefined;
    try {
      archivePath = await waitForPackedArchive(initialEntries);
      const replacementRoot = await mkdtemp(
        join(ADVERSARIAL_ROOT, "replacement-"),
      );
      const replacementPath = await replaceArchive(
        archivePath,
        replacementRoot,
      );
      originalPath = resolve(replacementRoot, "original.tgz");
      await rename(archivePath, originalPath);
      await rename(replacementPath, archivePath);

      let failureText = "";
      try {
        await childPromise;
      } catch (error) {
        failureText = subprocessFailureText(error);
      }
      expect(failureText).toMatch(
        /RELEASE_ARCHIVE_MUTATION_CONFLICT|archive.*(?:changed|substitut|digest)|artifact.*(?:changed|substitut)/i,
      );
    } finally {
      await childPromise.catch(() => undefined);
      if (archivePath && originalPath) {
        await rm(archivePath, { force: true });
        await rename(originalPath, archivePath).catch(() => undefined);
      }
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 420_000);
});
