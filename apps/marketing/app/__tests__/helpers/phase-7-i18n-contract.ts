import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, join, normalize, resolve } from "node:path";
import ts from "typescript";

/** Supported Marketing UI locales. */
export type Locale = "en" | "th";

/** Parsed local source module used by the analyzer. */
export type Source = {
  ast: ts.SourceFile;
};

/** Results of the Marketing i18n contract analysis. */
export type I18nAnalysis = {
  graph: Map<string, Source>;
  defaultLocale: Locale | null;
  layoutLocale: Locale | null;
  inferredLocale: Locale | null;
  messagePaths: Set<string>;
  messageTexts: string[];
  unsafePaths: string[];
  pageConsumption: boolean;
  realI18nConsumption: boolean;
  inlineLiterals: string[];
  unsafeSinks: string[];
};

const VIRTUAL_ROOT = "/phase-7-marketing-i18n";
const SOURCE_SUFFIXES =
  ".ts .tsx .js .jsx /index.ts /index.tsx /index.js /index.jsx".split(" ");
const TECHNICAL_STRINGS = new Set(
  "Content-Type application/json archived assertive complete draft en error false google in-progress infocard marketing-access-heading off openrouter polite reading-advantage success th true video".split(
    " ",
  ),
);
const FORBIDDEN_IMPORTS = new Set(
  "server-only next/headers next/server next/cache @reading-advantage/db @reading-advantage/backend @reading-advantage/storage @reading-advantage/domain @reading-advantage/auth firebase-admin @vercel/postgres @neondatabase/serverless".split(
    " ",
  ),
);
const SAFE_BROWSER_IMPORTS = new Set([
  "@reading-advantage/db/marketing-constants",
  // Dedicated Edge/browser-safe subpath of the shared auth package: it
  // imports no Node built-ins and exists for exactly this client use.
  "@reading-advantage/auth/public-url",
]);
const VISIBLE_ATTRIBUTES = new Set("alt placeholder title".split(" "));
const VISIBLE_ARIA_ATTRIBUTES = new Set(
  "aria-brailledescription aria-braillelabel aria-description aria-label aria-placeholder aria-roledescription aria-valuetext".split(
    " ",
  ),
);
const NON_VISIBLE_COMPONENT_ATTRIBUTES = new Set(
  "action class className color data-cy data-testid height href id key method name path rel role route size src style target testId to type url variant width".split(
    " ",
  ),
);

type Target = {
  key: string;
  path: string;
  declaration: ts.Declaration;
};

type ReactBindingKind = "default" | "namespace" | "createElement";

type ProgramContext = {
  checker: ts.TypeChecker;
  files: Map<string, ts.SourceFile>;
  paths: Map<string, string>;
  bindings: Map<string, ts.Expression[]>;
  targets: Map<string, Target | null>;
  aliasConsumers: Map<string, boolean>;
  bindingConsumers: Map<string, boolean>;
  environmentObjects: Map<string, EnvironmentObject | null>;
  functionDeclarations: WeakMap<
    ts.CallExpression,
    ts.FunctionLikeDeclaration | null
  >;
  functionReturns: WeakMap<
    ts.FunctionLikeDeclaration,
    readonly ts.Expression[]
  >;
  environmentCalls: WeakMap<ts.CallExpression, EnvironmentObject | null>;
  environmentVisiting: Set<ts.CallExpression>;
  reactBindings: Map<string, Map<string, ReactBindingKind>>;
};

type RenderedGraph = {
  functions: Set<ts.FunctionLikeDeclaration>;
  nodes: Set<ts.Node>;
  subtrees: Set<ts.Node>;
};

type Provenance = {
  kind: "message" | "inline" | "unknown";
  values: string[];
  viaAccessor: boolean;
};

const PURE_STRING_TRANSFORMS = new Set(["toLowerCase", "toUpperCase", "trim"]);

type StaticValueState = "truthy" | "falsy" | "nullish" | "unknown";

const staticValueState = (
  context: ProgramContext,
  expression: ts.Expression,
  seen = new Set<string>(),
): StaticValueState => {
  const current = unwrap(expression);
  if (current.kind === ts.SyntaxKind.TrueKeyword) return "truthy";
  if (current.kind === ts.SyntaxKind.FalseKeyword) return "falsy";
  if (current.kind === ts.SyntaxKind.NullKeyword) return "nullish";
  if (ts.isStringLiteralLike(current))
    return current.text.length ? "truthy" : "falsy";
  if (ts.isNumericLiteral(current))
    return Number(current.text) === 0 ? "falsy" : "truthy";
  if (
    ts.isObjectLiteralExpression(current) ||
    ts.isArrayLiteralExpression(current) ||
    ts.isJsxElement(current) ||
    ts.isJsxSelfClosingElement(current) ||
    ts.isJsxFragment(current)
  )
    return "truthy";
  if (!ts.isIdentifier(current)) return "unknown";
  const target = targetAt(context, current);
  if (!target || seen.has(target.key)) return "unknown";
  const variable = variableDeclarationOf(target.declaration);
  return variable?.initializer
    ? staticValueState(
        context,
        variable.initializer,
        new Set(seen).add(target.key),
      )
    : "unknown";
};

const walk = (
  node: ts.Node,
  visit: (node: ts.Node) => boolean | void,
): void => {
  if (visit(node) === false) return;
  ts.forEachChild(node, (child) => walk(child, visit));
};

const parse = (path: string, text: string): Source => ({
  ast: ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  ),
});

const virtualPath = (path: string): string =>
  normalize(join(VIRTUAL_ROOT, path));

const graphPath = (fileName: string): string | null => {
  const normalized = normalize(fileName);
  if (!normalized.startsWith(`${VIRTUAL_ROOT}/`)) return null;
  return normalized.slice(VIRTUAL_ROOT.length + 1);
};

const resolveLocal = (
  specifier: string,
  from: string,
  has: (path: string) => boolean,
): string | null => {
  const clean = specifier.split("?")[0].replace(/\.(?:tsx?|jsx?)$/, "");
  const base = clean.startsWith("@/")
    ? clean.slice(2)
    : clean.startsWith(".")
      ? normalize(join(dirname(from), clean))
      : null;
  if (!base) return null;
  return SOURCE_SUFFIXES.map((suffix) => `${base}${suffix}`).find(has) ?? null;
};

const isFunctionLikeNode = (node: ts.Node): boolean =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node);

const scopeHasBinding = (scope: ts.Node, name: string): boolean => {
  let found = false;
  walk(scope, (node) => {
    if (found) return false;
    if (node !== scope && isFunctionLikeNode(node)) return false;
    if (
      ts.isVariableDeclaration(node) &&
      ((ts.isIdentifier(node.name) && node.name.text === name) ||
        (ts.isObjectBindingPattern(node.name) &&
          node.name.elements.some(
            (element) =>
              ts.isBindingElement(element) &&
              ts.isIdentifier(element.name) &&
              element.name.text === name,
          )))
    )
      found = true;
    if (
      (ts.isParameter(node) || ts.isBindingElement(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name
    )
      found = true;
  });
  return found;
};

const isShadowedName = (
  source: Source,
  reference: ts.Node,
  name: string,
): boolean => {
  let current: ts.Node | undefined = reference.parent;
  while (current) {
    if (isFunctionLikeNode(current) && scopeHasBinding(current, name))
      return true;
    if (current === source.ast) return scopeHasBinding(source.ast, name);
    current = current.parent;
  }
  return false;
};

const unwrapRequireExpression = (expression: ts.Expression): ts.Expression => {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current)
  )
    current = current.expression;
  return current;
};

const isRequireValue = (
  source: Source,
  expression: ts.Expression,
  aliases: Set<string>,
): boolean => {
  const current = unwrapRequireExpression(expression);
  if (ts.isIdentifier(current)) {
    if (current.text === "require")
      return !isShadowedName(source, current, "require");
    if (aliases.has(current.text)) return true;
    return false;
  }
  if (
    ts.isPropertyAccessExpression(current) &&
    current.name.text === "bind" &&
    isRequireValue(source, current.expression, aliases)
  )
    return true;
  if (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression) &&
    current.expression.name.text === "bind" &&
    isRequireValue(source, current.expression.expression, aliases)
  )
    return true;
  if (
    ts.isBinaryExpression(current) &&
    current.operatorToken.kind === ts.SyntaxKind.CommaToken
  )
    return isRequireValue(source, current.right, aliases);
  return false;
};

const requireAliases = (source: Source): Set<string> => {
  const aliases = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    walk(source.ast, (node) => {
      if (
        !ts.isVariableDeclaration(node) ||
        !ts.isIdentifier(node.name) ||
        !node.initializer
      )
        return;
      if (
        isRequireValue(source, node.initializer, aliases) &&
        !aliases.has(node.name.text)
      ) {
        aliases.add(node.name.text);
        changed = true;
      }
    });
  }
  return aliases;
};

const isRequireCall = (
  source: Source,
  node: ts.CallExpression,
  aliases = requireAliases(source),
): boolean =>
  isRequireValue(source, node.expression, aliases) ||
  (ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "require" &&
    ts.isIdentifier(node.expression.expression) &&
    !isShadowedName(source, node.expression.expression, "module"));

const importSpecifiers = (source: Source, runtimeOnly = false): string[] => {
  const result: string[] = [];
  const aliases = requireAliases(source);
  walk(source.ast, (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const typeOnly = ts.isImportDeclaration(node)
        ? Boolean(
            node.importClause?.isTypeOnly ||
            (node.importClause?.namedBindings &&
              ts.isNamedImports(node.importClause.namedBindings) &&
              node.importClause.namedBindings.elements.every(
                (element) => element.isTypeOnly,
              )),
          )
        : Boolean(
            node.isTypeOnly ||
            (node.exportClause &&
              ts.isNamedExports(node.exportClause) &&
              node.exportClause.elements.every(
                (element) => element.isTypeOnly,
              )),
          );
      if (!runtimeOnly || !typeOnly) result.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    )
      result.push(node.arguments[0].text);
    if (
      ts.isCallExpression(node) &&
      isRequireCall(source, node, aliases) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    )
      result.push(node.arguments[0].text);
  });
  return result;
};

const expand = (
  entries: readonly string[],
  load: (path: string) => Source | null,
  has: (path: string) => boolean,
): Map<string, Source> => {
  const graph = new Map<string, Source>();
  const pending = [...entries];
  while (pending.length) {
    const path = pending.shift();
    if (!path || graph.has(path)) continue;
    const source = load(path);
    if (!source) continue;
    graph.set(path, source);
    for (const specifier of importSpecifiers(source)) {
      const target = resolveLocal(specifier, path, has);
      if (target && !graph.has(target)) pending.push(target);
    }
  }
  return graph;
};

/**
 * Builds the transitive local source graph for a Marketing app.
 * @param appRoot Root directory used to resolve app-relative entry paths.
 * @param entries App-relative source files from which traversal starts.
 * @returns Parsed source modules reachable from the entry paths.
 */
export function buildMarketingGraph(
  appRoot: string,
  entries: readonly string[],
): Map<string, Source> {
  const has = (path: string) => existsSync(resolve(appRoot, path));
  return expand(
    entries,
    (path) =>
      has(path)
        ? parse(path, readFileSync(resolve(appRoot, path), "utf8"))
        : null,
    has,
  );
}

/**
 * Builds a transitive graph from small in-memory analyzer fixtures.
 * @param modules Fixture source text keyed by import paths.
 * @param entries Fixture entry paths from which traversal starts.
 * @returns Parsed fixture modules reachable from the entry paths.
 */
export function buildFixtureGraph(
  modules: Record<string, string>,
  entries: readonly string[],
): Map<string, Source> {
  const has = (path: string) => Object.hasOwn(modules, path);
  return expand(
    entries,
    (path) => (has(path) ? parse(path, modules[path]) : null),
    has,
  );
}

const reachable = (
  starts: string | readonly string[],
  graph: Map<string, Source>,
  runtimeOnly = false,
): Set<string> => {
  const result = new Set<string>();
  const pending = typeof starts === "string" ? [starts] : [...starts];
  while (pending.length) {
    const path = pending.shift();
    if (!path || result.has(path) || !graph.has(path)) continue;
    result.add(path);
    for (const specifier of importSpecifiers(graph.get(path)!, runtimeOnly)) {
      const target = resolveLocal(specifier, path, (candidate) =>
        graph.has(candidate),
      );
      if (target) pending.push(target);
    }
  }
  return result;
};

const technical = (value: string): boolean => {
  const text = value.trim();
  return (
    !text ||
    TECHNICAL_STRINGS.has(text) ||
    /^\/?api(?:\/|$)|^https?:\/\//i.test(text) ||
    /^(GET|POST|PATCH|PUT|DELETE|OPTIONS|HEAD)$/i.test(text) ||
    /^(application|text)\/[a-z0-9.+-]+$/i.test(text) ||
    /^#[0-9a-f]{3,8}$/i.test(text) ||
    /^[0-9a-f]{16,}$/i.test(text) ||
    /^(?:campaign|marketing-settings|project-topic|scene|topic)-[a-z0-9-]*$/i.test(
      text,
    ) ||
    /^[a-z][a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/i.test(text) ||
    /^nvidia\//i.test(text)
  );
};

const hasLanguageText = (locale: Locale | null, values: readonly string[]) =>
  Boolean(
    locale &&
    values.some((value) =>
      (locale === "th" ? /[\u0E00-\u0E7F]/u : /[A-Za-z]{3,}/).test(value),
    ),
  );

const sourceStrings = (node: ts.Node): string[] => {
  const result: string[] = [];
  walk(node, (current) => {
    if (
      !ts.isStringLiteral(current) &&
      !ts.isNoSubstitutionTemplateLiteral(current)
    )
      return;
    const parent = current.parent;
    const directive =
      ts.isExpressionStatement(parent) && parent.expression === current;
    const moduleName =
      (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
      parent.moduleSpecifier === current;
    const propertyKey =
      ts.isPropertyAssignment(parent) && parent.name === current;
    if (!directive && !moduleName && !propertyKey && !technical(current.text))
      result.push(current.text);
  });
  return result;
};

const localeCandidates = (
  graph: Map<string, Source>,
): { name: string; locale: Locale }[] => {
  const result: { name: string; locale: Locale }[] = [];
  for (const source of graph.values())
    walk(source.ast, (node) => {
      const declaration =
        ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)
          ? node
          : null;
      if (
        !declaration ||
        !(
          ts.isIdentifier(declaration.name) ||
          ts.isStringLiteral(declaration.name)
        )
      )
        return;
      const name = declaration.name.text;
      const initializer = declaration.initializer;
      if (!initializer) return;
      const value =
        (ts.isStringLiteral(initializer) ||
          ts.isNoSubstitutionTemplateLiteral(initializer)) &&
        (initializer.text === "en" || initializer.text === "th")
          ? initializer.text
          : null;
      const normalized = name.replace(/[-_]/g, "").toLowerCase();
      if (value && (normalized === "locale" || normalized === "defaultlocale"))
        result.push({ name, locale: value });
    });
  return result;
};

const createProgram = (graph: Map<string, Source>): ProgramContext => {
  const texts = new Map(
    [...graph].map(([path, source]) => [virtualPath(path), source.ast.text]),
  );
  const options: ts.CompilerOptions = {
    allowJs: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    noLib: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.Latest,
  };
  const host = ts.createCompilerHost(options, true);
  host.getCurrentDirectory = () => VIRTUAL_ROOT;
  host.fileExists = (fileName) => texts.has(normalize(fileName));
  host.readFile = (fileName) => texts.get(normalize(fileName));
  host.getSourceFile = (fileName, languageVersion) => {
    const text = texts.get(normalize(fileName));
    if (text === undefined) return undefined;
    return ts.createSourceFile(
      fileName,
      text,
      languageVersion,
      true,
      fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
  };
  host.resolveModuleNames = (names, containingFile) => {
    const from = graphPath(containingFile);
    return names.map((name) => {
      const target =
        from && resolveLocal(name, from, (candidate) => graph.has(candidate));
      return target
        ? {
            isExternalLibraryImport: false,
            resolvedFileName: virtualPath(target),
          }
        : undefined;
    });
  };
  const program = ts.createProgram(
    [...graph.keys()].map(virtualPath),
    options,
    host,
  );
  const files = new Map<string, ts.SourceFile>();
  const paths = new Map<string, string>();
  for (const path of graph.keys()) {
    const file = program.getSourceFile(virtualPath(path));
    if (file) {
      files.set(path, file);
      paths.set(normalize(file.fileName), path);
    }
  }
  const reactBindings = new Map<string, Map<string, ReactBindingKind>>();
  for (const file of files.values()) {
    const bindings = new Map<string, ReactBindingKind>();
    for (const statement of file.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== "react" ||
        !statement.importClause ||
        statement.importClause.isTypeOnly
      )
        continue;
      const clause = statement.importClause;
      if (clause.name) bindings.set(clause.name.text, "default");
      const named = clause.namedBindings;
      if (named && ts.isNamespaceImport(named))
        bindings.set(named.name.text, "namespace");
      if (named && ts.isNamedImports(named))
        for (const element of named.elements) {
          const imported = element.propertyName ?? element.name;
          if (ts.isIdentifier(imported) && imported.text === "createElement")
            bindings.set(element.name.text, "createElement");
        }
    }
    if (bindings.size) reactBindings.set(normalize(file.fileName), bindings);
  }
  return {
    checker: program.getTypeChecker(),
    files,
    paths,
    bindings: new Map(),
    targets: new Map(),
    aliasConsumers: new Map(),
    bindingConsumers: new Map(),
    environmentObjects: new Map(),
    functionDeclarations: new WeakMap(),
    functionReturns: new WeakMap(),
    environmentCalls: new WeakMap(),
    environmentVisiting: new Set(),
    reactBindings,
  };
};

const unalias = (
  context: ProgramContext,
  symbol: ts.Symbol | undefined,
): ts.Symbol | undefined => {
  if (!symbol) return undefined;
  return symbol.flags & ts.SymbolFlags.Alias
    ? context.checker.getAliasedSymbol(symbol)
    : symbol;
};

const targetFromSymbol = (
  context: ProgramContext,
  symbol: ts.Symbol | undefined,
): Target | null => {
  const resolved = unalias(context, symbol);
  const declaration = resolved?.declarations?.find((item) =>
    context.paths.has(normalize(item.getSourceFile().fileName)),
  );
  const path = declaration
    ? context.paths.get(normalize(declaration.getSourceFile().fileName))
    : null;
  return declaration && path
    ? { key: `${path}:${declaration.pos}`, path, declaration }
    : null;
};

const targetAt = (context: ProgramContext, node: ts.Node): Target | null => {
  const key = `${node.getSourceFile().fileName}:${node.pos}:${node.end}`;
  if (context.targets.has(key)) return context.targets.get(key) ?? null;
  try {
    const symbol = context.checker.getSymbolAtLocation(node);
    const target = targetFromSymbol(context, symbol);
    context.targets.set(key, target);
    return target;
  } catch {
    context.targets.set(key, null);
    return null;
  }
};

const isForbiddenSpecifier = (specifier: string): boolean => {
  if (SAFE_BROWSER_IMPORTS.has(specifier)) return false;
  for (const root of FORBIDDEN_IMPORTS)
    if (specifier === root || specifier.startsWith(`${root}/`)) return true;
  return false;
};

const hasUnsafeRequire = (
  context: ProgramContext,
  source: ts.SourceFile,
): boolean => {
  let unsafe = false;
  const isRequireCallee = (
    expression: ts.Expression,
    seen = new Set<string>(),
  ): boolean => {
    const current = unwrapRequireExpression(expression);
    if (ts.isIdentifier(current)) {
      if (current.text === "require")
        return isGlobalName(context, current, "require");
      const target = targetAt(context, current);
      if (!target || seen.has(target.key)) return false;
      const variable = variableDeclarationOf(target.declaration);
      if (!variable || !variable.initializer) return false;
      return isRequireCallee(
        variable.initializer,
        new Set(seen).add(target.key),
      );
    }
    if (ts.isPropertyAccessExpression(current) && current.name.text === "bind")
      return isRequireCallee(current.expression, seen);
    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind === ts.SyntaxKind.CommaToken
    )
      return isRequireCallee(current.right, seen);
    return (
      ts.isPropertyAccessExpression(current) &&
      current.name.text === "require" &&
      ts.isIdentifier(current.expression) &&
      isGlobalName(context, current.expression, "module")
    );
  };
  walk(source, (node) => {
    if (
      unsafe ||
      !ts.isCallExpression(node) ||
      !isRequireCallee(node.expression)
    )
      return;
    if (
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "bind"
    ) {
      unsafe = true;
      return;
    }
    unsafe = true;
  });
  return unsafe;
};

const hasUnsafeDynamicImport = (source: ts.SourceFile): boolean => {
  let unsafe = false;
  walk(source, (node) => {
    if (
      unsafe ||
      !ts.isCallExpression(node) ||
      node.expression.kind !== ts.SyntaxKind.ImportKeyword
    )
      return;
    const specifier = node.arguments[0];
    if (
      node.arguments.length !== 1 ||
      !ts.isStringLiteral(specifier) ||
      (!SAFE_BROWSER_IMPORTS.has(specifier.text) &&
        !specifier.text.startsWith("./") &&
        !specifier.text.startsWith("../") &&
        !specifier.text.startsWith("@/"))
    )
      unsafe = true;
  });
  return unsafe;
};

const unwrap = (expression: ts.Expression): ts.Expression => {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current)
  )
    current = current.expression;
  return current;
};

type EnvironmentObject = "globalThis" | "process" | "env";

const staticPropertyName = (
  expression: ts.Expression | undefined,
): string | null => {
  if (!expression) return null;
  return ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
    ? expression.text
    : null;
};

const isGlobalName = (
  context: ProgramContext,
  expression: ts.Expression,
  name: string,
): boolean => {
  const current = unwrap(expression);
  if (
    current.parent &&
    ts.isPropertyAccessExpression(current.parent) &&
    current.parent.name === current
  )
    return false;
  return (
    ts.isIdentifier(current) &&
    current.text === name &&
    !targetAt(context, current)
  );
};

const isConstVariable = (declaration: ts.VariableDeclaration): boolean => {
  const list = declaration.parent;
  return (
    ts.isVariableDeclarationList(list) &&
    Boolean(list.flags & ts.NodeFlags.Const)
  );
};

const variableDeclarationOf = (
  declaration: ts.Declaration,
): ts.VariableDeclaration | null => {
  if (ts.isVariableDeclaration(declaration)) return declaration;
  if (!ts.isBindingElement(declaration)) return null;
  const pattern = declaration.parent;
  const variable = pattern.parent;
  return ts.isVariableDeclaration(variable) ? variable : null;
};

const bindingPropertyName = (binding: ts.BindingElement): string | null => {
  const name = binding.propertyName ?? binding.name;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
};

const publicEnvironmentPattern = (
  pattern: ts.BindingName,
  sourceObject: EnvironmentObject,
): boolean => {
  if (!ts.isObjectBindingPattern(pattern)) return false;
  const elements = pattern.elements;
  if (
    !elements.length ||
    elements.some((element) => ts.isOmittedExpression(element))
  )
    return false;
  return elements.every((element) => {
    if (!ts.isBindingElement(element) || element.dotDotDotToken) return false;
    const property = bindingPropertyName(element);
    if (
      sourceObject === "env" &&
      property?.startsWith("NEXT_PUBLIC_") &&
      ts.isIdentifier(element.name)
    )
      return true;
    if (sourceObject === "process" && property === "env")
      return publicEnvironmentPattern(element.name, "env");
    if (sourceObject === "globalThis" && property === "process")
      return publicEnvironmentPattern(element.name, "process");
    return false;
  });
};

const isPublicEnvironmentBindingInitializer = (
  context: ProgramContext,
  node: ts.Node,
): boolean => {
  const parent = node.parent;
  if (
    !parent ||
    !ts.isVariableDeclaration(parent) ||
    parent.initializer !== node ||
    !ts.isObjectBindingPattern(parent.name)
  )
    return false;
  const provenance = resolveEnvironmentObject(context, node as ts.Expression);
  return provenance ? publicEnvironmentPattern(parent.name, provenance) : false;
};

const isPublicEnvironmentBinding = (
  context: ProgramContext,
  node: ts.Node,
): boolean => {
  const binding = ts.isBindingElement(node)
    ? node
    : node.parent && ts.isBindingElement(node.parent)
      ? node.parent
      : null;
  const declaration = binding && variableDeclarationOf(binding);
  return Boolean(
    declaration?.initializer &&
    isPublicEnvironmentBindingInitializer(context, declaration.initializer),
  );
};

const staticStringValue = (
  context: ProgramContext,
  expression: ts.Expression | undefined,
  seen = new Set<string>(),
): string | null => {
  const literal = staticPropertyName(expression);
  if (literal !== null) return literal;
  if (!expression) return null;
  const current = unwrap(expression);
  if (!ts.isIdentifier(current)) return null;
  const target = targetAt(context, current);
  if (!target || seen.has(target.key)) return null;
  const declaration = target.declaration;
  const variable = variableDeclarationOf(declaration);
  return variable && isConstVariable(variable) && variable.initializer
    ? staticStringValue(
        context,
        variable.initializer,
        new Set(seen).add(target.key),
      )
    : null;
};

const staticStringValues = (
  context: ProgramContext,
  expression: ts.Expression | undefined,
  seen = new Set<string>(),
): string[] => {
  if (!expression) return [];
  const current = unwrap(expression);
  if (
    ts.isStringLiteral(current) ||
    ts.isNoSubstitutionTemplateLiteral(current)
  )
    return [current.text];
  if (ts.isConditionalExpression(current))
    return [
      ...staticStringValues(context, current.whenTrue, seen),
      ...staticStringValues(context, current.whenFalse, seen),
    ];
  if (ts.isPropertyAccessExpression(current)) {
    const object = objectLiteralExpression(context, current.expression);
    const value = object && objectProperty(object, current.name.text);
    return value ? staticStringValues(context, value, seen) : [];
  }
  if (ts.isElementAccessExpression(current)) {
    const property = staticStringValue(context, current.argumentExpression);
    const object = objectLiteralExpression(context, current.expression);
    const value = property && object ? objectProperty(object, property) : null;
    return value ? staticStringValues(context, value, seen) : [];
  }
  if (!ts.isIdentifier(current)) return [];
  const target = targetAt(context, current);
  if (!target || seen.has(target.key)) return [];
  const variable = variableDeclarationOf(target.declaration);
  return variable?.initializer
    ? staticStringValues(
        context,
        variable.initializer,
        new Set(seen).add(target.key),
      )
    : [];
};

const isTypeOnlyReference = (node: ts.Node | undefined): boolean => {
  if (!node) return false;
  let parent = node.parent;
  if (!parent) return false;
  while (parent) {
    if (ts.isTypeNode(parent)) return true;
    if (
      ts.isExpressionStatement(parent) ||
      ts.isVariableDeclaration(parent) ||
      ts.isPropertyAccessExpression(parent) ||
      ts.isElementAccessExpression(parent)
    )
      return false;
    parent = parent.parent;
  }
  return false;
};

const hasAliasConsumer = (
  context: ProgramContext,
  source: ts.SourceFile,
  declaration: ts.VariableDeclaration,
  seen = new Set<string>(),
): boolean => {
  if (!ts.isIdentifier(declaration.name)) return false;
  const target = targetAt(context, declaration.name);
  if (!target || seen.has(target.key)) return false;
  if (seen.size === 0 && context.aliasConsumers.has(target.key))
    return context.aliasConsumers.get(target.key) ?? false;
  const nextSeen = new Set(seen).add(target.key);
  let consumed = false;
  walk(source, (node) => {
    if (consumed) return false;
    if (
      !ts.isIdentifier(node) ||
      node === declaration.name ||
      isTypeOnlyReference(node) ||
      targetAt(context, node)?.key !== target.key
    )
      return;
    const parent = node.parent;
    if (
      (ts.isPropertyAccessExpression(parent) ||
        ts.isElementAccessExpression(parent)) &&
      parent.expression === node
    ) {
      consumed = true;
      return false;
    }
    if (
      ts.isVariableDeclaration(parent) &&
      parent.initializer === node &&
      isConstVariable(parent) &&
      ts.isIdentifier(parent.name)
    ) {
      consumed = hasAliasConsumer(context, source, parent, nextSeen);
      if (consumed) return false;
    }
  });
  if (seen.size === 0) context.aliasConsumers.set(target.key, consumed);
  return consumed;
};

const hasBindingConsumer = (
  context: ProgramContext,
  source: ts.SourceFile,
  binding: ts.BindingElement,
): boolean => {
  const target = targetAt(context, binding.name);
  if (!target) return false;
  if (context.bindingConsumers.has(target.key))
    return context.bindingConsumers.get(target.key) ?? false;
  let consumed = false;
  walk(source, (node) => {
    if (
      consumed ||
      !ts.isIdentifier(node) ||
      node === binding.name ||
      isTypeOnlyReference(node) ||
      targetAt(context, node)?.key !== target.key
    )
      return;
    const parent = node.parent;
    if (
      (ts.isPropertyAccessExpression(parent) ||
        ts.isElementAccessExpression(parent)) &&
      parent.expression === node
    )
      consumed = true;
  });
  context.bindingConsumers.set(target.key, consumed);
  return consumed;
};

const resolveEnvironmentObject = (
  context: ProgramContext,
  expression: ts.Expression,
  seen = new Set<string>(),
): EnvironmentObject | null => {
  const current = unwrap(expression);
  const cacheKey = `${current.getSourceFile().fileName}:${current.pos}:${current.end}`;
  if (!seen.size && context.environmentObjects.has(cacheKey))
    return context.environmentObjects.get(cacheKey) ?? null;
  let result: EnvironmentObject | null = null;
  if (ts.isIdentifier(current)) {
    if (isGlobalName(context, current, "process")) return "process";
    if (isGlobalName(context, current, "globalThis")) return "globalThis";
    const target = targetAt(context, current);
    if (target && !seen.has(target.key)) {
      const declaration = target.declaration;
      const variable = variableDeclarationOf(declaration);
      if (variable && isConstVariable(variable) && variable.initializer) {
        if (ts.isBindingElement(declaration)) {
          const base = resolveEnvironmentObject(
            context,
            variable.initializer,
            new Set(seen).add(target.key),
          );
          const property = bindingPropertyName(declaration);
          if (base === "process" && property === "env") result = "env";
          if (base === "globalThis" && property === "process")
            result = "process";
        } else {
          result = resolveEnvironmentObject(
            context,
            variable.initializer,
            new Set(seen).add(target.key),
          );
        }
      }
    }
  } else if (ts.isPropertyAccessExpression(current)) {
    const base = resolveEnvironmentObject(context, current.expression);
    if (current.name.text === "process" && base === "globalThis")
      result = "process";
    if (current.name.text === "env" && base === "process") result = "env";
  } else if (ts.isElementAccessExpression(current)) {
    const name = staticStringValue(context, current.argumentExpression);
    const base = resolveEnvironmentObject(context, current.expression);
    if (name === "process" && base === "globalThis") result = "process";
    if (name === "env" && base === "process") result = "env";
  } else if (ts.isConditionalExpression(current)) {
    const whenTrue = resolveEnvironmentObject(context, current.whenTrue, seen);
    const whenFalse = resolveEnvironmentObject(
      context,
      current.whenFalse,
      seen,
    );
    if (whenTrue && whenTrue === whenFalse) result = whenTrue;
  } else if (ts.isCallExpression(current)) {
    const cached = context.environmentCalls.get(current);
    if (cached !== undefined) return cached;
    if (context.environmentVisiting.has(current)) {
      context.environmentCalls.set(current, null);
      return null;
    }
    context.environmentVisiting.add(current);
    const declaration = functionDeclarationForCall(context, current);
    if (declaration) {
      const returns = functionReturns(context, declaration).map((returned) =>
        resolveEnvironmentObject(context, returned, seen),
      );
      result =
        returns.length && returns.every((value) => value === returns[0])
          ? returns[0]
          : null;
    }
    context.environmentVisiting.delete(current);
    context.environmentCalls.set(current, result);
  }
  if (!seen.size) context.environmentObjects.set(cacheKey, result);
  return result;
};

const isStableAliasInitializer = (
  context: ProgramContext,
  source: ts.SourceFile,
  node: ts.Node,
): boolean => {
  const parent = node.parent;
  return (
    ts.isVariableDeclaration(parent) &&
    parent.initializer === node &&
    ts.isIdentifier(parent.name) &&
    isConstVariable(parent) &&
    hasAliasConsumer(context, source, parent)
  );
};

const isBindingDeclaration = (node: ts.Node): boolean => {
  const parent = node.parent;
  return ts.isBindingElement(parent) && parent.name === node;
};

const isConstEnvironmentDeclaration = (
  context: ProgramContext,
  node: ts.Node,
): boolean => {
  const parent = node.parent;
  return (
    ts.isVariableDeclaration(parent) &&
    parent.name === node &&
    isConstVariable(parent) &&
    parent.initializer !== undefined &&
    resolveEnvironmentObject(context, parent.initializer) === "env"
  );
};

const isSafeGlobalAliasInitializer = (
  context: ProgramContext,
  source: ts.SourceFile,
  node: ts.Node,
): boolean => {
  const parent = node.parent;
  if (!ts.isVariableDeclaration(parent) || parent.initializer !== node)
    return false;
  if (ts.isIdentifier(parent.name))
    return isConstVariable(parent) && hasAliasConsumer(context, source, parent);
  if (!isConstVariable(parent) || !ts.isObjectBindingPattern(parent.name))
    return false;
  return parent.name.elements.some(
    (element) =>
      ts.isBindingElement(element) &&
      (bindingPropertyName(element) === "process" ||
        bindingPropertyName(element) === "env") &&
      hasBindingConsumer(context, source, element),
  );
};

const hasUnsafeEnvironmentAccess = (
  context: ProgramContext,
  source: ts.SourceFile,
): boolean => {
  let unsafe = false;
  walk(source, (node) => {
    if (unsafe) return false;
    if (!node) return false;
    if (isTypeOnlyReference(node)) return false;
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      resolveEnvironmentObject(context, node.right)
    ) {
      unsafe = true;
      return false;
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const provenance = resolveEnvironmentObject(context, node.initializer);
      if (provenance && !isConstVariable(node)) {
        unsafe = true;
        return false;
      }
    }
    if (isPublicEnvironmentBindingInitializer(context, node)) return;
    if (isPublicEnvironmentBinding(context, node)) return;
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const base = resolveEnvironmentObject(context, node.expression);
      if (base === "env") {
        const key = ts.isPropertyAccessExpression(node)
          ? node.name.text
          : staticStringValue(context, node.argumentExpression);
        if (key === null || !key.startsWith("NEXT_PUBLIC_")) {
          unsafe = true;
          return false;
        }
        return;
      }
      if (base === "process") {
        const key = ts.isPropertyAccessExpression(node)
          ? node.name.text
          : staticStringValue(context, node.argumentExpression);
        if (key !== "env") {
          unsafe = true;
          return false;
        }
        const parent = node.parent;
        const isChainedAccess =
          (ts.isPropertyAccessExpression(parent) ||
            ts.isElementAccessExpression(parent)) &&
          parent.expression === node;
        if (
          isChainedAccess ||
          isSafeGlobalAliasInitializer(context, source, node)
        )
          return;
        unsafe = true;
        return false;
      }
      if (base === "globalThis") {
        const key = ts.isPropertyAccessExpression(node)
          ? node.name.text
          : staticStringValue(context, node.argumentExpression);
        if (key !== "process") return;
        const parent = node.parent;
        const isChainedAccess =
          (ts.isPropertyAccessExpression(parent) ||
            ts.isElementAccessExpression(parent)) &&
          parent.expression === node;
        if (
          isChainedAccess ||
          isSafeGlobalAliasInitializer(context, source, node)
        )
          return;
        unsafe = true;
        return false;
      }
      if (
        (ts.isPropertyAccessExpression(node) ||
          ts.isElementAccessExpression(node)) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "env" &&
        isGlobalName(context, node.expression, "env")
      ) {
        unsafe = true;
        return false;
      }
    }
    if (
      node.parent &&
      ts.isVariableDeclaration(node.parent) &&
      node.parent.name === node
    )
      return;
    if (
      node.parent &&
      ts.isTypeOfExpression(node.parent) &&
      node.parent.expression === node
    )
      return;
    const provenance = resolveEnvironmentObject(context, node as ts.Expression);
    if (provenance === "process" || provenance === "globalThis") {
      if (isSafeGlobalValueUse(context, source, node, provenance)) return;
      unsafe = true;
      return false;
    }
    if (
      provenance !== "env" ||
      isBindingDeclaration(node) ||
      isConstEnvironmentDeclaration(context, node) ||
      isSafeGlobalAliasInitializer(context, source, node)
    )
      return;
    const parent = node.parent;
    const isChainedAccess =
      (ts.isPropertyAccessExpression(parent) ||
        ts.isElementAccessExpression(parent)) &&
      parent.expression === node;
    if (isChainedAccess || isStableAliasInitializer(context, source, node))
      return;
    unsafe = true;
    return false;
  });
  return unsafe;
};

const isFunctionImplementation = (
  node: ts.Node,
): node is ts.FunctionLikeDeclaration =>
  ts.isFunctionDeclaration(node) ||
  ts.isMethodDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node);

const isFunctionBoundary = (node: ts.Node): boolean =>
  isFunctionImplementation(node) ||
  ts.isClassDeclaration(node) ||
  ts.isClassExpression(node);

const isTopLevelOrReturned = (node: ts.Node): boolean => {
  let parent = node.parent;
  let returned = false;
  while (parent && !isFunctionImplementation(parent)) {
    returned ||= ts.isReturnStatement(parent);
    parent = parent.parent;
  }
  return !parent || returned;
};

const functionReturns = (
  context: ProgramContext,
  node: ts.FunctionLikeDeclaration,
): readonly ts.Expression[] => {
  const cached = context.functionReturns.get(node);
  if (cached) return cached;
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
    const result = [node.body];
    context.functionReturns.set(node, result);
    return result;
  }
  if (!node.body || !ts.isBlock(node.body)) {
    context.functionReturns.set(node, []);
    return [];
  }
  const result: ts.Expression[] = [];
  walk(node.body, (current) => {
    if (current !== node.body && isFunctionBoundary(current)) return false;
    if (ts.isReturnStatement(current) && current.expression)
      result.push(current.expression);
  });
  context.functionReturns.set(node, result);
  return result;
};

const functionDeclarationForCall = (
  context: ProgramContext,
  call: ts.CallExpression,
): ts.FunctionLikeDeclaration | null => {
  const cached = context.functionDeclarations.get(call);
  if (cached !== undefined) return cached;
  let result: ts.FunctionLikeDeclaration | null = null;
  if (ts.isIdentifier(call.expression)) {
    const target = targetAt(context, call.expression);
    const declaration = target?.declaration;
    if (declaration && isFunctionImplementation(declaration))
      result = declaration;
    else if (
      declaration &&
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer &&
      isFunctionImplementation(declaration.initializer)
    )
      result = declaration.initializer;
  }
  if (!result) {
    const signatureDeclaration =
      context.checker.getResolvedSignature(call)?.declaration;
    if (signatureDeclaration && isFunctionImplementation(signatureDeclaration))
      result = signatureDeclaration;
  }
  context.functionDeclarations.set(call, result);
  return result;
};

const functionFromTarget = (
  target: Target | null,
): ts.FunctionLikeDeclaration | null => {
  if (!target) return null;
  if (isFunctionImplementation(target.declaration)) return target.declaration;
  const variable = variableDeclarationOf(target.declaration);
  return variable?.initializer && isFunctionImplementation(variable.initializer)
    ? variable.initializer
    : null;
};

const defaultExportFunctions = (
  context: ProgramContext,
  source: ts.SourceFile,
): ts.FunctionLikeDeclaration[] => {
  const result: ts.FunctionLikeDeclaration[] = [];
  for (const statement of source.statements) {
    if (
      isFunctionImplementation(statement) &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
      )
    )
      result.push(statement);
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      const target = targetAt(context, statement.expression);
      const functionNode = functionFromTarget(target);
      if (functionNode) result.push(functionNode);
    }
  }
  return result;
};

const renderedFunctions = (
  context: ProgramContext,
  entries: readonly string[],
): RenderedGraph => {
  type PendingFunction = {
    node: ts.FunctionLikeDeclaration;
    bindings: Map<string, ts.Expression>;
  };
  const functions: Set<ts.FunctionLikeDeclaration> = new Set();
  const nodes = new Set<ts.Node>();
  const subtrees = new Set<ts.Node>();
  const processedExpressions = new Set<string>();
  const functionVisits = new Set<string>();
  const pending: PendingFunction[] = entries.flatMap((path) => {
    const source = context.files.get(path);
    return source
      ? defaultExportFunctions(context, source).map((node) => ({
          node,
          bindings: new Map(),
        }))
      : [];
  });

  const markTree = (node: ts.Node): void => {
    subtrees.add(node);
    const mark = (current: ts.Node): void => {
      if (nodes.has(current)) return;
      nodes.add(current);
      if (
        (current !== node && isFunctionImplementation(current)) ||
        (current !== node && ts.isCallExpression(current))
      )
        return;
      ts.forEachChild(current, mark);
    };
    mark(node);
  };

  const bindingSignature = (
    bindings: ReadonlyMap<string, ts.Expression>,
  ): string =>
    [...bindings]
      .map(
        ([key, value]) =>
          `${key}:${value.getSourceFile().fileName}:${value.pos}:${value.end}`,
      )
      .sort()
      .join("|");

  const enqueue = (
    functionNode: ts.FunctionLikeDeclaration,
    bindings = new Map<string, ts.Expression>(),
  ): void => {
    const key = `${functionNode.getSourceFile().fileName}:${functionNode.pos}:${functionNode.end}|${bindingSignature(bindings)}`;
    if (functionVisits.has(key)) return;
    pending.push({ node: functionNode, bindings: new Map(bindings) });
  };

  const registerBindings = (
    bindings: ReadonlyMap<string, ts.Expression>,
  ): void => {
    for (const [key, value] of bindings) {
      const current = context.bindings.get(key) ?? [];
      if (!current.includes(value))
        context.bindings.set(key, [...current, value]);
    }
  };

  const callBindings = (
    functionNode: ts.FunctionLikeDeclaration,
    call: ts.CallExpression,
    inherited: ReadonlyMap<string, ts.Expression> = new Map(),
  ): Map<string, ts.Expression> => {
    const substitute = (
      expression: ts.Expression,
      seen = new Set<string>(),
    ): ts.Expression => {
      const current = unwrap(expression);
      if (!ts.isIdentifier(current)) return current;
      const target = targetAt(context, current);
      if (!target || seen.has(target.key)) return current;
      const bound = inherited.get(target.key);
      return bound ? substitute(bound, new Set(seen).add(target.key)) : current;
    };
    const bindings = new Map<string, ts.Expression>();
    for (const [index, parameter] of functionNode.parameters.entries()) {
      if (!ts.isIdentifier(parameter.name)) continue;
      const argument = call.arguments[index];
      const target = targetAt(context, parameter.name);
      if (argument && target) bindings.set(target.key, substitute(argument));
    }
    return bindings;
  };

  const markExpression = (
    expression: ts.Expression,
    seenTargets = new Set<string>(),
    bindings: ReadonlyMap<string, ts.Expression> = new Map(),
  ): void => {
    const current = unwrap(expression);
    const processedKey = `${current.getSourceFile().fileName}:${current.pos}:${current.end}|${bindingSignature(bindings)}`;
    if (processedExpressions.has(processedKey)) return;
    processedExpressions.add(processedKey);

    if (isFunctionImplementation(current)) {
      nodes.add(current);
      enqueue(current);
      return;
    }
    if (ts.isIdentifier(current)) {
      const target = targetAt(context, current);
      if (!target || seenTargets.has(target.key)) return;
      const bound = bindings.get(target.key);
      if (bound) {
        markExpression(bound, seenTargets, bindings);
        return;
      }
      const variable = variableDeclarationOf(target.declaration);
      if (variable?.initializer) {
        const nextTargets = new Set(seenTargets).add(target.key);
        markExpression(variable.initializer, nextTargets, bindings);
      }
      return;
    }
    if (ts.isPropertyAccessExpression(current)) {
      const object = objectLiteralExpression(context, current.expression);
      const value = object && objectProperty(object, current.name.text);
      if (value) markExpression(value, seenTargets, bindings);
      return;
    }
    if (ts.isElementAccessExpression(current)) {
      const property = staticStringValue(context, current.argumentExpression);
      const object = objectLiteralExpression(context, current.expression);
      const value =
        property && object ? objectProperty(object, property) : null;
      if (value) markExpression(value, seenTargets, bindings);
      return;
    }
    if (ts.isConditionalExpression(current)) {
      markExpression(current.whenTrue, seenTargets, bindings);
      markExpression(current.whenFalse, seenTargets, bindings);
      return;
    }
    if (ts.isTemplateExpression(current)) {
      markTree(current);
      for (const span of current.templateSpans)
        markExpression(span.expression, seenTargets, bindings);
      return;
    }
    if (ts.isBinaryExpression(current)) {
      const state = staticValueState(context, current.left);
      if (
        current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ) {
        if (state !== "falsy" && state !== "nullish")
          markExpression(current.right, seenTargets, bindings);
      } else if (current.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        if (state === "truthy")
          markExpression(current.left, seenTargets, bindings);
        else if (state === "falsy" || state === "nullish")
          markExpression(current.right, seenTargets, bindings);
        else {
          markExpression(current.left, seenTargets, bindings);
          markExpression(current.right, seenTargets, bindings);
        }
      } else if (
        current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        if (state === "nullish")
          markExpression(current.right, seenTargets, bindings);
        else if (state === "truthy" || state === "falsy")
          markExpression(current.left, seenTargets, bindings);
        else {
          markExpression(current.left, seenTargets, bindings);
          markExpression(current.right, seenTargets, bindings);
        }
      }
      return;
    }
    if (ts.isArrayLiteralExpression(current)) {
      for (const element of current.elements) {
        if (ts.isSpreadElement(element))
          markExpression(element.expression, seenTargets, bindings);
        else markExpression(element, seenTargets, bindings);
      }
      return;
    }
    if (ts.isCallExpression(current)) {
      nodes.add(current);
      if (isReactCreateElementCall(context, current)) {
        markTree(current);
        const element = current.arguments[0];
        if (element && ts.isIdentifier(element)) {
          const child = functionFromTarget(targetAt(context, element));
          if (child) enqueue(child);
        }
        for (const argument of current.arguments.slice(1))
          if (!isFunctionImplementation(argument))
            markExpression(argument, seenTargets, bindings);
        return;
      }
      if (
        ts.isPropertyAccessExpression(current.expression) &&
        ["map", "flatMap"].includes(current.expression.name.text)
      ) {
        markExpression(current.expression.expression, seenTargets, bindings);
        const callback = current.arguments[0];
        if (callback && isFunctionImplementation(callback)) enqueue(callback);
        return;
      }
      const called = functionDeclarationForCall(context, current);
      if (called) enqueue(called, callBindings(called, current, bindings));
      return;
    }
    if (
      ts.isJsxElement(current) ||
      ts.isJsxSelfClosingElement(current) ||
      ts.isJsxFragment(current)
    ) {
      markTree(current);
      walk(current, (node) => {
        if (node !== current && isFunctionImplementation(node)) return false;
        if (node !== current && ts.isCallExpression(node)) {
          markExpression(node, seenTargets, bindings);
          return false;
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          if (ts.isIdentifier(node.tagName)) {
            const child = functionFromTarget(targetAt(context, node.tagName));
            if (child) enqueue(child);
          }
        }
        if (ts.isJsxExpression(node) && node.expression)
          markExpression(node.expression, seenTargets, bindings);
        if (ts.isJsxSpreadAttribute(node))
          markExpression(node.expression, seenTargets, bindings);
      });
    }
  };

  while (pending.length) {
    const item = pending.shift();
    if (!item) continue;
    const { node: functionNode, bindings } = item;
    const visitKey = `${functionNode.getSourceFile().fileName}:${functionNode.pos}:${functionNode.end}|${bindingSignature(bindings)}`;
    if (functionVisits.has(visitKey)) continue;
    functionVisits.add(visitKey);
    functions.add(functionNode);
    if (functionNode.body && containsJsx(functionNode.body))
      registerBindings(bindings);
    for (const returned of functionReturns(context, functionNode))
      markExpression(returned, new Set(), bindings);
  }
  return { functions, nodes, subtrees };
};

const isRenderedNode = (node: ts.Node, rendered: RenderedGraph): boolean => {
  if (rendered.nodes.has(node)) return true;
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (rendered.subtrees.has(current)) return true;
    current = current.parent;
  }
  return false;
};

const enclosingFunction = (
  node: ts.Node,
): ts.FunctionLikeDeclaration | null => {
  let parent = node.parent;
  while (parent) {
    if (isFunctionImplementation(parent)) return parent;
    parent = parent.parent;
  }
  return null;
};

const sameDeclaration = (left: ts.Declaration, right: ts.Declaration) =>
  left.getSourceFile().fileName === right.getSourceFile().fileName &&
  left.pos === right.pos;

const isReturnedExpression = (
  node: ts.Node,
  owner: ts.FunctionLikeDeclaration,
): boolean => {
  let current: ts.Node = node;
  while (current.parent && current.parent !== owner) {
    if (ts.isReturnStatement(current.parent)) return true;
    if (isFunctionImplementation(current.parent)) return false;
    current = current.parent;
  }
  return ts.isArrowFunction(owner) && owner.body === current;
};

const isPublicEnvironmentCall = (
  context: ProgramContext,
  call: ts.CallExpression,
): boolean => {
  let current: ts.Expression = call;
  let sawEnv = false;
  while (current.parent) {
    const parent = current.parent;
    if (
      ts.isPropertyAccessExpression(parent) &&
      parent.expression === current
    ) {
      if (!sawEnv && parent.name.text === "env") sawEnv = true;
      else if (!sawEnv && parent.name.text !== "process") return false;
      else if (sawEnv) return parent.name.text.startsWith("NEXT_PUBLIC_");
      current = parent;
      continue;
    }
    if (ts.isElementAccessExpression(parent) && parent.expression === current) {
      const key = staticStringValue(context, parent.argumentExpression);
      if (!sawEnv && key === "env") sawEnv = true;
      else if (!sawEnv && key !== "process") return false;
      else if (sawEnv) return key?.startsWith("NEXT_PUBLIC_") ?? false;
      current = parent;
      continue;
    }
    break;
  }
  return false;
};

const isSafeGlobalValueUse = (
  context: ProgramContext,
  source: ts.SourceFile,
  node: ts.Node,
  provenance: EnvironmentObject,
): boolean => {
  const parent = node.parent;
  const isChainedAccess =
    (ts.isPropertyAccessExpression(parent) ||
      ts.isElementAccessExpression(parent)) &&
    parent.expression === node;
  if (isChainedAccess) return true;
  if (isSafeGlobalAliasInitializer(context, source, node)) return true;
  const owner = enclosingFunction(node);
  if (!owner || !isReturnedExpression(node, owner)) return false;
  const returns = functionReturns(context, owner);
  if (
    !returns.length ||
    !returns.every(
      (returned) => resolveEnvironmentObject(context, returned) === provenance,
    )
  )
    return false;
  let callCount = 0;
  let allPublic = true;
  walk(source, (current) => {
    if (!ts.isCallExpression(current)) return;
    const declaration = functionDeclarationForCall(context, current);
    if (!declaration || !sameDeclaration(declaration, owner)) return;
    callCount += 1;
    if (!isPublicEnvironmentCall(context, current)) allPublic = false;
  });
  return callCount > 0 && allPublic;
};

const containsJsx = (node: ts.Node): boolean => {
  let found = false;
  walk(node, (current) => {
    if (
      ts.isJsxElement(current) ||
      ts.isJsxFragment(current) ||
      ts.isJsxSelfClosingElement(current) ||
      ts.isJsxText(current)
    )
      found = true;
  });
  return found;
};

const objectProperty = (
  expression: ts.Expression,
  property: string,
): ts.Expression | null => {
  const current = unwrap(expression);
  if (!ts.isObjectLiteralExpression(current)) return null;
  for (const item of current.properties) {
    if (
      ts.isPropertyAssignment(item) &&
      (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) &&
      item.name.text === property
    )
      return item.initializer;
  }
  return null;
};

const objectLiteralExpression = (
  context: ProgramContext,
  expression: ts.Expression,
  seen = new Set<string>(),
): ts.ObjectLiteralExpression | null => {
  const current = unwrap(expression);
  if (ts.isObjectLiteralExpression(current)) return current;
  if (!ts.isIdentifier(current)) return null;
  const target = targetAt(context, current);
  if (!target || seen.has(target.key)) return null;
  const variable = variableDeclarationOf(target.declaration);
  return variable?.initializer
    ? objectLiteralExpression(
        context,
        variable.initializer,
        new Set(seen).add(target.key),
      )
    : null;
};

const arrayElements = (
  context: ProgramContext,
  expression: ts.Expression,
  seen = new Set<string>(),
): ts.Expression[] => {
  const current = unwrap(expression);
  if (ts.isArrayLiteralExpression(current))
    return current.elements.filter(
      (element): element is ts.Expression => !ts.isSpreadElement(element),
    );
  if (!ts.isIdentifier(current)) return [];
  const target = targetAt(context, current);
  const declaration = target?.declaration;
  return target &&
    !seen.has(target.key) &&
    declaration &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer
    ? arrayElements(
        context,
        declaration.initializer,
        new Set(seen).add(target.key),
      )
    : [];
};

const callReturns = (
  context: ProgramContext,
  call: ts.CallExpression,
): readonly ts.Expression[] => {
  const declaration = functionDeclarationForCall(context, call);
  return declaration ? functionReturns(context, declaration) : [];
};

const referencesTarget = (
  context: ProgramContext,
  node: ts.Node,
  key: string,
): boolean => {
  let found = false;
  walk(node, (current) => {
    if (current !== node && isFunctionBoundary(current)) return false;
    if (ts.isIdentifier(current)) {
      const target = targetAt(context, current);
      if (target?.key === key) found = true;
    }
  });
  return found;
};

const merge = (...items: Provenance[]): Provenance => ({
  kind: items.some((item) => item.kind === "message")
    ? "message"
    : items.some((item) => item.kind === "inline")
      ? "inline"
      : "unknown",
  values: [...new Set(items.flatMap((item) => item.values))],
  viaAccessor: items.some((item) => item.viaAccessor),
});

const unknown = (): Provenance => ({
  kind: "unknown",
  values: [],
  viaAccessor: false,
});

const inline = (values: string[]): Provenance => ({
  kind: "inline",
  values,
  viaAccessor: false,
});

const message = (viaAccessor = false): Provenance => ({
  kind: "message",
  values: [],
  viaAccessor,
});

const resolveExpression = (
  context: ProgramContext,
  expression: ts.Expression,
  messageKeys: Set<string>,
  seen = new Set<string>(),
): Provenance => {
  const current = unwrap(expression);
  if (ts.isStringLiteral(current)) return inline([current.text]);
  if (ts.isNoSubstitutionTemplateLiteral(current))
    return inline([current.text]);
  if (ts.isTemplateExpression(current))
    return merge(
      inline([current.head.text]),
      ...current.templateSpans.flatMap((span) => [
        inline([span.literal.text]),
        resolveExpression(context, span.expression, messageKeys, seen),
      ]),
    );
  if (ts.isIdentifier(current)) {
    const target = targetAt(context, current);
    if (!target) return unknown();
    if (messageKeys.has(target.key)) return message();
    const bound = context.bindings.get(target.key);
    if (bound)
      return merge(
        ...bound.map((value) =>
          resolveExpression(context, value, messageKeys, seen),
        ),
      );
    if (seen.has(target.key)) return unknown();
    const declaration = target.declaration;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer)
      return resolveExpression(
        context,
        declaration.initializer,
        messageKeys,
        new Set(seen).add(target.key),
      );
    return unknown();
  }
  if (ts.isPropertyAccessExpression(current)) {
    const propertyTarget = targetAt(context, current.name);
    if (propertyTarget && messageKeys.has(propertyTarget.key)) return message();
    const base = current.expression;
    const baseTarget = targetAt(context, base);
    if (baseTarget && messageKeys.has(baseTarget.key)) return message();
    if (baseTarget) {
      const declaration = baseTarget.declaration;
      if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
        const value = objectProperty(
          declaration.initializer,
          current.name.text,
        );
        if (value) return resolveExpression(context, value, messageKeys, seen);
      }
    }
    return unknown();
  }
  if (ts.isElementAccessExpression(current)) {
    const base = resolveExpression(
      context,
      current.expression,
      messageKeys,
      seen,
    );
    if (base.kind === "message") return base;
    const baseTarget = targetAt(context, current.expression);
    if (baseTarget && messageKeys.has(baseTarget.key)) return message();
    const argument = current.argumentExpression;
    if (
      baseTarget &&
      argument &&
      (ts.isStringLiteral(argument) ||
        ts.isNoSubstitutionTemplateLiteral(argument))
    ) {
      const declaration = baseTarget.declaration;
      if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
        const value = objectProperty(declaration.initializer, argument.text);
        if (value) return resolveExpression(context, value, messageKeys, seen);
      }
    }
    return unknown();
  }
  if (ts.isCallExpression(current)) {
    if (
      ts.isPropertyAccessExpression(current.expression) &&
      current.arguments.length === 0 &&
      PURE_STRING_TRANSFORMS.has(current.expression.name.text)
    ) {
      return resolveExpression(
        context,
        current.expression.expression,
        messageKeys,
        seen,
      );
    }
    if (
      ts.isIdentifier(current.expression) &&
      current.expression.text === "String" &&
      isGlobalName(context, current.expression, "String") &&
      current.arguments.length === 1
    ) {
      return resolveExpression(
        context,
        current.arguments[0],
        messageKeys,
        seen,
      );
    }
    const returns = callReturns(context, current);
    if (!returns.length) return unknown();
    const result = merge(
      ...returns.map((returned) =>
        resolveExpression(context, returned, messageKeys, seen),
      ),
    );
    return result.kind === "message"
      ? { ...result, viaAccessor: true }
      : result;
  }
  if (ts.isConditionalExpression(current))
    return merge(
      resolveExpression(context, current.whenTrue, messageKeys, seen),
      resolveExpression(context, current.whenFalse, messageKeys, seen),
    );
  if (ts.isBinaryExpression(current)) {
    const left = resolveExpression(context, current.left, messageKeys, seen);
    const right = resolveExpression(context, current.right, messageKeys, seen);
    const state = staticValueState(context, current.left);
    if (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
      return state === "falsy" || state === "nullish" ? left : right;
    if (current.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      if (state === "truthy") return left;
      if (state === "falsy" || state === "nullish") return right;
      return merge(left, right);
    }
    if (current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
      if (state === "nullish") return right;
      if (state === "truthy" || state === "falsy") return left;
      return merge(left, right);
    }
    if (current.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return merge(left, right);
  }
  return unknown();
};

const customComponent = (node: ts.JsxAttribute): boolean => {
  const parent = node.parent.parent;
  const tagName =
    (ts.isJsxOpeningElement(parent) || ts.isJsxSelfClosingElement(parent)) &&
    parent.tagName;
  if (!tagName) return false;
  if (ts.isIdentifier(tagName)) return /^[A-Z]/.test(tagName.text);
  return (
    ts.isPropertyAccessExpression(tagName) &&
    ts.isIdentifier(tagName.expression) &&
    /^[A-Z]/.test(tagName.expression.text)
  );
};

const jsxTagName = (node: ts.JsxAttribute): string | null => {
  const parent = node.parent.parent;
  const tagName =
    (ts.isJsxOpeningElement(parent) || ts.isJsxSelfClosingElement(parent)) &&
    parent.tagName;
  return tagName && ts.isIdentifier(tagName)
    ? tagName.text.toLowerCase()
    : null;
};

const visibleInputValue = (
  context: ProgramContext,
  node: ts.JsxAttribute,
): boolean => {
  if (
    !ts.isIdentifier(node.name) ||
    node.name.text !== "value" ||
    jsxTagName(node) !== "input"
  )
    return false;
  const parent = node.parent.parent;
  if (!ts.isJsxOpeningElement(parent) && !ts.isJsxSelfClosingElement(parent))
    return false;
  const typeAttribute = parent.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "type",
  );
  const typeExpression =
    typeAttribute?.initializer && ts.isJsxExpression(typeAttribute.initializer)
      ? typeAttribute.initializer.expression
      : typeAttribute?.initializer;
  return staticStringValues(context, typeExpression).some((value) =>
    ["submit", "button", "reset"].includes(value.toLowerCase()),
  );
};

const collectMetadataRoots = (
  context: ProgramContext,
): Set<ts.ObjectLiteralExpression> => {
  const roots = new Set<ts.ObjectLiteralExpression>();
  const add = (expression: ts.Expression | undefined): void => {
    if (!expression) return;
    const object = objectLiteralExpression(context, expression);
    if (object) roots.add(object);
  };
  for (const source of context.files.values())
    walk(source, (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        if (node.name.text === "metadata") add(node.initializer);
        if (
          node.name.text === "generateMetadata" &&
          node.initializer &&
          isFunctionImplementation(node.initializer)
        )
          for (const returned of functionReturns(context, node.initializer))
            add(returned);
      }
      if (
        ts.isFunctionDeclaration(node) &&
        node.name?.text === "generateMetadata"
      )
        for (const returned of functionReturns(context, node)) add(returned);
      if (ts.isExportDeclaration(node) && node.exportClause) {
        if (ts.isNamedExports(node.exportClause))
          for (const specifier of node.exportClause.elements) {
            const exported = specifier.name.text;
            if (exported === "metadata")
              add(specifier.propertyName ?? specifier.name);
          }
      }
    });
  return roots;
};

const metadataRoot = (
  roots: ReadonlySet<ts.ObjectLiteralExpression>,
  node: ts.Node,
): ts.ObjectLiteralExpression | null => {
  let current: ts.Node = node;
  while (current.parent) {
    const parent = current.parent;
    if (ts.isObjectLiteralExpression(parent) && roots.has(parent))
      return parent;
    current = parent;
  }
  return null;
};

const metadataField = (node: ts.Node): "title" | "description" | null => {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    const parent: ts.Node = current.parent;
    if (ts.isPropertyAssignment(parent)) {
      const name =
        ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name)
          ? parent.name.text
          : null;
      if (name === "title" || name === "description") return name;
    }
    current = parent;
  }
  return null;
};

const isMetadataString = (
  roots: ReadonlySet<ts.ObjectLiteralExpression>,
  node: ts.StringLiteralLike,
): boolean => Boolean(metadataField(node) && metadataRoot(roots, node));

const reactImportKind = (
  context: ProgramContext,
  identifier: ts.Identifier,
): ReactBindingKind | null => {
  const declaration = targetAt(context, identifier)?.declaration;
  let current: ts.Node | undefined = declaration;
  while (current) {
    if (
      ts.isImportDeclaration(current) &&
      ts.isStringLiteral(current.moduleSpecifier) &&
      current.moduleSpecifier.text === "react" &&
      current.importClause &&
      !current.importClause.isTypeOnly
    ) {
      const bindings = current.importClause.namedBindings;
      if (declaration === current.importClause.name) return "default";
      if (bindings && ts.isNamespaceImport(bindings)) {
        if (declaration === bindings) return "namespace";
      }
      if (bindings && ts.isNamedImports(bindings)) {
        const element = bindings.elements.find(
          (item) => item.name === declaration,
        );
        const imported = element?.propertyName ?? element?.name;
        if (imported && ts.isIdentifier(imported))
          return imported.text === "createElement" ? "createElement" : null;
      }
      return null;
    }
    current = current.parent;
  }
  const sourceFile = context.files.get(
    context.paths.get(normalize(identifier.getSourceFile().fileName)) ?? "",
  );
  if (!sourceFile) return null;
  const source = { ast: sourceFile };
  if (isShadowedName(source, identifier, identifier.text)) return null;
  return (
    context.reactBindings
      .get(normalize(sourceFile.fileName))
      ?.get(identifier.text) ?? null
  );
};

const isReactModuleObject = (
  context: ProgramContext,
  expression: ts.Expression,
  seen = new Set<string>(),
): boolean => {
  const current = unwrap(expression);
  if (ts.isIdentifier(current)) {
    if (isGlobalName(context, current, "React")) return true;
    const kind = reactImportKind(context, current);
    if (kind === "default" || kind === "namespace") return true;
    const target = targetAt(context, current);
    if (!target || seen.has(target.key)) return false;
    const declaration = target.declaration;
    const variable = variableDeclarationOf(declaration);
    return Boolean(
      variable?.initializer &&
      isReactModuleObject(
        context,
        variable.initializer,
        new Set(seen).add(target.key),
      ),
    );
  }
  return false;
};

const isReactCreateElementValue = (
  context: ProgramContext,
  expression: ts.Expression,
  seen = new Set<string>(),
): boolean => {
  const current = unwrap(expression);
  if (ts.isIdentifier(current)) {
    if (reactImportKind(context, current) === "createElement") return true;
    if (isGlobalName(context, current, "createElement")) return true;
    const target = targetAt(context, current);
    if (!target || seen.has(target.key)) return false;
    if (
      ts.isBindingElement(target.declaration) &&
      bindingPropertyName(target.declaration) === "createElement"
    ) {
      const bindingVariable = variableDeclarationOf(target.declaration);
      return Boolean(
        bindingVariable?.initializer &&
        isReactModuleObject(context, bindingVariable.initializer, seen),
      );
    }
    const variable = variableDeclarationOf(target.declaration);
    return Boolean(
      variable?.initializer &&
      isReactCreateElementValue(
        context,
        variable.initializer,
        new Set(seen).add(target.key),
      ),
    );
  }
  return (
    ts.isPropertyAccessExpression(current) &&
    current.name.text === "createElement" &&
    isReactModuleObject(context, current.expression, seen)
  );
};

const isReactCreateElementCall = (
  context: ProgramContext,
  node: ts.CallExpression,
): boolean => {
  return isReactCreateElementValue(context, node.expression);
};

const isTechnicalSpreadProperty = (name: string): boolean =>
  new Set(["class", "className", "id", "key", "role", "style", "tabIndex"]).has(
    name,
  ) ||
  name.startsWith("data-") ||
  name.startsWith("aria-");

const isSafeJsxSpread = (
  context: ProgramContext,
  expression: ts.Expression,
  seen = new Set<string>(),
): boolean => {
  const object = objectLiteralExpression(context, expression, seen);
  if (!object) return false;
  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) {
      if (!isSafeJsxSpread(context, property.expression, seen)) return false;
      continue;
    }
    if (!ts.isPropertyAssignment(property)) return false;
    const name =
      ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        ? property.name.text
        : null;
    if (!name || name === "dangerouslySetInnerHTML") return false;
    if (!isTechnicalSpreadProperty(name)) return false;
  }
  return true;
};

const scanVisible = (
  context: ProgramContext,
  source: ts.SourceFile,
  messageKeys: Set<string>,
  metadataRoots: ReadonlySet<ts.ObjectLiteralExpression>,
  rendered: RenderedGraph,
): {
  inlineLiterals: string[];
  accessorOutput: boolean;
  unsafeSinks: string[];
} => {
  const values: string[] = [];
  const unsafeSinks: string[] = [];
  let accessorOutput = false;
  let currentNodeIsRendered = true;
  const add = (provenance: Provenance, forceVisible = false) => {
    if (!currentNodeIsRendered && !forceVisible) return;
    if (
      provenance.kind === "message" &&
      provenance.viaAccessor &&
      (currentNodeIsRendered || forceVisible)
    ) {
      accessorOutput = true;
    }
    if (provenance.kind !== "inline" && provenance.kind !== "message") return;
    for (const value of provenance.values) {
      const text = value.trim();
      if (/[A-Za-z\u0E00-\u0E7F]/u.test(text) && !technical(text))
        values.push(text);
    }
  };
  walk(source, (node) => {
    currentNodeIsRendered = isRenderedNode(node, rendered);
    if (ts.isReturnStatement(node) && node.expression) {
      const owner = enclosingFunction(node);
      if (owner && rendered.functions.has(owner))
        add(resolveExpression(context, node.expression, messageKeys), true);
    }
    if (
      ts.isArrowFunction(node) &&
      !ts.isBlock(node.body) &&
      rendered.functions.has(node)
    )
      add(resolveExpression(context, node.body, messageKeys), true);
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      isMetadataString(metadataRoots, node)
    )
      add(inline([node.text]), true);
    if (
      ts.isPropertyAssignment(node) &&
      metadataField(node.initializer) &&
      metadataRoot(metadataRoots, node.initializer)
    ) {
      add(resolveExpression(context, node.initializer, messageKeys), true);
    }
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "dangerouslySetInnerHTML"
    ) {
      unsafeSinks.push("dangerouslySetInnerHTML");
      const expression =
        node.initializer &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression;
      if (expression && ts.isObjectLiteralExpression(expression)) {
        const html = expression.properties.find(
          (property): property is ts.PropertyAssignment =>
            ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) &&
            property.name.text === "__html",
        );
        if (html)
          add(resolveExpression(context, html.initializer, messageKeys));
      }
    }
    if (ts.isJsxSpreadAttribute(node)) {
      const sourceExpression = node.expression;
      const object = objectLiteralExpression(context, sourceExpression);
      const dangerous =
        object && objectProperty(object, "dangerouslySetInnerHTML");
      if (dangerous) {
        unsafeSinks.push("dangerouslySetInnerHTML");
        const html = objectProperty(dangerous, "__html");
        if (html) add(resolveExpression(context, html, messageKeys));
      } else if (!isSafeJsxSpread(context, sourceExpression)) {
        unsafeSinks.push("jsx-spread");
      }
    }
    if (ts.isCallExpression(node) && isReactCreateElementCall(context, node)) {
      const props = node.arguments[1];
      const object =
        props && props.kind !== ts.SyntaxKind.NullKeyword
          ? objectLiteralExpression(context, props)
          : null;
      const dangerous =
        object && objectProperty(object, "dangerouslySetInnerHTML");
      if (dangerous) {
        unsafeSinks.push("dangerouslySetInnerHTML");
        const html = objectProperty(dangerous, "__html");
        if (html) add(resolveExpression(context, html, messageKeys));
      }
      if (object) {
        const elementName =
          node.arguments[0] && ts.isStringLiteral(node.arguments[0])
            ? node.arguments[0].text.toLowerCase()
            : "custom";
        for (const property of object.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const name =
            ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
              ? property.name.text
              : null;
          if (!name) continue;
          const visible =
            VISIBLE_ATTRIBUTES.has(name) ||
            VISIBLE_ARIA_ATTRIBUTES.has(name.toLowerCase()) ||
            ["description", "label", "message", "text"].includes(name) ||
            (elementName === "input" &&
              name === "value" &&
              staticStringValues(
                context,
                objectProperty(object, "type") ?? undefined,
              ).some((value) =>
                ["submit", "button", "reset"].includes(value),
              )) ||
            (elementName === "custom" && name === "value");
          if (visible)
            add(resolveExpression(context, property.initializer, messageKeys));
        }
      }
      for (const child of node.arguments.slice(2))
        add(resolveExpression(context, child, messageKeys));
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "map"
    ) {
      const callback = node.arguments[0];
      const parameter =
        callback && isFunctionImplementation(callback)
          ? callback.parameters[0]
          : null;
      const target =
        parameter && ts.isIdentifier(parameter.name)
          ? targetAt(context, parameter.name)
          : null;
      const values = arrayElements(context, node.expression.expression);
      if (target && values.length) context.bindings.set(target.key, values);
    }
    if (ts.isJsxText(node)) add(inline([node.text]));
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      (VISIBLE_ATTRIBUTES.has(node.name.text) ||
        visibleInputValue(context, node) ||
        VISIBLE_ARIA_ATTRIBUTES.has(node.name.text.toLowerCase()) ||
        (customComponent(node) &&
          !NON_VISIBLE_COMPONENT_ATTRIBUTES.has(node.name.text)))
    ) {
      if (node.initializer && ts.isStringLiteral(node.initializer))
        add(inline([node.initializer.text]));
      if (node.initializer && ts.isJsxExpression(node.initializer)) {
        const expression = node.initializer.expression;
        if (expression)
          add(resolveExpression(context, expression, messageKeys));
      }
    }
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    )
      add(resolveExpression(context, node.expression, messageKeys));
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      /^set[A-Z]/.test(node.expression.text)
    )
      for (const argument of node.arguments)
        add(resolveExpression(context, argument, messageKeys));
  });
  return {
    inlineLiterals: [...new Set(values)],
    accessorOutput,
    unsafeSinks: [...new Set(unsafeSinks)],
  };
};

const layoutLocale = (
  context: ProgramContext,
  layout: Source,
  candidates: { name: string; locale: Locale }[],
): Locale | null => {
  let expression: ts.Expression | null = null;
  walk(layout.ast, (node) => {
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "lang" &&
      ts.isJsxOpeningElement(node.parent.parent) &&
      ts.isIdentifier(node.parent.parent.tagName) &&
      node.parent.parent.tagName.text === "html"
    ) {
      expression =
        node.initializer && ts.isStringLiteral(node.initializer)
          ? node.initializer
          : node.initializer && ts.isJsxExpression(node.initializer)
            ? (node.initializer.expression ?? null)
            : null;
    }
  });
  const resolveLocale = (
    value: ts.Expression,
    seen = new Set<string>(),
  ): Locale | null => {
    const current = unwrap(value);
    if (
      (ts.isStringLiteral(current) ||
        ts.isNoSubstitutionTemplateLiteral(current)) &&
      (current.text === "en" || current.text === "th")
    )
      return current.text;
    if (ts.isPropertyAccessExpression(current)) {
      const propertyTarget =
        targetAt(context, current.name) ??
        targetFromSymbol(
          context,
          context.checker.getPropertyOfType(
            context.checker.getTypeAtLocation(current.expression),
            current.name.text,
          ),
        );
      const declaration = propertyTarget?.declaration;
      if (
        declaration &&
        ts.isVariableDeclaration(declaration) &&
        declaration.initializer
      )
        return resolveLocale(declaration.initializer, seen);
      return null;
    }
    if (!ts.isIdentifier(current)) return null;
    const target = targetAt(context, current);
    if (!target || seen.has(target.key)) return null;
    const declaration = target.declaration;
    return ts.isVariableDeclaration(declaration) && declaration.initializer
      ? resolveLocale(declaration.initializer, new Set(seen).add(target.key))
      : null;
  };
  const resolved = expression ? resolveLocale(expression) : null;
  if (resolved || !expression) return resolved;
  const name = ts.isIdentifier(expression)
    ? (expression as ts.Identifier).text
    : ts.isPropertyAccessExpression(expression)
      ? (expression as ts.PropertyAccessExpression).name.text
      : null;
  if (!name) return null;
  return (
    candidates.find((candidate) => candidate.name === name)?.locale ?? null
  );
};

/**
 * Analyzes locale, client safety, semantic accessor output, and transitive UI copy.
 * Client safety includes forbidden server modules and non-public environment reads.
 * @param graph Parsed local source modules to inspect.
 * @param pages Entry pages that must consume the i18n accessor.
 * @param layoutPath Optional layout module whose html lang value is checked.
 * @returns The static i18n contract findings and falsification evidence.
 */
export function analyzeI18nGraph(
  graph: Map<string, Source>,
  pages: readonly string[],
  layoutPath?: string,
): I18nAnalysis {
  const candidates = localeCandidates(graph);
  const locale =
    candidates.length &&
    new Set(candidates.map((candidate) => candidate.locale)).size === 1
      ? candidates[0].locale
      : null;
  const context = createProgram(graph);
  const data: Target[] = [];
  const functions: ts.FunctionLikeDeclaration[] = [];
  for (const source of context.files.values())
    walk(source, (node) => {
      if (isFunctionImplementation(node) && isTopLevelOrReturned(node))
        functions.push(node);
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isObjectLiteralExpression(node.initializer) ||
          ts.isArrayLiteralExpression(node.initializer)) &&
        sourceStrings(node.initializer).length
      ) {
        const target = targetAt(context, node.name);
        if (target) data.push(target);
      }
    });
  const messageKeys = new Set<string>();
  for (const node of functions) {
    const body = node.body;
    if (!body || containsJsx(body)) continue;
    for (const dataTarget of data)
      if (referencesTarget(context, body, dataTarget.key))
        messageKeys.add(dataTarget.key);
  }
  const messageTargets = data.filter((target) => messageKeys.has(target.key));
  const messageValues = messageTargets.flatMap((target) => {
    const declaration = target.declaration;
    if (ts.isVariableDeclaration(declaration) && declaration.initializer)
      return sourceStrings(declaration.initializer);
    return [];
  });
  const messagePaths = new Set(messageTargets.map((target) => target.path));
  const metadataRoots = collectMetadataRoots(context);
  const clientPaths = reachable(
    layoutPath ? [...pages, layoutPath] : pages,
    graph,
    true,
  );
  const unsafePaths = [...clientPaths].filter((path) => {
    const source = graph.get(path)!;
    const programSource = context.files.get(path)!;
    return (
      importSpecifiers(source, true).some(
        (specifier) =>
          isForbiddenSpecifier(specifier) ||
          builtinModules.includes(specifier) ||
          builtinModules.includes(
            specifier.replace(/^node:/, "").split("/")[0],
          ) ||
          specifier.startsWith("node:") ||
          specifier.startsWith("@aws-sdk/") ||
          specifier.startsWith("@google-cloud/") ||
          (!specifier.startsWith(".") &&
            !specifier.startsWith("@/") &&
            specifier.includes("/server")),
      ) ||
      source.ast.statements.some(
        (statement) =>
          ts.isExpressionStatement(statement) &&
          ts.isStringLiteral(statement.expression) &&
          statement.expression.text === "use server",
      ) ||
      hasUnsafeRequire(context, programSource) ||
      hasUnsafeDynamicImport(programSource) ||
      hasUnsafeEnvironmentAccess(context, programSource)
    );
  });
  const rendered = renderedFunctions(
    context,
    layoutPath ? [...pages, layoutPath] : pages,
  );
  const scans = new Map(
    [...clientPaths].map((path) => [
      path,
      scanVisible(
        context,
        context.files.get(path)!,
        messageKeys,
        metadataRoots,
        rendered,
      ),
    ]),
  );
  const pageConsumption = pages.every((page) =>
    [...reachable(page, graph, true)].some(
      (path) => scans.get(path)?.accessorOutput === true,
    ),
  );
  const inlineLiterals = [...scans].flatMap(([path, scan]) =>
    scan.inlineLiterals.map((value) => `${path}: ${value}`),
  );
  const unsafeSinks = [...scans].flatMap(([path, scan]) =>
    scan.unsafeSinks.map((value) => `${path}: ${value}`),
  );
  const visible = inlineLiterals.map((value) => value.replace(/^[^:]+: /, ""));
  const thai = visible.filter((value) => /[\u0E00-\u0E7F]/u.test(value));
  const english = visible.filter((value) => /[A-Za-z]/.test(value));
  const languageMessages = hasLanguageText(locale, messageValues);
  return {
    graph,
    defaultLocale: locale,
    layoutLocale:
      layoutPath && graph.get(layoutPath)
        ? layoutLocale(context, graph.get(layoutPath)!, candidates)
        : null,
    inferredLocale:
      thai.length && !english.length
        ? "th"
        : english.length && !thai.length
          ? "en"
          : null,
    messagePaths: languageMessages ? messagePaths : new Set(),
    messageTexts: messageValues,
    unsafePaths,
    pageConsumption,
    realI18nConsumption: Boolean(
      locale &&
      messagePaths.size &&
      languageMessages &&
      !unsafePaths.length &&
      !unsafeSinks.length &&
      pageConsumption,
    ),
    inlineLiterals,
    unsafeSinks,
  };
}
