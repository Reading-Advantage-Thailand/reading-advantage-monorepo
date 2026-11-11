// @vitest-environment node
// Phase 5 red test for plan task 5.3, part 3: the file-kind measurement script.
//
// The script lives in `apps/storytime/scripts/checks/file-kind.ts`. This file is the contract.
//
// Contract of `file-kind.ts`:
//   - It exports `parseFileKind(text)`. The text is the ffprobe JSON output of one file. The
//     function returns the format name, the codec name, and the size of the file in bytes.
//   - It exports `main(argv)`. The argv holds `--file <path>`, `--kind <kind>`, and
//     `--size <bytes>`. The kind is `audio`, `picture`, or `video`.
//   - The script reads the file with ffprobe. It finds the kind of the file from the format
//     that ffprobe reports. An image format, for example png, jpeg, image2, or webp, gives
//     `picture`. An audio format, for example mp3, aac, wav, flac, or ogg, gives `audio`. A
//     media container, for example mp4, mov, or matroska, gives `video`. The script prints
//     `size_bytes=<n>` and `file_kind=<kind>`.
//   - The script returns 0 when the size of the file equals the expected size and the kind of
//     the file equals the expected kind. It returns a non-zero code when either differs.
//   - Run as a program, the script exits with the code that `main` returns.
//
// AC-10.1 holds when every file on the media list exists with the expected size and type. The
// script reads the content of the file, never the name, so a picture that carries the name of
// a sound file fails.
//
// Every case proves that the script fails its broken copy. A check that cannot fail is a
// defect, so the good file, the broken copies, and the parser control sit in one file. The
// broken copies are made in a temporary folder from a real file, one change each, and the
// folder is removed when the file ends.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it, vi } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(app, "../..");

/** The hand-off package that holds the milestone media (test strategy P5.9). */
const MEDIA_ROOT = resolve(homedir(), "Desktop/handoff/w01-storytime-app-package-r4");

/** The folder that holds the broken copies. The file removes it when it ends. */
const scratch = mkdtempSync(resolve(tmpdir(), "storytime-phase5-kind-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/**
 * Gives the path of one file of the hand-off package.
 * @param relative The path inside the package.
 * @returns The absolute path.
 */
function media(relative: string): string {
  return resolve(MEDIA_ROOT, relative);
}

/**
 * Reads the size of a file in bytes.
 * @param file The file to read.
 * @returns The size of the file.
 */
function sizeOf(file: string): number {
  const run = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=size", "-of", "csv=p=0", file], {
    encoding: "utf8",
  });
  const size = Number((run.stdout ?? "").trim());
  expect(Number.isFinite(size), `ffprobe read no size for ${file}`).toBe(true);
  return size;
}

/**
 * Reads one export of a check script.
 *
 * The script reads the export by name, so a missing export fails with a clear message and not
 * with a load error.
 * @param name The name of the script file without the extension.
 * @returns The exports of the script.
 */
async function loadScript(name: string): Promise<Record<string, unknown>> {
  const path = resolve(app, "scripts", "checks", `${name}.ts`);
  expect(existsSync(path), `Missing ${path}`).toBe(true);
  const module = (await import(/* @vite-ignore */ new URL(`file://${path}`).href)) as Record<
    string,
    unknown
  >;
  return module;
}

/**
 * Reads one function of a check script.
 * @param script The exports of the script.
 * @param name The name of the export.
 * @returns The function.
 */
function functionOf(script: Record<string, unknown>, name: string): (...args: unknown[]) => unknown {
  const value = script[name];
  expect(typeof value, `the check script has no function ${name}`).toBe("function");
  return value as (...args: unknown[]) => unknown;
}

/**
 * Runs the main function of a check script and gives its exit code and its output.
 * @param script The exports of the script.
 * @param file The file to check.
 * @param kind The expected kind of the file.
 * @param size The expected size of the file in bytes.
 * @returns The exit code and the printed text.
 */
function runMain(
  script: Record<string, unknown>,
  file: string,
  kind: string,
  size: number,
): { code: number; output: string } {
  const main = functionOf(script, "main");
  const lines: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.map((value) => String(value)).join(" "));
  });
  const write = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      lines.push(String(chunk));
      return true;
    });
  let code = 0;
  try {
    code = Number(main(["--file", file, "--kind", kind, "--size", String(size)]));
  } finally {
    log.mockRestore();
    write.mockRestore();
  }
  return { code, output: lines.join("\n") };
}

/**
 * Reads one labeled number of the output of a check script.
 * @param output The printed text.
 * @param label The label, for example `size_bytes`.
 * @returns The number.
 */
function labeled(output: string, label: string): number {
  const found = output.match(new RegExp(`(?:^|\\s)${label}=(-?[0-9.]+)(?:\\s|$)`, "m"));
  expect(found, `the check script prints no ${label}`).not.toBeNull();
  return Number(found?.[1]);
}

/**
 * Reads one labeled word of the output of a check script.
 * @param output The printed text.
 * @param label The label, for example `file_kind`.
 * @returns The word.
 */
function labeledWord(output: string, label: string): string {
  const found = output.match(new RegExp(`(?:^|\\s)${label}=([a-z]+)(?:\\s|$)`, "m"));
  expect(found, `the check script prints no ${label}`).not.toBeNull();
  return found?.[1] ?? "";
}

describe("Phase 5 stage 1 file kind and size check (AC-10.1)", () => {
  it("names the hand-off package that holds the milestone media", () => {
    expect(existsSync(MEDIA_ROOT), `Missing the hand-off package ${MEDIA_ROOT}`).toBe(true);
  });

  it("parses the ffprobe JSON text with no media folder", async () => {
    const script = await loadScript("file-kind");
    const parse = functionOf(script, "parseFileKind") as (text: string) => {
      formatName: string;
      codecName: string;
      sizeBytes: number;
    };
    const text = JSON.stringify({
      streams: [{ codec_name: "mp3", codec_type: "audio" }],
      format: { format_name: "mp3", size: "149984" },
    });
    const parsed = parse(text);
    expect(parsed.formatName, "the parser reads no format name").toBe("mp3");
    expect(parsed.codecName, "the parser reads no codec name").toBe("mp3");
    expect(parsed.sizeBytes, "the parser reads no size").toBe(149984);
  });

  it("passes a real sound file with the expected size and kind", async () => {
    const script = await loadScript("file-kind");
    const file = media("l2/media/w01/books/1-hello.mp3");
    expect(existsSync(file), `Missing ${file}`).toBe(true);
    const size = sizeOf(file);
    const run = runMain(script, file, "audio", size);
    expect(labeled(run.output, "size_bytes"), "the script reports another size").toBe(size);
    expect(labeledWord(run.output, "file_kind"), "the script reports another kind").toBe("audio");
    expect(run.code, "the script fails a real sound file with the expected size and kind").toBe(0);
  });

  it("passes a real picture file with the expected size and kind", async () => {
    const script = await loadScript("file-kind");
    const file = media("l2/media/w01/books/1-hello/p01.jpg");
    expect(existsSync(file), `Missing ${file}`).toBe(true);
    const size = sizeOf(file);
    const run = runMain(script, file, "picture", size);
    expect(labeledWord(run.output, "file_kind"), "the script reports another kind").toBe("picture");
    expect(run.code, "the script fails a real picture file with the expected size and kind").toBe(0);
  });

  it("passes a real video file with the expected size and kind", async () => {
    const script = await loadScript("file-kind");
    const file = media("l2/media/w01/song.mp4");
    expect(existsSync(file), `Missing ${file}`).toBe(true);
    const size = sizeOf(file);
    const run = runMain(script, file, "video", size);
    expect(labeledWord(run.output, "file_kind"), "the script reports another kind").toBe("video");
    expect(run.code, "the script fails a real video file with the expected size and kind").toBe(0);
  });

  it("fails a picture that carries the name of a sound file", async () => {
    const script = await loadScript("file-kind");
    const source = media("l2/media/w01/books/1-hello/p01.jpg");
    const copy = resolve(scratch, "picture-named-mp3.mp3");
    const made = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-i", source, copy], {
      encoding: "utf8",
    });
    expect(made.status, "the broken copy was not made").toBe(0);
    const size = sizeOf(copy);
    const run = runMain(script, copy, "audio", size);
    expect(labeledWord(run.output, "file_kind"), "the script reads the name instead of the content").toBe(
      "picture",
    );
    expect(run.code, "the script passes a picture that carries the name of a sound file").not.toBe(0);
  });

  it("fails a copy whose size differs from the expected size", async () => {
    const script = await loadScript("file-kind");
    const source = media("l2/media/w01/books/1-hello.mp3");
    const copy = resolve(scratch, "grown.mp3");
    const made = spawnSync("cp", [source, copy], { encoding: "utf8" });
    expect(made.status, "the broken copy was not made").toBe(0);
    const grown = spawnSync("dd", ["if=/dev/zero", `of=${copy}`, "oflag=append", "count=1000"], {
      encoding: "utf8",
    });
    expect(grown.status, "the broken copy was not made").toBe(0);
    const expected = sizeOf(source);
    const run = runMain(script, copy, "audio", expected);
    expect(labeled(run.output, "size_bytes"), "the script reports another size").not.toBe(expected);
    expect(run.code, "the script passes a copy whose size differs").not.toBe(0);
  });

  it("exits non-zero on the broken copy when the script runs as a program", async () => {
    const script = await loadScript("file-kind");
    const source = media("l2/media/w01/books/1-hello/p01.jpg");
    const copy = resolve(scratch, "program-picture.mp3");
    const made = spawnSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-i", source, copy], {
      encoding: "utf",
    });
    expect(made.status, "the broken copy was not made").toBe(0);
    const program = spawnSync(
      resolve(repoRoot, "node_modules/.bin/tsx"),
      ["scripts/checks/file-kind.ts", "--file", copy, "--kind", "audio", "--size", String(sizeOf(copy))],
      { cwd: app, encoding: "utf8" },
    );
    expect(program.status, "the script exits zero on a broken copy").not.toBe(0);
  });
});
