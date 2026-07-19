import { createHash } from "node:crypto";
import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const MANIFEST_RELATIVE_PATH =
  "apps/sales-advantage/release-source.json";

/** Returns a portable repository-relative path. */
function portablePath(root, absolutePath) {
  return relative(root, absolutePath).split(sep).join("/");
}

/** Recursively lists every regular release-source file except the manifest. */
async function listReleaseFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
    const absolutePath = resolve(directory, entry.name);
    const repositoryPath = portablePath(root, absolutePath);
    if (repositoryPath === MANIFEST_RELATIVE_PATH) continue;
    if (entry.isDirectory()) {
      files.push(...await listReleaseFiles(root, absolutePath));
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`SALES_RELEASE_SOURCE_UNSUPPORTED_ENTRY ${repositoryPath}`);
    }
    files.push({ absolutePath, repositoryPath });
  }
  return files;
}

/**
 * Builds the deterministic content and mode manifest for an exact release archive.
 * @param commit Exact lowercase Git commit represented by the archive.
 * @param root Absolute or relative path to the archive root.
 * @returns The canonical source manifest including every regular archive file.
 */
export async function buildReleaseSourceManifest(commit, root) {
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error("SALES_RELEASE_SOURCE_COMMIT_INVALID");
  }
  const files = [];
  for (const file of await listReleaseFiles(root)) {
    const [content, metadata] = await Promise.all([
      readFile(file.absolutePath),
      lstat(file.absolutePath),
    ]);
    files.push({
      path: file.repositoryPath,
      mode: metadata.mode & 0o111 ? "100755" : "100644",
      bytes: content.byteLength,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  return { schemaVersion: 1, commit, files };
}

/**
 * Serializes one source manifest into stable review bytes.
 * @param manifest Release source manifest to serialize.
 * @returns Stable pretty-printed JSON terminated by one newline.
 */
export function serializeReleaseSourceManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Creates the exact archive-local source manifest.
 * @param commit Exact lowercase Git commit represented by the archive.
 * @param root Path to the archive root.
 * @param manifestPath Destination for the generated source manifest.
 * @returns SHA-256 of the exact manifest bytes written to disk.
 */
export async function createReleaseSourceManifest(commit, root, manifestPath) {
  const manifest = await buildReleaseSourceManifest(commit, root);
  await mkdir(dirname(manifestPath), { recursive: true });
  const serialized = serializeReleaseSourceManifest(manifest);
  await writeFile(manifestPath, serialized);
  return createHash("sha256").update(serialized).digest("hex");
}

/**
 * Verifies manifest bytes, commit binding, and every exact archive file.
 * @param commit Exact lowercase Git commit expected in the manifest.
 * @param root Path to the archive root.
 * @param manifestPath Path to the source manifest being verified.
 * @param expectedManifestSha256 Expected SHA-256 of the manifest bytes.
 * @returns The verified manifest SHA-256.
 * @throws When the manifest or any archive file does not match the contract.
 */
export async function verifyReleaseSourceManifest(
  commit,
  root,
  manifestPath,
  expectedManifestSha256,
) {
  if (!/^[0-9a-f]{64}$/.test(expectedManifestSha256)) {
    throw new Error("SALES_RELEASE_SOURCE_MANIFEST_SHA_INVALID");
  }
  const serialized = await readFile(manifestPath, "utf8");
  const actualManifestSha256 = createHash("sha256")
    .update(serialized)
    .digest("hex");
  if (actualManifestSha256 !== expectedManifestSha256) {
    throw new Error("SALES_RELEASE_SOURCE_MANIFEST_SHA_MISMATCH");
  }
  const actual = JSON.parse(serialized);
  if (actual.commit !== commit) {
    throw new Error("SALES_RELEASE_SOURCE_COMMIT_MISMATCH");
  }
  const expected = await buildReleaseSourceManifest(commit, root);
  if (serializeReleaseSourceManifest(actual) !==
      serializeReleaseSourceManifest(expected)) {
    throw new Error("SALES_RELEASE_SOURCE_ARCHIVE_MISMATCH");
  }
  return actualManifestSha256;
}

async function main() {
  const [command, commit, rootArgument, manifestArgument, expectedSha256] =
    process.argv.slice(2);
  const root = resolve(rootArgument ?? ".");
  const manifestPath = resolve(
    manifestArgument ?? resolve(root, MANIFEST_RELATIVE_PATH),
  );
  if (command === "create") {
    process.stdout.write(
      `${await createReleaseSourceManifest(commit, root, manifestPath)}\n`,
    );
    return;
  }
  if (command === "verify") {
    process.stdout.write(
      `${await verifyReleaseSourceManifest(
        commit,
        root,
        manifestPath,
        expectedSha256,
      )}\n`,
    );
    return;
  }
  throw new Error("SALES_RELEASE_SOURCE_COMMAND_INVALID");
}

if (process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
