import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { tutorialManifestSchema, type TutorialManifest } from "./contracts.js";

/** Source port for versioned tutorial starter files. */
export interface TutorialStarterSource {
  /**
   * Reads one manifest-allowlisted starter file.
   * @param filePath Repository-relative path from the validated manifest.
   * @returns UTF-8 starter content without executing repository code.
   */
  readStarterFile(filePath: string): Promise<string>;
}

/**
 * Materializes a versioned tutorial repository without executing repository-authored code.
 * @param manifestInput Strict tutorial manifest that defines the complete file allowlist.
 * @param targetRoot Empty destination directory controlled by the host.
 * @param source Trusted starter-file source adapter.
 * @returns Absolute destination path containing starter files and the manifest.
 */
export async function scaffoldTutorialRepository(manifestInput: unknown, targetRoot: string, source: TutorialStarterSource): Promise<string> {
  const manifest: TutorialManifest = tutorialManifestSchema.parse(manifestInput);
  const root = resolve(targetRoot);
  await mkdir(root, { recursive: true });
  if ((await readdir(root)).length > 0) throw new Error("Tutorial scaffold destination must be empty");
  for (const filePath of manifest.allowedFiles) {
    const destination = resolve(root, filePath);
    if (!destination.startsWith(`${root}${sep}`)) throw new Error(`Tutorial scaffold path escaped destination: ${filePath}`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, await source.readStarterFile(filePath), { encoding: "utf8", flag: "wx" });
  }
  await writeFile(resolve(root, "activity-tutorial.json"), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return root;
}
