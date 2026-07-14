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

type TypescriptPropertyContract = Extract<TutorialManifest["steps"][number]["checks"][number], { kind: "typescript_object_shape" }>["propertyContracts"][number];
type TypescriptFunctionCheck = Extract<TutorialManifest["steps"][number]["checks"][number], { kind: "typescript_function_contract" }>;

function stringLiteralValue(expression: ts.Expression): string | undefined {
  const value = unwrapExpression(expression);
  return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) ? value.text : undefined;
}

function verifiesPropertyContract(expression: ts.Expression, contract: TypescriptPropertyContract): boolean {
  if (contract.kind === "string") {
    const value = stringLiteralValue(expression);
    if (!value?.trim()) return false;
    if (contract.format === "semver" && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) return false;
    return !contract.allowedValues || contract.allowedValues.includes(value);
  }
  const value = unwrapExpression(expression);
  if (contract.kind === "number") {
    if (!ts.isNumericLiteral(value)) return false;
    const number = Number(value.text);
    return Number.isFinite(number) && (!contract.integer || Number.isInteger(number)) && (contract.min === undefined || number >= contract.min);
  }
  if (contract.kind === "boolean") return value.kind === ts.SyntaxKind.TrueKeyword || value.kind === ts.SyntaxKind.FalseKeyword;
  if (!ts.isArrayLiteralExpression(value) || value.elements.length < contract.minItems) return false;
  return value.elements.every((element) => {
    const item = stringLiteralValue(element as ts.Expression);
    return item !== undefined && item.trim().length > 0;
  });
}

function verifiesTypescriptObjectShape(source: string, exportName: string, contracts: TypescriptPropertyContract[]): boolean {
  const file = ts.createSourceFile("tutorial.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const parseDiagnostics = (file as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) return false;
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
      return contracts.every((contract) => {
        const value = properties.get(contract.property);
        return value !== undefined && verifiesPropertyContract(value, contract);
      });
    }
  }
  return false;
}

function returnedObject(expression: ts.ConciseBody): ts.ObjectLiteralExpression | undefined {
  if (ts.isObjectLiteralExpression(unwrapExpression(expression as ts.Expression))) return unwrapExpression(expression as ts.Expression) as ts.ObjectLiteralExpression;
  if (!ts.isBlock(expression)) return undefined;
  const returned = expression.statements.find(ts.isReturnStatement)?.expression;
  if (!returned) return undefined;
  const value = unwrapExpression(returned);
  return ts.isObjectLiteralExpression(value) ? value : undefined;
}

function verifiesTypescriptFunctionContract(source: string, check: TypescriptFunctionCheck): boolean {
  const file = ts.createSourceFile("tutorial.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const parseDiagnostics = (file as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) return false;
  let parameters: readonly ts.ParameterDeclaration[] | undefined;
  let body: ts.ConciseBody | undefined;
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === check.exportName && statement.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword) && statement.body) {
      parameters = statement.parameters;
      body = statement.body;
    }
    if (ts.isVariableStatement(statement) && statement.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword)) {
      const declaration = statement.declarationList.declarations.find((candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === check.exportName);
      const initializer = declaration?.initializer && unwrapExpression(declaration.initializer);
      if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
        parameters = initializer.parameters;
        body = initializer.body;
      }
    }
  }
  if (!parameters || !body || parameters.length !== check.parameters.length) return false;
  const names = parameters.map(({ name }) => ts.isIdentifier(name) ? name.text : "");
  if (!check.parameters.every((parameter, index) => names[index] === parameter)) return false;
  const returned = returnedObject(body);
  if (!returned) return false;
  const properties = new Map<string, ts.Expression>();
  for (const property of returned.properties) {
    if (ts.isPropertyAssignment(property)) {
      const name = propertyName(property.name);
      if (name) properties.set(name, unwrapExpression(property.initializer));
    } else if (ts.isShorthandPropertyAssignment(property)) properties.set(property.name.text, property.name);
  }
  return check.returnContracts.every((contract) => {
    const value = properties.get(contract.property);
    if (!value) return false;
    if (contract.kind === "parameter") return ts.isIdentifier(value) && value.text === contract.parameter;
    return ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && ts.isIdentifier(value.left) && value.left.text === contract.leftParameter && ts.isIdentifier(value.right) && value.right.text === contract.rightParameter;
  });
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
        ? verifiesTypescriptObjectShape(output, check.exportName, check.propertyContracts)
        : check.kind === "typescript_function_contract"
          ? verifiesTypescriptFunctionContract(output, check)
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
