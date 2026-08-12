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

type ProgramContext = {
  checker: ts.TypeChecker;
  files: Map<string, ts.SourceFile>;
  paths: Map<string, string>;
  bindings: Map<string, ts.Expression[]>;
};

type Provenance = {
  kind: "message" | "inline" | "unknown";
  values: string[];
  viaAccessor: boolean;
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

const importSpecifiers = (source: Source, runtimeOnly = false): string[] => {
  const result: string[] = [];
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
  return {
    checker: program.getTypeChecker(),
    files,
    paths,
    bindings: new Map(),
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

const targetAt = (context: ProgramContext, node: ts.Node): Target | null =>
  targetFromSymbol(context, context.checker.getSymbolAtLocation(node));

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

const functionReturns = (node: ts.FunctionLikeDeclaration): ts.Expression[] => {
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) return [node.body];
  if (!node.body || !ts.isBlock(node.body)) return [];
  const result: ts.Expression[] = [];
  walk(node.body, (current) => {
    if (current !== node.body && isFunctionBoundary(current)) return false;
    if (ts.isReturnStatement(current) && current.expression)
      result.push(current.expression);
  });
  return result;
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
): ts.Expression[] => {
  const signature = context.checker.getResolvedSignature(call);
  const declaration = signature?.declaration;
  return declaration && isFunctionImplementation(declaration)
    ? functionReturns(declaration)
    : [];
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
  kind: items.some((item) => item.kind === "inline")
    ? "inline"
    : items.some((item) => item.kind === "message")
      ? "message"
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
  if (
    ts.isBinaryExpression(current) &&
    [
      ts.SyntaxKind.PlusToken,
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
    ].includes(current.operatorToken.kind)
  )
    return merge(
      resolveExpression(context, current.left, messageKeys, seen),
      resolveExpression(context, current.right, messageKeys, seen),
    );
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

const scanVisible = (
  context: ProgramContext,
  source: ts.SourceFile,
  messageKeys: Set<string>,
): { inlineLiterals: string[]; accessorOutput: boolean } => {
  const values: string[] = [];
  let accessorOutput = false;
  const add = (provenance: Provenance) => {
    if (provenance.kind === "message" && provenance.viaAccessor) {
      accessorOutput = true;
      return;
    }
    if (provenance.kind !== "inline") return;
    for (const value of provenance.values) {
      const text = value.trim();
      if (/[A-Za-z\u0E00-\u0E7F]/u.test(text) && !technical(text))
        values.push(text);
    }
  };
  walk(source, (node) => {
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
  return { inlineLiterals: [...new Set(values)], accessorOutput };
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
  const clientPaths = reachable(
    layoutPath ? [...pages, layoutPath] : pages,
    graph,
    true,
  );
  const unsafePaths = [...clientPaths].filter((path) => {
    const source = graph.get(path)!;
    return (
      importSpecifiers(source, true).some(
        (specifier) =>
          FORBIDDEN_IMPORTS.has(specifier) ||
          builtinModules.includes(specifier) ||
          builtinModules.includes(
            specifier.replace(/^node:/, "").split("/")[0],
          ) ||
          specifier.startsWith("node:") ||
          specifier.startsWith("@aws-sdk/") ||
          specifier.startsWith("@google-cloud/") ||
          specifier.includes("/server"),
      ) ||
      source.ast.statements.some(
        (statement) =>
          ts.isExpressionStatement(statement) &&
          ts.isStringLiteral(statement.expression) &&
          statement.expression.text === "use server",
      )
    );
  });
  const scans = new Map(
    [...clientPaths].map((path) => [
      path,
      scanVisible(context, context.files.get(path)!, messageKeys),
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
      pageConsumption,
    ),
    inlineLiterals,
  };
}
