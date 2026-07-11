import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import { tutorialCheckResultSchema, tutorialManifestSchema, type TutorialCheckResult, type TutorialManifest } from "./contracts.js";

/** Injected filesystem and command ports for deterministic tutorial checks. */
export type TutorialCheckerPorts = {
  readAllowedFile(filePath: string): Promise<string>;
  runAllowedCommand(executable: "git" | "node" | "pnpm", args: string[]): Promise<string>;
  now(): string;
};

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

/**
 * Runs one authored tutorial step and emits only secret-free structured evidence.
 * @param manifestInput Untrusted repository manifest.
 * @param stepId Authored step to check.
 * @param ports Allowlisted filesystem, command, and clock adapters.
 * @returns Deterministic per-check pass state and evidence digests.
 */
export async function runTutorialStep(manifestInput: unknown, stepId: string, ports: TutorialCheckerPorts): Promise<TutorialCheckResult> {
  const manifest = tutorialManifestSchema.parse(manifestInput);
  const step = manifest.steps.find((candidate) => candidate.stepId === stepId);
  if (!step) throw new Error(`Tutorial step not found: ${stepId}`);
  const commandById = new Map(manifest.allowedCommands.map((command) => [command.commandId, command]));
  const checks = [];
  for (const check of step.checks) {
    const output = check.kind === "file_contains"
      ? await ports.readAllowedFile(check.filePath)
      : await ports.runAllowedCommand(commandById.get(check.commandId)!.executable, commandById.get(check.commandId)!.args);
    checks.push({ checkId: check.checkId, passed: output.includes(check.expected), evidenceDigest: digest(output) });
  }
  return tutorialCheckResultSchema.parse({
    schemaVersion: "activity-tutorial-result.v1", repositoryId: manifest.repositoryId,
    activityId: manifest.activityId, stepId, passed: checks.every(({ passed }) => passed),
    checkedAt: ports.now(), checks,
  });
}

/**
 * Creates Node.js checker ports restricted to manifest allowlists and repository root.
 * @param root Repository root directory.
 * @param manifest Validated tutorial manifest.
 * @param now Server-independent clock used in structured output.
 * @returns Safe local filesystem and `execFile` adapters.
 */
export function createNodeTutorialCheckerPorts(root: string, manifest: TutorialManifest, now: () => string = () => new Date().toISOString()): TutorialCheckerPorts {
  const allowedFiles = new Set(manifest.allowedFiles);
  const allowedCommands = new Set(manifest.allowedCommands.map(({ executable, args }) => JSON.stringify([executable, args])));
  return {
    async readAllowedFile(filePath) {
      if (!allowedFiles.has(filePath)) throw new Error(`File is not allowlisted: ${filePath}`);
      const rootPath = await realpath(root);
      const target = await realpath(resolve(root, filePath));
      if (target !== rootPath && !target.startsWith(`${rootPath}${sep}`)) throw new Error(`File escapes repository root: ${filePath}`);
      return readFile(target, "utf8");
    },
    async runAllowedCommand(executable, args) {
      if (!allowedCommands.has(JSON.stringify([executable, args]))) throw new Error(`Command is not allowlisted: ${executable}`);
      const result = await promisify(execFile)(executable, args, { cwd: root, timeout: 30_000, maxBuffer: 1024 * 1024, windowsHide: true });
      return result.stdout;
    },
    now,
  };
}
