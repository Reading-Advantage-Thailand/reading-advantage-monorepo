import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLegacyImportManifest,
  legacyImportManifestSchema,
} from "../lib/legacy-import-manifest";

const APP_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_OUTPUT_DIR = join(APP_ROOT, "import-manifests");

interface CliArgs {
  project?: string;
  out?: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") {
      args.project = argv[index + 1];
      index += 1;
    } else if (arg === "--out") {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: dry-run-import [--project <dir>] [--out <dir>]\n" +
          "Runs a dry-run legacy workbook import and writes a manifest JSON.\n" +
          "No database or object-storage writes are performed.",
      );
      process.exit(0);
    }
  }
  return args;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

async function readProjectMetadata(
  projectRoot: string,
): Promise<{
  type?: string;
  seriesName?: string;
  levelNumber?: string;
  cefrLevel?: string;
}> {
  try {
    const raw = await readFile(join(projectRoot, "project.json"), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const pick = (key: string): string | undefined =>
      typeof parsed[key] === "string" ? (parsed[key] as string) : undefined;
    return {
      type: pick("type"),
      seriesName: pick("seriesName"),
      levelNumber: pick("levelNumber"),
      cefrLevel: pick("cefrLevel"),
    };
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    console.error(
      "Missing --project <dir>. Run: pnpm --filter workbooks run dry-run:import -- --project <legacy project dir>",
    );
    process.exit(1);
  }

  const projectRoot = resolve(args.project);
  const outDir = resolve(args.out ?? DEFAULT_OUTPUT_DIR);

  const entries = await readdir(projectRoot);
  const lessonFiles = entries
    .filter((name) => name.endsWith("_workbook.json"))
    .sort();
  if (lessonFiles.length === 0) {
    console.error(`No *_workbook.json lesson files found in ${projectRoot}.`);
    process.exit(1);
  }

  const files = [];
  for (const name of lessonFiles) {
    const raw = await readFile(join(projectRoot, name), "utf8");
    files.push({ sourcePath: name, raw });
  }

  const manifest = buildLegacyImportManifest({
    project: {
      projectId: basename(projectRoot),
      sourceRoot: projectRoot,
      ...(await readProjectMetadata(projectRoot)),
    },
    files,
    generatedAt: new Date().toISOString(),
  });

  const validated = legacyImportManifestSchema.parse(manifest);

  const outFile = join(
    outDir,
    `${validated.project.projectId}-${formatTimestamp(validated.generatedAt)}.json`,
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(validated, null, 2)}\n`, "utf8");

  console.log(
    `Dry-run complete for "${validated.project.projectId}" (${validated.project.sourceRoot})`,
  );
  console.log(
    `  lessons: ${validated.counts.lessons}, parse ok: ${validated.counts.parseOk}, parse errors: ${validated.counts.parseError}, exceptions: ${validated.counts.exceptions}`,
  );
  console.log(`Manifest written to ${outFile}`);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Dry-run import failed.",
  );
  process.exit(1);
});
