import { spawn } from "node:child_process";

/**
 * Drains a readable stream into a string, resolving when the stream ends.
 * @param stream The readable stream to collect.
 * @returns The concatenated string contents of the stream.
 */
async function collectStream(
  stream: import("node:stream").Readable,
): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
  }
  return chunks.join("");
}

/**
 * Wraps a spawned child process in a promise that resolves on exit 0 and
 * rejects on non-zero exit or spawn errors (e.g. ENOENT).
 * @param command The binary to spawn.
 * @param args Argument array (no shell interpolation).
 * @returns Promise that resolves with collected stdout on success.
 * @throws When the process exits non-zero or the binary is missing.
 */
function spawnOrThrow(
  command: string,
  args: readonly string[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args]);
    let stderr = "";

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            `${command} not found — is it installed and on PATH? (ENOENT)`,
          ),
        );
      } else {
        reject(err);
      }
    });

    const stdoutPromise = collectStream(child.stdout);
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.stderr.resume();

    child.on("close", async (code) => {
      const stdout = await stdoutPromise;
      if (code !== 0) {
        reject(
          new Error(`${command} exited with code ${code}: ${stderr.trim()}`),
        );
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Probes an audio/video file and returns its duration in seconds.
 * Uses ffprobe with JSON output to parse the `format.duration` field.
 * @param filePath Path to the media file to probe.
 * @returns Duration in seconds as a floating-point number.
 * @throws When ffprobe is not installed, the file does not exist, or ffprobe
 *   exits with a non-zero code.
 */
export async function probeDurationSeconds(filePath: string): Promise<number> {
  const stdout = await spawnOrThrow("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    filePath,
  ]);

  const parsed = JSON.parse(stdout) as { format?: { duration?: string } };
  const raw = parsed.format?.duration;
  if (raw === undefined) {
    throw new Error("ffprobe output missing format.duration field");
  }
  return parseFloat(raw);
}

/**
 * Concatenates multiple MP3 files into a single output file using ffmpeg's
 * concat filter. Each input path is passed as a discrete `-i` argv element.
 * @param inputPaths Ordered array of MP3 file paths to concatenate.
 * @param outputPath Destination path for the merged MP3.
 * @throws When ffmpeg is not installed or exits with a non-zero code.
 */
export async function concatMp3Files(
  inputPaths: string[],
  outputPath: string,
): Promise<void> {
  const n = inputPaths.length;
  const filterParts = inputPaths.map((_p, i) => `[${i}:a]`).join("");
  const filter = `${filterParts}concat=n=${n}:v=0:a=1[out]`;

  const args: string[] = ["-y"];
  for (const p of inputPaths) {
    args.push("-i", p);
  }
  args.push("-filter_complex", filter, "-map", "[out]", outputPath);

  await spawnOrThrow("ffmpeg", args);
}
