// @vitest-environment node
/**
 * Phase 2 Red-phase tests for the shared FFmpeg process utility owned by
 * Batch E of the dependency_upgrade_hardening_20260607 track.
 *
 * These tests pin the contract for `packages/utils/src/ffmpeg-process.ts`
 * (which does not yet exist on disk). They are intentionally RED at HEAD: the
 * test file imports from `../ffmpeg-process`, which makes vitest fail the
 * suite at module-resolution time. Batch E (Green) will create the utility
 * and refactor both audio generators to use it.
 *
 * Per `measure/tracks/dependency_upgrade_hardening_20260607/test-strategy.md`:
 *   - §2: Single `mockSpawn` helper captures argv, stdin, exit code, stderr.
 *   - §2: Two MP3 fixtures (`silence-1s.mp3`, `silence-2s.mp3`) live under
 *     `packages/utils/src/__tests__/fixtures/` and are reused by the bounded
 *     local concat smoke in Batch E.
 *   - §4: Utility lives under `packages/utils` (NOT in an app), uses argument
 *     arrays only, and never passes `shell: true` to spawn.
 *   - §7: Live-gate owner is Batch E (Phase 3), which adds the fixture-driven
 *     local smoke that runs inside 30s.
 *
 * Bounded scope:
 *   - All spawn invocations are mocked; no real ffmpeg / ffprobe is launched.
 *   - The test file targets only this contract; running
 *     `pnpm --filter @reading-advantage/utils test ffmpeg-process` exercises
 *     this file only (vitest treats the positional as a path filter).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { Readable, Writable } from "node:stream";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SpawnOptions } from "node:child_process";

/** Records a single mocked spawn invocation. */
interface SpawnCall {
  command: string;
  args: readonly string[];
  options: SpawnOptions | undefined;
}

/** Configurable behaviour for a single mocked child process. */
interface MockChildConfig {
  /** Exit code; defaults to 0. */
  exitCode?: number;
  /** Signal name when the process is killed (e.g. "SIGTERM"). */
  signal?: NodeJS.Signals | null;
  /** Stdout payload emitted on the `data` event. */
  stdout?: string;
  /** Stderr payload emitted on the `data` event. */
  stderr?: string;
  /** Throw an ENOENT spawn error to simulate a missing binary. */
  enoent?: boolean;
}

/**
 * Builds a vi-mock-compatible `spawn` replacement that records every call and
 * returns a fake ChildProcess whose stdout/stderr/exit behaviour matches the
 * provided plan.
 *
 * @param plan Per-call configuration in invocation order. If shorter than the
 *   actual call list, later calls reuse the final plan entry.
 * @returns A tuple of the spawn replacement and the recorded call array.
 */
function mockSpawn(plan: MockChildConfig[] = [{}]): {
  spawn: (
    command: string,
    args: readonly string[],
    options?: SpawnOptions,
  ) => unknown;
  calls: SpawnCall[];
} {
  const calls: SpawnCall[] = [];
  const spawn = (
    command: string,
    args: readonly string[] = [],
    options?: SpawnOptions,
  ) => {
    calls.push({ command, args, options });
    const config = plan[Math.min(calls.length - 1, plan.length - 1)] ?? {};

    const child = new EventEmitter() as EventEmitter & {
      stdout: Readable;
      stderr: Readable;
      stdin: Writable;
      kill: (signal?: NodeJS.Signals) => boolean;
    };
    child.stdout = new Readable({ read() {} });
    child.stderr = new Readable({ read() {} });
    child.stdin = new Writable({ write(_c, _e, cb) { cb(); } });
    child.kill = () => true;

    if (config.enoent) {
      queueMicrotask(() => {
        const err = new Error(
          `spawn ${command} ENOENT`,
        ) as NodeJS.ErrnoException;
        err.code = "ENOENT";
        child.emit("error", err);
      });
      return child;
    }

    queueMicrotask(() => {
      if (config.stdout) child.stdout.push(config.stdout);
      child.stdout.push(null);
      if (config.stderr) child.stderr.push(config.stderr);
      child.stderr.push(null);
      child.emit("close", config.exitCode ?? 0, config.signal ?? null);
      child.emit("exit", config.exitCode ?? 0, config.signal ?? null);
    });

    return child;
  };

  return { spawn, calls };
}

let spawnHandle: ReturnType<typeof mockSpawn>;

vi.mock("node:child_process", () => ({
  spawn: (...args: Parameters<ReturnType<typeof mockSpawn>["spawn"]>) =>
    spawnHandle.spawn(...args),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_1S = resolve(__dirname, "fixtures", "silence-1s.mp3");
const FIXTURE_2S = resolve(__dirname, "fixtures", "silence-2s.mp3");

// The Red-phase import: `../ffmpeg-process` does not exist at HEAD. Vitest
// resolves this at module-load time, which is exactly the Red signal we want.
import {
  probeDurationSeconds,
  concatMp3Files,
} from "../ffmpeg-process";

beforeEach(() => {
  spawnHandle = mockSpawn();
});

describe("ffmpeg-process: probeDurationSeconds", () => {
  it("parses duration from ffprobe JSON stdout", async () => {
    spawnHandle = mockSpawn([
      {
        stdout: JSON.stringify({
          format: { duration: "1.044898" },
        }),
      },
    ]);

    const seconds = await probeDurationSeconds(FIXTURE_1S);
    expect(seconds).toBeGreaterThan(0.9);
    expect(seconds).toBeLessThan(1.1);
  });

  it("invokes ffprobe with argv only (no shell: true) and the input path as a discrete arg", async () => {
    spawnHandle = mockSpawn([
      { stdout: JSON.stringify({ format: { duration: "2.0" } }) },
    ]);

    await probeDurationSeconds(FIXTURE_2S);

    expect(spawnHandle.calls).toHaveLength(1);
    const [call] = spawnHandle.calls;
    expect(call.command).toMatch(/ffprobe/);
    expect(call.options?.shell).not.toBe(true);
    expect(call.args).toContain(FIXTURE_2S);
    // The input path must be passed as its own argv element, NEVER interpolated
    // into another string. If any single argv element contains both the path
    // and a flag like '-i', the utility is doing string interpolation.
    for (const arg of call.args) {
      if (arg === FIXTURE_2S) continue;
      expect(arg).not.toContain(FIXTURE_2S);
    }
  });

  it("rejects when ffprobe exits non-zero, surfacing stderr in the error", async () => {
    spawnHandle = mockSpawn([
      { exitCode: 1, stderr: "ffprobe: invalid data" },
    ]);

    await expect(probeDurationSeconds("/tmp/does-not-exist.mp3")).rejects.toThrow(
      /ffprobe.*invalid data|exit.*1/i,
    );
  });

  it("rejects with an actionable error when ffprobe binary is missing (ENOENT)", async () => {
    spawnHandle = mockSpawn([{ enoent: true }]);

    await expect(probeDurationSeconds(FIXTURE_1S)).rejects.toThrow(
      /ENOENT|ffprobe.*not.*found|not installed/i,
    );
  });
});

describe("ffmpeg-process: concatMp3Files", () => {
  it("invokes ffmpeg with argv only and never passes shell: true", async () => {
    spawnHandle = mockSpawn([{ exitCode: 0 }]);

    await concatMp3Files([FIXTURE_1S, FIXTURE_2S], "/tmp/out.mp3");

    expect(spawnHandle.calls.length).toBeGreaterThanOrEqual(1);
    for (const call of spawnHandle.calls) {
      expect(call.command).toMatch(/ffmpeg/);
      expect(call.options?.shell).not.toBe(true);
    }
  });

  it("passes every input path as a discrete argv element (no shell interpolation)", async () => {
    spawnHandle = mockSpawn([{ exitCode: 0 }]);

    await concatMp3Files([FIXTURE_1S, FIXTURE_2S], "/tmp/out.mp3");

    const lastCall = spawnHandle.calls.at(-1)!;
    // The output path and at least one input path must each appear as their
    // own argv element, not concatenated into a single quoted string.
    const flattened = lastCall.args.join("\u0000");
    expect(flattened).toContain(FIXTURE_1S);
    expect(flattened).toContain(FIXTURE_2S);
    expect(flattened).toContain("/tmp/out.mp3");
    // None of the args should look like a shell-quoted aggregate (multiple
    // paths joined by spaces inside a single arg).
    for (const arg of lastCall.args) {
      const inputsInThisArg = [FIXTURE_1S, FIXTURE_2S].filter((p) =>
        arg.includes(p),
      );
      expect(inputsInThisArg.length).toBeLessThanOrEqual(1);
    }
  });

  it("handles input and output paths that contain spaces without quoting", async () => {
    spawnHandle = mockSpawn([{ exitCode: 0 }]);

    const spacedInput = "/tmp/dir with spaces/clip 1.mp3";
    const spacedOutput = "/tmp/another dir/final mix.mp3";
    await concatMp3Files([spacedInput, FIXTURE_1S], spacedOutput);

    const lastCall = spawnHandle.calls.at(-1)!;
    // Paths with spaces must be passed as their own raw argv elements, with
    // no surrounding quote characters added by the utility (spawn handles
    // argument quoting at the OS level when shell: false).
    expect(lastCall.args).toContain(spacedInput);
    expect(lastCall.args).toContain(spacedOutput);
    for (const arg of lastCall.args) {
      expect(arg.startsWith('"')).toBe(false);
      expect(arg.endsWith('"')).toBe(false);
      expect(arg.startsWith("'")).toBe(false);
      expect(arg.endsWith("'")).toBe(false);
    }
  });

  it("rejects when ffmpeg exits non-zero", async () => {
    spawnHandle = mockSpawn([
      { exitCode: 2, stderr: "ffmpeg: concat failed" },
    ]);

    await expect(
      concatMp3Files([FIXTURE_1S, FIXTURE_2S], "/tmp/out.mp3"),
    ).rejects.toThrow(/ffmpeg.*concat failed|exit.*2/i);
  });

  it("rejects with an actionable error when ffmpeg binary is missing (ENOENT)", async () => {
    spawnHandle = mockSpawn([{ enoent: true }]);

    await expect(
      concatMp3Files([FIXTURE_1S, FIXTURE_2S], "/tmp/out.mp3"),
    ).rejects.toThrow(/ENOENT|ffmpeg.*not.*found|not installed/i);
  });

  it("cleans up any intermediate concat-list file it creates before resolving", async () => {
    spawnHandle = mockSpawn([{ exitCode: 0 }]);

    await concatMp3Files([FIXTURE_1S, FIXTURE_2S], "/tmp/out.mp3");

    // If the utility writes a concat list file (the documented ffmpeg
    // `-f concat -safe 0 -i list.txt` strategy), that file MUST be deleted
    // before the promise resolves. The contract: after resolve, no temporary
    // concat-list paths referenced in the spawn argv may still exist on disk.
    const fs = await import("node:fs");
    for (const call of spawnHandle.calls) {
      for (const arg of call.args) {
        // Recognise plausible concat-list temp paths: any arg that ends in
        // .txt or contains "concat" and looks like a temp path.
        const looksLikeConcatList =
          (arg.endsWith(".txt") || arg.includes("concat")) &&
          (arg.includes("/tmp") || arg.includes("/var/folders"));
        if (!looksLikeConcatList) continue;
        expect(
          fs.existsSync(arg),
          `intermediate concat-list file '${arg}' must be cleaned up before resolve`,
        ).toBe(false);
      }
    }
  });
});

describe("ffmpeg-process: architecture guardrails (test-strategy.md §4)", () => {
  it("probeDurationSeconds never passes shell: true to spawn", async () => {
    spawnHandle = mockSpawn([
      { stdout: JSON.stringify({ format: { duration: "1.0" } }) },
    ]);

    await probeDurationSeconds(FIXTURE_1S);

    for (const call of spawnHandle.calls) {
      expect(call.options?.shell).not.toBe(true);
    }
  });

  it("concatMp3Files never passes shell: true to spawn", async () => {
    spawnHandle = mockSpawn([{ exitCode: 0 }]);

    await concatMp3Files([FIXTURE_1S], "/tmp/out.mp3");

    for (const call of spawnHandle.calls) {
      expect(call.options?.shell).not.toBe(true);
    }
  });
});
