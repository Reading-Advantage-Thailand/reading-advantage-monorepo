import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import ts from "typescript";
import { tutorialCheckResultSchema, tutorialManifestSchema, type TutorialCheckResult, type TutorialManifest } from "./contracts.js";

/** Injected filesystem and command ports for deterministic tutorial checks. */
export type TutorialCheckerPorts = {
  /** @param filePath Allowlisted repository-relative path. @returns UTF-8 file content retained locally. */
  readAllowedFile(filePath: string): Promise<string>;
  /** @param profile Fixed host-owned command profile. @returns Local command output retained by the checker. */
  runAllowedCommand(profile: "git-status-porcelain"): Promise<string>;
  /** @returns Current ISO timestamp for deterministic result metadata. */
  now(): string;
};

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isParenthesizedExpression(expression)) return unwrapExpression(expression.expression);
  return expression;
}

function propertyName(node: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return undefined;
}

function hasNonEmptyLiteralValue(expression: ts.Expression): boolean {
  const value = unwrapExpression(expression);
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text.trim().length > 0;
  if (ts.isNumericLiteral(value) || value.kind === ts.SyntaxKind.TrueKeyword || value.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isArrayLiteralExpression(value)) return value.elements.length > 0;
  if (ts.isObjectLiteralExpression(value)) return value.properties.length > 0;
  return false;
}

function verifiesTypescriptObjectShape(source: string, exportName: string, requiredProperties: string[]): boolean {
  const file = ts.createSourceFile("tutorial.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement) || !statement.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName || !declaration.initializer) continue;
      const initializer = unwrapExpression(declaration.initializer);
      if (!ts.isObjectLiteralExpression(initializer)) return false;
      const properties = new Map<string, ts.Expression>();
      for (const property of initializer.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = propertyName(property.name);
        if (name) properties.set(name, property.initializer);
      }
      return requiredProperties.every((name) => {
        const value = properties.get(name);
        return value !== undefined && hasNonEmptyLiteralValue(value);
      });
    }
  }
  return false;
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
    const output = check.kind === "command" ? await ports.runAllowedCommand(commandById.get(check.commandId)!.profile) : await ports.readAllowedFile(check.filePath);
    const passed = check.kind === "file_contains"
      ? output.includes(check.expected)
      : check.kind === "typescript_object_shape"
        ? verifiesTypescriptObjectShape(output, check.exportName, check.requiredProperties)
        : check.expected === "clean" ? output.trim() === "" : output.split("\n").some((line) => line[0] !== " " && line[0] !== "?" && line.slice(3) === check.expected.slice("staged:".length));
    checks.push({ checkId: check.checkId, passed, evidenceDigest: digest(JSON.stringify({ checkId: check.checkId, passed })) });
  }
  const evidenceDigest = digest(JSON.stringify({ repositoryId: manifest.repositoryId, activityId: manifest.activityId, stepId, checks }));
  return tutorialCheckResultSchema.parse({
    schemaVersion: "activity-tutorial-result.v1", repositoryId: manifest.repositoryId,
    activityId: manifest.activityId, stepId, passed: checks.every(({ passed }) => passed),
    checkedAt: ports.now(), evidenceDigest, checks,
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
  const allowedCommands = new Set(manifest.allowedCommands.map(({ profile }) => profile));
  return {
    async readAllowedFile(filePath) {
      if (!allowedFiles.has(filePath)) throw new Error(`File is not allowlisted: ${filePath}`);
      const rootPath = await realpath(root);
      const target = await realpath(resolve(root, filePath));
      if (target !== rootPath && !target.startsWith(`${rootPath}${sep}`)) throw new Error(`File escapes repository root: ${filePath}`);
      return readFile(target, "utf8");
    },
    async runAllowedCommand(profile) {
      if (!allowedCommands.has(profile)) throw new Error(`Command profile is not allowlisted: ${profile}`);
      const result = await promisify(execFile)("git", ["-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-c", "submodule.recurse=false", "status", "--porcelain=v1", "--untracked-files=all"], { cwd: root, timeout: 10_000, maxBuffer: 256 * 1024, windowsHide: true, env: { PATH: process.env.PATH ?? "" } });
      return result.stdout;
    },
    now,
  };
}
