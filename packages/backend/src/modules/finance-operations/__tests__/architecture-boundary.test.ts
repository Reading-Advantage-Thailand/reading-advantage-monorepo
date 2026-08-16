import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const moduleDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));
const foundationFileNames = [
  "contracts.ts",
  "authorization.ts",
  "audit.ts",
  "money.ts",
  "records.ts",
  "ports.ts",
  "port-contracts.ts",
  "controlled-imports.ts",
  "thb-valuation.ts",
  "index.ts",
] as const;
const foundationFilePaths = new Set(
  foundationFileNames.map((fileName) => resolve(moduleDirectory, fileName)),
);
const allowedFoundationExternalImportBindings = new Map<
  string,
  ReadonlySet<string>
>([
  ["zod", new Set(["z"])],
  ["node:util", new Set(["types"])],
]);
const foundationFileNamesToScan = foundationFileNames.filter(
  (fileName) =>
    fileName !== "controlled-imports.ts" ||
    existsSync(resolve(moduleDirectory, fileName)),
);
const financeTask3CompanyIdentityFiles = [
  resolve(moduleDirectory, "../company-identity/finance-attestation.ts"),
  resolve(
    moduleDirectory,
    "../company-identity/__tests__/postgres-finance-task3-security-review-v2.red.test.ts",
  ),
] as const;
const financeTask3AttestationPath = financeTask3CompanyIdentityFiles[0];
const financeTask3ReviewTestPath = financeTask3CompanyIdentityFiles[1];
const financeTask3CompanyIdentityBarrelPath = resolve(
  moduleDirectory,
  "../company-identity/index.ts",
);
type FinanceTask3ImportPolicy = {
  allowedExternalModules: ReadonlyMap<string, ReadonlySet<string>>;
  allowedLocalModules: ReadonlyMap<string, ReadonlySet<string>>;
};
const financeTask3ImportPolicies = new Map<string, FinanceTask3ImportPolicy>([
  [
    financeTask3AttestationPath,
    {
      allowedExternalModules: new Map([["zod", new Set(["z"])]]),
      allowedLocalModules: new Map([
        [
          resolve(moduleDirectory, "../company-identity/protocol.ts"),
          new Set(["projectSecretSafeAuditMetadata"]),
        ],
      ]),
    },
  ],
  [
    financeTask3ReviewTestPath,
    {
      allowedExternalModules: new Map([
        ["node:crypto", new Set(["randomUUID"])],
        ["postgres", new Set(["default:postgres"])],
        ["vitest", new Set(["describe", "expect", "it"])],
      ]),
      allowedLocalModules: new Map([
        [
          financeTask3AttestationPath,
          new Set([
            "createCompanyIdentityFinanceAttestationAuditPort",
            "createFinanceCompanyIdentityAttestor",
          ]),
        ],
        [
          resolve(
            moduleDirectory,
            "../company-identity/postgres-repository.ts",
          ),
          new Set(["createPostgresCompanyIdentityRepository"]),
        ],
        [
          resolve(moduleDirectory, "../company-identity/repository.ts"),
          new Set(["IdentityAuditInput"]),
        ],
        [
          resolve(
            moduleDirectory,
            "../company-identity/__tests__/postgres-task3-test-support.ts",
          ),
          new Set([
            "ensureOneActiveInternalCompany",
            "migrateCompanyIdentityWithLock",
          ]),
        ],
      ]),
    },
  ],
]);

/**
 * Classifies an import specifier against the Finance Operations foundation boundary.
 * @param specifier Module specifier found in a foundation source file.
 * @param importingFile Absolute path of the file that contains the import.
 * @returns A policy-violation message, or undefined when the specifier is allowed.
 */
function classifyImportSpecifier(
  specifier: string,
  importingFile: string,
): string | undefined {
  if (specifier === "zod") {
    return undefined;
  }
  if (specifier === "node:util") {
    return undefined;
  }

  if (!specifier.startsWith(".")) {
    if (specifier === "@reading-advantage/db") {
      return `forbidden database package import: ${specifier}`;
    }
    if (specifier.startsWith("@reading-advantage/")) {
      return `forbidden cross-package import: ${specifier}`;
    }
    if (specifier.startsWith("node:") || specifier === "fs") {
      return `forbidden filesystem, network, process, or environment import: ${specifier}`;
    }
    if (specifier.startsWith("/")) {
      return `forbidden absolute import: ${specifier}`;
    }
    return `forbidden provider or package import: ${specifier}`;
  }

  if (
    specifier === "../../jobs/contracts.js" ||
    specifier === "../../jobs/ports.js"
  ) {
    return undefined;
  }

  const target = resolve(dirname(importingFile), specifier);
  const pathFromModule = relative(moduleDirectory, target);
  if (
    pathFromModule === ".." ||
    pathFromModule.startsWith(`..${sep}`) ||
    isAbsolute(pathFromModule)
  ) {
    return `relative import escapes Finance Operations: ${specifier}`;
  }

  const sourceTarget = target.replace(/\.m?js$/u, ".ts");
  if (!foundationFilePaths.has(sourceTarget)) {
    return `relative import leaves the reviewed foundation: ${specifier}`;
  }

  return undefined;
}

/**
 * Collects import and runtime-boundary violations from one TypeScript source string.
 * @param fileName Absolute or illustrative path used to resolve relative imports.
 * @param sourceText TypeScript source to inspect without executing it.
 * @returns All policy violations found in the source.
 */
function collectBoundaryViolations(
  fileName: string,
  sourceText: string,
): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations: string[] = [];

  const inspectModuleSpecifier = (moduleSpecifier: ts.Expression): void => {
    if (!ts.isStringLiteral(moduleSpecifier)) {
      violations.push("module import must use a static string specifier");
      return;
    }
    const violation = classifyImportSpecifier(moduleSpecifier.text, fileName);
    if (violation !== undefined) {
      violations.push(violation);
    }
  };

  const inspectExternalImportBindings = (node: ts.ImportDeclaration): void => {
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const allowedBindings = allowedFoundationExternalImportBindings.get(
      node.moduleSpecifier.text,
    );
    if (allowedBindings === undefined) return;

    const importClause = node.importClause;
    if (importClause === undefined) {
      violations.push(
        `external import must name an approved binding: ${node.moduleSpecifier.text}`,
      );
      return;
    }
    if (importClause.name !== undefined) {
      violations.push(
        `unapproved external default binding: ${importClause.name.text}`,
      );
    }
    const namedBindings = importClause.namedBindings;
    if (namedBindings === undefined) {
      violations.push(
        `external import must name an approved binding: ${node.moduleSpecifier.text}`,
      );
      return;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      violations.push(
        `unapproved external namespace binding: ${namedBindings.name.text}`,
      );
      return;
    }
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (!allowedBindings.has(importedName)) {
        violations.push(
          `unapproved external binding: ${importedName} as ${element.name.text}`,
        );
      }
    }
  };

  const inspectExternalExportBindings = (node: ts.ExportDeclaration): void => {
    const moduleSpecifier = node.moduleSpecifier;
    if (moduleSpecifier === undefined || !ts.isStringLiteral(moduleSpecifier)) {
      return;
    }
    const allowedBindings = allowedFoundationExternalImportBindings.get(
      moduleSpecifier.text,
    );
    if (allowedBindings === undefined) return;

    if (node.exportClause === undefined) {
      violations.push(
        `forbidden export-all from approved external module: ${moduleSpecifier.text}`,
      );
      return;
    }
    if (!ts.isNamedExports(node.exportClause)) {
      violations.push(
        `forbidden namespace export from approved external module: ${moduleSpecifier.text}`,
      );
      return;
    }
    for (const element of node.exportClause.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (!allowedBindings.has(importedName)) {
        violations.push(
          `unapproved external export binding: ${importedName} as ${element.name.text}`,
        );
      }
    }
  };

  const isGlobalThisRequireAccess = (node: ts.Node): boolean => {
    if (ts.isPropertyAccessExpression(node)) {
      return (
        node.expression.getText(sourceFile) === "globalThis" &&
        node.name.text === "require"
      );
    }
    if (ts.isElementAccessExpression(node)) {
      return (
        node.expression.getText(sourceFile) === "globalThis" &&
        ts.isStringLiteralLike(node.argumentExpression) &&
        node.argumentExpression.text === "require"
      );
    }
    return false;
  };

  const isReflectRequireAccess = (node: ts.CallExpression): boolean => {
    if (
      !ts.isPropertyAccessExpression(node.expression) ||
      node.expression.expression.getText(sourceFile) !== "Reflect" ||
      node.expression.name.text !== "get" ||
      node.arguments.length !== 2
    ) {
      return false;
    }
    const [target, property] = node.arguments;
    return (
      target?.getText(sourceFile) === "globalThis" &&
      property !== undefined &&
      ts.isStringLiteralLike(property) &&
      property.text === "require"
    );
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportEqualsDeclaration(node)) {
      violations.push("forbidden ImportEqualsDeclaration");
    }

    if (ts.isImportDeclaration(node)) {
      inspectModuleSpecifier(node.moduleSpecifier);
      inspectExternalImportBindings(node);
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      inspectModuleSpecifier(node.moduleSpecifier);
      inspectExternalExportBindings(node);
    }

    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression !== undefined
    ) {
      inspectModuleSpecifier(node.moduleReference.expression);
    }

    if (isGlobalThisRequireAccess(node)) {
      violations.push("forbidden runtime loader property: globalThis.require");
    }

    if (ts.isCallExpression(node)) {
      if (isReflectRequireAccess(node)) {
        violations.push(
          "forbidden runtime loader property access through Reflect",
        );
      }
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        violations.push(
          "forbidden dynamic import in the Finance Operations boundary",
        );
        const moduleSpecifier = node.arguments[0];
        if (moduleSpecifier === undefined) {
          violations.push("dynamic import must declare a module specifier");
        } else {
          inspectModuleSpecifier(moduleSpecifier);
        }
      }

      if (ts.isIdentifier(node.expression)) {
        if (node.expression.text === "require") {
          violations.push("forbidden runtime module loading through require");
        }
        if (node.expression.text === "fetch") {
          violations.push("forbidden network access through fetch");
        }
      }
    }

    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      if (
        node.expression.text === "XMLHttpRequest" ||
        node.expression.text === "WebSocket"
      ) {
        violations.push(
          `forbidden network access through ${node.expression.text}`,
        );
      }
    }

    if (ts.isPropertyAccessExpression(node)) {
      const access = node.getText(sourceFile);
      if (
        access.startsWith("process.") ||
        access === "globalThis.process" ||
        access.startsWith("globalThis.process.") ||
        access === "globalThis.fetch" ||
        access.startsWith("globalThis.fetch.") ||
        access === "Deno.env" ||
        access.startsWith("Deno.env.") ||
        access === "Bun.env" ||
        access.startsWith("Bun.env.") ||
        access === "Deno.readFile" ||
        access.startsWith("Deno.readFile.") ||
        access === "Bun.file" ||
        access.startsWith("Bun.file.")
      ) {
        violations.push(`forbidden runtime access: ${access}`);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

/**
 * Collects exact Task 3 Company Identity imports that bypass the portable Finance boundary.
 * @param fileName Absolute path of the reviewed Task 3 source or test.
 * @param sourceText TypeScript source to inspect without executing it.
 * @returns Exact database or public-barrel boundary violations.
 */
function collectFinanceTask3CompanyIdentityViolations(
  fileName: string,
  sourceText: string,
): string[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations: string[] = [];
  const policy = financeTask3ImportPolicies.get(resolve(fileName));
  if (policy === undefined) {
    return ["Task 3 guard received an unreviewed Company Identity file"];
  }

  const isFile = (candidate: string): boolean => {
    try {
      return statSync(candidate).isFile();
    } catch {
      return false;
    }
  };
  const canonicalizeLocalSpecifier = (
    specifier: string,
  ): string | undefined => {
    if (!specifier.startsWith(".")) {
      return undefined;
    }

    const rawTarget = resolve(dirname(fileName), specifier);
    const candidates = [
      rawTarget,
      rawTarget.replace(/\.(?:m?js|cjs)$/u, ".ts"),
      rawTarget.replace(/\.(?:m?js|cjs)$/u, ".tsx"),
      `${rawTarget}.ts`,
      `${rawTarget}.tsx`,
      `${rawTarget}.js`,
      resolve(rawTarget, "index.ts"),
      resolve(rawTarget, "index.tsx"),
      resolve(rawTarget, "index.js"),
    ];
    const existing = candidates.find(isFile);
    return existing?.replace(/\.(?:m?js|cjs)$/u, ".ts");
  };

  const inspectModuleSpecifier = (specifierNode: ts.Expression): void => {
    if (!ts.isStringLiteralLike(specifierNode)) {
      violations.push(
        "Task 3 module import must use a static string specifier",
      );
      return;
    }

    const specifier = specifierNode.text;
    if (
      specifier === "@reading-advantage/db" ||
      specifier.startsWith("@reading-advantage/db/")
    ) {
      violations.push(
        `Task 3 Finance source must not import any database package path: ${specifier}`,
      );
      return;
    }

    if (!specifier.startsWith(".")) {
      if (specifier === "node:module") {
        violations.push(
          "forbidden runtime module loading through node:module import",
        );
        return;
      }
      if (!policy.allowedExternalModules.has(specifier)) {
        violations.push(
          `Task 3 external module is not in the per-file allowlist: ${specifier}`,
        );
      }
      return;
    }

    const canonicalTarget = canonicalizeLocalSpecifier(specifier);
    if (canonicalTarget === financeTask3CompanyIdentityBarrelPath) {
      violations.push(
        `Task 3 Finance source must not import the Company Identity public barrel: ${specifier}`,
      );
      return;
    }
    if (canonicalTarget === undefined) {
      violations.push(
        `Task 3 relative module cannot be resolved for the boundary allowlist: ${specifier}`,
      );
      return;
    }
    if (!policy.allowedLocalModules.has(canonicalTarget)) {
      violations.push(
        `Task 3 local module is not in the per-file allowlist: ${specifier}`,
      );
    }
  };

  const allowedBindingsForSpecifier = (
    specifierNode: ts.Expression,
  ): ReadonlySet<string> | undefined => {
    if (!ts.isStringLiteralLike(specifierNode)) {
      return undefined;
    }
    if (specifierNode.text.startsWith(".")) {
      const canonicalTarget = canonicalizeLocalSpecifier(specifierNode.text);
      return canonicalTarget === undefined
        ? undefined
        : policy.allowedLocalModules.get(canonicalTarget);
    }
    return policy.allowedExternalModules.get(specifierNode.text);
  };

  const inspectImportBindings = (node: ts.ImportDeclaration): void => {
    const importClause = node.importClause;
    if (importClause === undefined) {
      return;
    }
    const allowedBindings = allowedBindingsForSpecifier(node.moduleSpecifier);
    if (allowedBindings === undefined) {
      return;
    }
    if (
      importClause.name !== undefined &&
      !allowedBindings.has(`default:${importClause.name.text}`)
    ) {
      violations.push(
        `Task 3 import has an unapproved default binding: ${importClause.name.text}`,
      );
    }
    const namedBindings = importClause.namedBindings;
    if (namedBindings === undefined) {
      return;
    }
    if (ts.isNamespaceImport(namedBindings)) {
      violations.push(
        `Task 3 import has an unapproved namespace binding: ${namedBindings.name.text}`,
      );
      return;
    }
    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (
        importedName !== element.name.text ||
        !allowedBindings.has(importedName)
      ) {
        violations.push(
          `Task 3 import has an unapproved binding: ${importedName} as ${element.name.text}`,
        );
      }
    }
  };

  const inspectExportBindings = (node: ts.ExportDeclaration): void => {
    if (node.moduleSpecifier === undefined) {
      return;
    }
    const allowedBindings = allowedBindingsForSpecifier(node.moduleSpecifier);
    if (allowedBindings === undefined) {
      return;
    }
    if (node.exportClause === undefined) {
      violations.push("Task 3 export has an unapproved namespace binding: *");
      return;
    }
    if (!ts.isNamedExports(node.exportClause)) {
      violations.push("Task 3 export has an unapproved namespace binding");
      return;
    }
    for (const element of node.exportClause.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (
        importedName !== element.name.text ||
        !allowedBindings.has(importedName)
      ) {
        violations.push(
          `Task 3 export has an unapproved binding: ${importedName} as ${element.name.text}`,
        );
      }
    }
  };

  const resolvedFileName = resolve(fileName);
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    noLib: true,
    noResolve: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.Latest,
  };
  const compilerHost = ts.createCompilerHost(compilerOptions, true);
  compilerHost.getSourceFile = (
    requestedFileName,
    _languageVersion,
    _onError,
    _shouldCreateNewSourceFile,
  ) =>
    resolve(requestedFileName) === resolvedFileName ? sourceFile : undefined;
  compilerHost.fileExists = (requestedFileName) =>
    resolve(requestedFileName) === resolvedFileName;
  compilerHost.readFile = (requestedFileName) =>
    resolve(requestedFileName) === resolvedFileName ? sourceText : undefined;
  const checker = ts
    .createProgram({
      host: compilerHost,
      options: compilerOptions,
      rootNames: [resolvedFileName],
    })
    .getTypeChecker();
  const loaderCapabilityNames = new Set([
    "createRequire",
    "global",
    "globalThis",
    "module",
    "process",
    "require",
  ]);

  const isPropertyName = (node: ts.Identifier): boolean => {
    const parent = node.parent;
    return (
      (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
      (ts.isQualifiedName(parent) && parent.right === node) ||
      (ts.isBindingElement(parent) && parent.propertyName === node) ||
      (ts.isPropertyAssignment(parent) && parent.name === node) ||
      (ts.isMethodDeclaration(parent) && parent.name === node) ||
      (ts.isMethodSignature(parent) && parent.name === node) ||
      (ts.isPropertyDeclaration(parent) && parent.name === node) ||
      (ts.isPropertySignature(parent) && parent.name === node)
    );
  };
  const isRuntimeEmittingDeclaration = (node: ts.Node): boolean => {
    if (
      ts.isTypeAliasDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeParameterDeclaration(node) ||
      ts.isImportTypeNode(node)
    ) {
      return false;
    }
    if (ts.isImportSpecifier(node)) {
      const namedImports = node.parent;
      const importClause = namedImports.parent;
      return !node.isTypeOnly && !importClause.isTypeOnly;
    }
    if (ts.isImportClause(node)) {
      return !node.isTypeOnly;
    }
    let current: ts.Node | undefined = node;
    while (current !== undefined) {
      const modifiers = ts.canHaveModifiers(current)
        ? ts.getModifiers(current)
        : undefined;
      if (
        modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword,
        )
      ) {
        return false;
      }
      current = current.parent;
    }
    return true;
  };

  const bindingContainsName = (
    binding: ts.BindingName,
    name: string,
  ): boolean => {
    if (ts.isIdentifier(binding)) {
      return binding.text === name;
    }
    return binding.elements.some(
      (element) =>
        ts.isBindingElement(element) && bindingContainsName(element.name, name),
    );
  };

  const declarationListContainsName = (
    declarationList: ts.VariableDeclarationList,
    name: string,
  ): boolean =>
    isRuntimeEmittingDeclaration(declarationList) &&
    declarationList.declarations.some((declaration) =>
      bindingContainsName(declaration.name, name),
    );

  const hasIntrinsicGlobalLexicalBinding = (node: ts.Identifier): boolean => {
    const name = node.text;
    if (name !== "global" && name !== "globalThis") {
      return false;
    }
    let current: ts.Node | undefined = node.parent;
    while (current !== undefined) {
      if (
        ts.isSourceFile(current) ||
        ts.isBlock(current) ||
        ts.isModuleBlock(current)
      ) {
        if (
          current.statements.some(
            (statement) =>
              ts.isVariableStatement(statement) &&
              isRuntimeEmittingDeclaration(statement) &&
              statement.declarationList.declarations.some((declaration) =>
                bindingContainsName(declaration.name, name),
              ),
          )
        ) {
          return true;
        }
      }
      if (
        ts.isFunctionLike(current) &&
        current.parameters.some((parameter) =>
          bindingContainsName(parameter.name, name),
        )
      ) {
        return true;
      }
      if (
        ts.isCatchClause(current) &&
        current.variableDeclaration !== undefined &&
        bindingContainsName(current.variableDeclaration.name, name)
      ) {
        return true;
      }
      if (ts.isForStatement(current)) {
        const initializer = current.initializer;
        if (
          initializer !== undefined &&
          ts.isVariableDeclarationList(initializer) &&
          declarationListContainsName(initializer, name)
        ) {
          return true;
        }
      }
      if (
        (ts.isForInStatement(current) || ts.isForOfStatement(current)) &&
        ts.isVariableDeclarationList(current.initializer) &&
        declarationListContainsName(current.initializer, name)
      ) {
        return true;
      }
      current = current.parent;
    }
    return false;
  };

  const hasLocalBinding = (node: ts.Identifier): boolean => {
    const symbol = checker.getSymbolAtLocation(node);
    return (
      (symbol?.declarations?.some(
        (declaration) =>
          resolve(declaration.getSourceFile().fileName) === resolvedFileName &&
          isRuntimeEmittingDeclaration(declaration),
      ) ??
        false) ||
      ((node.text === "global" || node.text === "globalThis") &&
        hasIntrinsicGlobalLexicalBinding(node))
    );
  };
  const inspectLoaderIdentifier = (node: ts.Identifier): void => {
    if (
      !loaderCapabilityNames.has(node.text) ||
      isPropertyName(node) ||
      hasLocalBinding(node)
    ) {
      return;
    }
    if (node.text === "process") {
      const parent = node.parent;
      if (
        (ts.isPropertyAccessExpression(parent) &&
          parent.expression === node &&
          parent.name.text === "env") ||
        (ts.isElementAccessExpression(parent) &&
          parent.expression === node &&
          ts.isStringLiteralLike(parent.argumentExpression) &&
          parent.argumentExpression.text === "env")
      ) {
        return;
      }
    }
    if (node.text === "require") {
      violations.push(
        "forbidden runtime module loading through require (unshadowed capability)",
      );
      return;
    }
    if (node.text === "createRequire") {
      violations.push(
        "forbidden runtime module loading through createRequire (unshadowed capability)",
      );
      return;
    }
    violations.push(
      `forbidden unshadowed Node loader capability: ${node.text}`,
    );
  };

  const inspectRuntimeArgument = (
    argument: ts.Expression | undefined,
  ): void => {
    if (argument === undefined) {
      violations.push(
        "Task 3 runtime module loader must declare a module specifier",
      );
      return;
    }
    inspectModuleSpecifier(argument);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      inspectLoaderIdentifier(node);
    }
    if (ts.isImportDeclaration(node)) {
      inspectModuleSpecifier(node.moduleSpecifier);
      inspectImportBindings(node);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      inspectModuleSpecifier(node.moduleSpecifier);
      inspectExportBindings(node);
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression !== undefined
    ) {
      violations.push("forbidden runtime module loading through import-equals");
      if (ts.isStringLiteralLike(node.moduleReference.expression)) {
        inspectModuleSpecifier(node.moduleReference.expression);
      } else {
        if (ts.isCallExpression(node.moduleReference.expression)) {
          inspectRuntimeArgument(node.moduleReference.expression.arguments[0]);
        } else {
          violations.push(
            "Task 3 module import must use a static string specifier",
          );
        }
      }
    }

    if (ts.isExportAssignment(node)) {
      violations.push(
        "forbidden CommonJS export assignment in the Task 3 boundary",
      );
    }

    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        violations.push("forbidden dynamic import in the Task 3 boundary");
        inspectRuntimeArgument(node.arguments[0]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...new Set(violations)];
}

describe("Finance Operations policy-neutral architecture boundary", () => {
  it("admits controlled imports as a reviewed foundation source", () => {
    expect(
      collectBoundaryViolations(
        resolve(moduleDirectory, "index.ts"),
        'export * from "./controlled-imports.js";',
      ),
    ).toEqual([]);
  });

  it("permits approved external imports and imports inside the foundation module", () => {
    const violations = foundationFileNamesToScan.flatMap((fileName) => {
      const filePath = resolve(moduleDirectory, fileName);
      return collectBoundaryViolations(
        filePath,
        readFileSync(filePath, "utf8"),
      ).map((violation) => `${fileName}: ${violation}`);
    });

    expect(violations).toEqual([]);
  });

  it("rejects unapproved Node utility bindings without widening runtime guards", () => {
    const counterexamples = [
      {
        source: 'import { promisify } from "node:util";',
        marker: "unapproved external binding: promisify as promisify",
      },
      {
        source: 'import * as util from "node:util";',
        marker: "unapproved external namespace binding: util",
      },
      {
        source: 'import { readFile } from "node:fs";',
        marker:
          "forbidden filesystem, network, process, or environment import: node:fs",
      },
    ];

    for (const counterexample of counterexamples) {
      expect(
        collectBoundaryViolations(
          resolve(moduleDirectory, "thb-valuation.ts"),
          counterexample.source,
        ),
        counterexample.source,
      ).toContain(counterexample.marker);
    }
  });

  it("rejects dynamic imports and external export allowlist bypasses", () => {
    const counterexamples = [
      {
        name: "dynamic node utility import",
        source: 'import("node:util");',
        marker: "forbidden dynamic import in the Finance Operations boundary",
      },
      {
        name: "dynamic approved package import",
        source: 'import("zod");',
        marker: "forbidden dynamic import in the Finance Operations boundary",
      },
      {
        name: "nonliteral dynamic approved import",
        source: [
          'const approvedModule = "node:util";',
          "import(approvedModule);",
        ].join("\n"),
        marker: "forbidden dynamic import in the Finance Operations boundary",
      },
      {
        name: "unapproved node utility export",
        source: 'export { promisify } from "node:util";',
        marker: "unapproved external export binding: promisify as promisify",
      },
      {
        name: "unapproved approved-package export",
        source: 'export { promisify } from "zod";',
        marker: "unapproved external export binding: promisify as promisify",
      },
      {
        name: "node utility export-all",
        source: 'export * from "node:util";',
        marker: "forbidden export-all from approved external module: node:util",
      },
      {
        name: "approved-package export-all",
        source: 'export * from "zod";',
        marker: "forbidden export-all from approved external module: zod",
      },
      {
        name: "node utility namespace export",
        source: 'export * as util from "node:util";',
        marker:
          "forbidden namespace export from approved external module: node:util",
      },
    ];

    for (const counterexample of counterexamples) {
      expect(
        collectBoundaryViolations(
          resolve(moduleDirectory, "thb-valuation.ts"),
          counterexample.source,
        ),
        counterexample.name,
      ).toContain(counterexample.marker);
    }
  });

  it("rejects database and provider imports in a compiler-parsed counterexample", () => {
    const counterexample = [
      'import { db } from "@reading-advantage/db";',
      'import Stripe from "stripe";',
      'import "./adapters/stripe.js";',
    ].join("\n");

    expect(
      collectBoundaryViolations(
        resolve(moduleDirectory, "counterexample.ts"),
        counterexample,
      ),
    ).toEqual(
      expect.arrayContaining([
        "forbidden database package import: @reading-advantage/db",
        "forbidden provider or package import: stripe",
        "relative import leaves the reviewed foundation: ./adapters/stripe.js",
      ]),
    );
  });

  it("rejects ImportEqualsDeclaration and property-based runtime loader aliases", () => {
    const counterexamples = [
      {
        name: "ImportEqualsDeclaration",
        source: "import legacy = foreignNamespace;",
        marker: "forbidden ImportEqualsDeclaration",
      },
      {
        name: "globalThis.require",
        source: 'globalThis.require("@reading-advantage/db");',
        marker: "forbidden runtime loader property: globalThis.require",
      },
      {
        name: "globalThis.require property alias",
        source: [
          "const load = globalThis.require;",
          'load("@reading-advantage/db");',
        ].join("\n"),
        marker: "forbidden runtime loader property: globalThis.require",
      },
      {
        name: "globalThis require property alias",
        source: [
          'const load = globalThis["require"];',
          'load("@reading-advantage/db");',
        ].join("\n"),
        marker: "forbidden runtime loader property: globalThis.require",
      },
      {
        name: "Reflect property loader alias",
        source: [
          'const load = Reflect.get(globalThis, "require");',
          'load("@reading-advantage/db");',
        ].join("\n"),
        marker: "forbidden runtime loader property access through Reflect",
      },
    ];

    const unhandledCounterexamples = counterexamples.flatMap(
      (counterexample) => {
        const violations = collectBoundaryViolations(
          resolve(moduleDirectory, "thb-valuation.ts"),
          counterexample.source,
        );
        return violations.some((violation) =>
          violation.includes(counterexample.marker),
        )
          ? []
          : [counterexample.name];
      },
    );

    expect(unhandledCounterexamples).toEqual([]);
  });

  it("fails closed for every reviewed Task 3 database and runtime-loader bypass", () => {
    const counterexamples = [
      {
        name: "database package root",
        source: 'import { db } from "@reading-advantage/db";',
        marker: "any database package path",
      },
      {
        name: "database package subpath",
        source: 'import { users } from "@reading-advantage/db/schema";',
        marker: "any database package path",
      },
      {
        name: "dedicated database subpath",
        source:
          'import { auditMetadataSchema } from "@reading-advantage/db/company-identity";',
        marker: "any database package path",
      },
      {
        name: "alternate relative public barrel",
        source: 'import { x } from ".././index.js";',
        marker: "Company Identity public barrel",
      },
      {
        name: "normalized relative public barrel",
        source: 'export * from "../__tests__/../index.js";',
        marker: "Company Identity public barrel",
      },
      {
        name: "import equals runtime loader",
        source: 'import barrel = require("../index.js");',
        marker: "runtime module loading through import-equals",
      },
      {
        name: "dynamic import",
        source: 'import("../finance-attestation.js");',
        marker: "forbidden dynamic import",
      },
      {
        name: "nonliteral dynamic import",
        source:
          'const moduleName = "../finance-attestation.js"; import(moduleName);',
        marker: "static string specifier",
      },
      {
        name: "direct require",
        source: 'require("../index.js");',
        marker: "runtime module loading through require",
      },
      {
        name: "process builtin module loader",
        source:
          'process.getBuiltinModule("node:module").createRequire(import.meta.url)("@reading-advantage/db/company-identity");',
        marker: "unshadowed Node loader capability: process",
      },
      {
        name: "assignment alias of process loader",
        source: [
          "const getBuiltinModule = process.getBuiltinModule;",
          'const createRequire = getBuiltinModule("node:module").createRequire;',
          'createRequire(import.meta.url)("@reading-advantage/db/company-identity");',
        ].join("\n"),
        marker: "unshadowed Node loader capability: process",
      },
      {
        name: "require call alias",
        source:
          'require.call(undefined, "@reading-advantage/db/company-identity");',
        marker: "runtime module loading through require",
      },
      {
        name: "destructured global require",
        source: [
          "const { require: load } = globalThis;",
          'load("@reading-advantage/db/company-identity");',
        ].join("\n"),
        marker: "unshadowed Node loader capability: globalThis",
      },
      {
        name: "createRequire",
        source: [
          'import { createRequire } from "node:module";',
          "const req = createRequire(import.meta.url);",
          'req("../index.js");',
        ].join("\n"),
        marker: "runtime module loading through node:module import",
      },
      {
        name: "require alias",
        source: ["const req = require;", 'req("../index.js");'].join("\n"),
        marker: "runtime module loading through require",
      },
      {
        name: "global require alias",
        source: ["const req = globalThis.require;", 'req("../index.js");'].join(
          "\n",
        ),
        marker: "unshadowed Node loader capability: globalThis",
      },
      {
        name: "createRequire alias",
        source: [
          'import { createRequire as makeLoader } from "node:module";',
          "const make = makeLoader;",
          "const req = make(import.meta.url);",
          'req("../index.js");',
        ].join("\n"),
        marker: "runtime module loading through node:module import",
      },
      {
        name: "wrong local module for the review file",
        source: 'import { x } from "../protocol.js";',
        marker: "not in the per-file allowlist",
      },
      {
        name: "unapproved Vitest loader binding",
        source: [
          'import { vi } from "vitest";',
          'vi.importActual("@reading-advantage/db/company-identity");',
        ].join("\n"),
        marker: "unapproved binding: vi",
      },
    ];

    for (const counterexample of counterexamples) {
      const violations = collectFinanceTask3CompanyIdentityViolations(
        financeTask3ReviewTestPath,
        counterexample.source,
      );
      expect(
        violations.some((violation) =>
          violation.includes(counterexample.marker),
        ),
        counterexample.name,
      ).toBe(true);
    }
  });

  it("does not treat erased ambient declarations as runtime shadows", () => {
    const loaderSpecifier = "@reading-advantage/db/company-identity";
    const ambientCases = [
      {
        name: "ambient process",
        source: [
          "declare const process: any;",
          'process.getBuiltinModule("node:module").createRequire("file:///ambient.js")(',
          `  "${loaderSpecifier}",`,
          ");",
        ].join("\n"),
        marker: "unshadowed Node loader capability: process",
        sandbox: () => ({
          process: {
            getBuiltinModule: () => ({
              createRequire: () => (specifier: string) => specifier,
            }),
          },
        }),
      },
      {
        name: "ambient globalThis",
        source: [
          "declare const globalThis: any;",
          `globalThis.require("${loaderSpecifier}");`,
        ].join("\n"),
        marker: "unshadowed Node loader capability: globalThis",
        sandbox: () => ({
          globalThis: {
            require: (specifier: string) => specifier,
          },
        }),
      },
      {
        name: "ambient require",
        source: [
          "declare const require: any;",
          `require("${loaderSpecifier}");`,
        ].join("\n"),
        marker: "runtime module loading through require",
        sandbox: () => ({
          require: (specifier: string) => specifier,
        }),
      },
      {
        name: "ambient global process loader",
        source: [
          "declare const global: any;",
          'global.process.getBuiltinModule("node:module").createRequire("file:///ambient.js")(',
          `  "${loaderSpecifier}",`,
          ");",
        ].join("\n"),
        marker: "unshadowed Node loader capability: global",
        sandbox: () => ({
          global: {
            process: {
              getBuiltinModule: () => ({
                createRequire: () => (specifier: string) => specifier,
              }),
            },
          },
        }),
      },
      {
        name: "ambient global require",
        source: [
          "declare const global: any;",
          `global.require("${loaderSpecifier}");`,
        ].join("\n"),
        marker: "unshadowed Node loader capability: global",
        sandbox: () => ({
          global: {
            require: (specifier: string) => specifier,
          },
        }),
      },
      {
        name: "ambient global process destructure",
        source: [
          "declare const global: any;",
          "const { process: p } = global;",
          'p.getBuiltinModule("node:module").createRequire("file:///ambient.js")(',
          `  "${loaderSpecifier}",`,
          ");",
        ].join("\n"),
        marker: "unshadowed Node loader capability: global",
        sandbox: () => ({
          global: {
            process: {
              getBuiltinModule: () => ({
                createRequire: () => (specifier: string) => specifier,
              }),
            },
          },
        }),
      },
    ];

    for (const ambientCase of ambientCases) {
      const violations = collectFinanceTask3CompanyIdentityViolations(
        financeTask3ReviewTestPath,
        ambientCase.source,
      );
      expect(
        violations.some((violation) => violation.includes(ambientCase.marker)),
        ambientCase.name,
      ).toBe(true);

      const transpiled = ts.transpileModule(ambientCase.source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText;
      expect(transpiled).not.toContain("declare");
      expect(transpiled).toContain(loaderSpecifier);
      expect(() =>
        runInNewContext(transpiled, ambientCase.sandbox()),
      ).not.toThrow();
    }
  });

  it("allows genuinely local shadow controls while rejecting unshadowed loader roots", () => {
    const shadowControl = [
      "function localRequire(require: (specifier: string) => unknown) {",
      '  return require.call(undefined, "local-module");',
      "}",
      "const createRequire = (specifier: string) => specifier;",
      'createRequire("local-module");',
      "const module = { require: (specifier: string) => specifier };",
      'module.require("local-module");',
      "const process = { getBuiltinModule: (specifier: string) => specifier };",
      'process.getBuiltinModule("local-module");',
      "const globalThis = { require: (specifier: string) => specifier };",
      'globalThis.require("local-module");',
      "function localGlobal(global: { require: (specifier: string) => unknown }) {",
      '  return global.require("local-module");',
      "}",
      "const global = {",
      "  process: {",
      "    getBuiltinModule: (specifier: string) => ({",
      "      createRequire: () => (moduleSpecifier: string) => moduleSpecifier,",
      "    }),",
      "  },",
      "  require: (specifier: string) => specifier,",
      "};",
      'global.require("local-module");',
      'global.process.getBuiltinModule("local-module").createRequire("file:///local.js")("local-module");',
    ].join("\n");

    expect(
      collectFinanceTask3CompanyIdentityViolations(
        financeTask3ReviewTestPath,
        shadowControl,
      ),
    ).toEqual([]);
  });

  it("allows only the reviewed direct Finance adapter and portable repository controls", () => {
    const attestationControl = [
      'import { z } from "zod";',
      'import { projectSecretSafeAuditMetadata } from "./protocol.js";',
    ].join("\n");
    const reviewControl = [
      'import { randomUUID } from "node:crypto";',
      'import postgres from "postgres";',
      'import { describe } from "vitest";',
      'import { createCompanyIdentityFinanceAttestationAuditPort } from "../finance-attestation.js";',
      'import { createPostgresCompanyIdentityRepository } from "../postgres-repository.js";',
      'import type { IdentityAuditInput } from "../repository.js";',
      'import { ensureOneActiveInternalCompany, migrateCompanyIdentityWithLock } from "./postgres-task3-test-support.js";',
    ].join("\n");

    expect(
      collectFinanceTask3CompanyIdentityViolations(
        financeTask3AttestationPath,
        attestationControl,
      ),
    ).toEqual([]);
    expect(
      collectFinanceTask3CompanyIdentityViolations(
        financeTask3ReviewTestPath,
        reviewControl,
      ),
    ).toEqual([]);
  });

  it("keeps Task 3 Company Identity source and PostgreSQL review on portable boundaries", () => {
    const violations = financeTask3CompanyIdentityFiles.flatMap((filePath) =>
      collectFinanceTask3CompanyIdentityViolations(
        filePath,
        readFileSync(filePath, "utf8"),
      ),
    );

    expect(violations).toEqual([]);
  });
});
