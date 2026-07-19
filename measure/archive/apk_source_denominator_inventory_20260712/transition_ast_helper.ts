/** Enumerates literal state writes from TypeScript syntax without source-text regexes. */

import ts from "typescript";

interface Request {
  mode: "phase1" | "phase2";
  sources: Record<string, string>;
}

interface Domain {
  symbol: string;
  literals: Set<string>;
}

interface FunctionInfo {
  key: string;
  name: string;
  path: string;
  node: ts.FunctionLikeDeclaration;
  aliases: Map<string, string>;
  copiedAliases: Map<string, { source: string; declaredEnd: number; overriddenProperties: Set<string> }>;
  knownValues: Map<string, Map<string, string>>;
  constraints: Map<string, Set<string>>;
  calls: Array<{ name: string; position: number; arguments: Array<{ name: string; type: string }> }>;
}

interface HookInfo {
  owner: ts.FunctionLikeDeclaration;
  stateName: string;
  setterName: string;
  scalar?: Domain;
  objectType?: string;
}

interface StoreInfo {
  owner: BodyFunction;
  objectType: string;
  setterName: string;
  getterName?: string;
  initialValues: Map<string, string>;
}

interface WriteFact {
  path: string;
  source_symbol: string;
  to_state_id: string;
  proven_from_state_id: string | null;
  proof_kind: string | null;
  start_line: number;
  end_line: number;
  write_kind: string;
}

interface Context {
  files: Map<string, ts.SourceFile>;
  aliases: Map<string, Set<string>>;
  objects: Map<string, Map<string, Domain>>;
  functions: FunctionInfo[];
  functionsByNode: Map<ts.FunctionLikeDeclaration, FunctionInfo>;
  functionsByName: Map<string, FunctionInfo[]>;
  hooksByFile: Map<string, HookInfo[]>;
  storesByFile: Map<string, StoreInfo[]>;
}

type BodyFunction = ts.FunctionLikeDeclaration & { body: ts.ConciseBody };

const STATE_NAME = /(?:state|status|phase|mode|scene|screen|overlay|wave|floor|turn|pose|step)/i;

/** Narrows syntax to executable function declarations that own a body. */
function isBodyFunction(node: ts.Node): node is BodyFunction {
  return (
    ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isConstructorDeclaration(node)
  ) && node.body !== undefined;
}

/** Returns literal members declared directly by a type node. */
function directLiterals(node: ts.TypeNode | undefined): Set<string> {
  if (!node) return new Set();
  if (ts.isParenthesizedTypeNode(node)) return directLiterals(node.type);
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteralLike(node.literal)) {
    return new Set([node.literal.text]);
  }
  if (ts.isUnionTypeNode(node)) {
    return new Set(node.types.flatMap((part) => [...directLiterals(part)]));
  }
  return new Set();
}

/** Resolves literal members through one named literal-union alias. */
function resolvedLiterals(node: ts.TypeNode | undefined, aliases: Map<string, Set<string>>): Set<string> {
  const direct = directLiterals(node);
  if (direct.size) return direct;
  if (node && ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    return new Set(aliases.get(node.typeName.text) ?? []);
  }
  return new Set();
}

/** Returns a simple referenced type name when syntax provides one. */
function typeName(node: ts.TypeNode | undefined): string | undefined {
  return node && ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)
    ? node.typeName.text
    : undefined;
}

/** Returns one-indexed inclusive line numbers for a syntax node. */
function lines(source: ts.SourceFile, node: ts.Node): [number, number] {
  return [
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    source.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
  ];
}

/** Returns a function's stable local name when its syntax declares one. */
function functionName(node: ts.FunctionLikeDeclaration): string | undefined {
  if ("name" in node && node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
    if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  }
  return undefined;
}

/** Finds every function-like declaration in one parsed source file. */
function functionNodes(source: ts.SourceFile): ts.FunctionLikeDeclaration[] {
  const result: ts.FunctionLikeDeclaration[] = [];
  const visit = (node: ts.Node): void => {
    if (isBodyFunction(node)) result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

/** Builds literal and object-property domains from parsed declarations. */
function collectDomains(files: Map<string, ts.SourceFile>): {
  aliases: Map<string, Set<string>>;
  objects: Map<string, Map<string, Domain>>;
} {
  const aliases = new Map<string, Set<string>>();
  for (const source of files.values()) {
    source.forEachChild((node) => {
      if (ts.isTypeAliasDeclaration(node)) {
        const values = directLiterals(node.type);
        if (values.size) aliases.set(node.name.text, values);
      }
    });
  }
  const objects = new Map<string, Map<string, Domain>>();
  for (const source of files.values()) {
    source.forEachChild((node) => {
      let declarationName: string;
      let members: ts.NodeArray<ts.TypeElement>;
      if (ts.isInterfaceDeclaration(node)) {
        declarationName = node.name.text;
        members = node.members;
      } else if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
        declarationName = node.name.text;
        members = node.type.members;
      } else {
        return;
      }
      const properties = new Map<string, Domain>();
      for (const member of members) {
        if (!ts.isPropertySignature(member) || !member.type || !member.name) continue;
        const name = ts.isIdentifier(member.name) || ts.isStringLiteralLike(member.name)
          ? member.name.text
          : undefined;
        if (!name) continue;
        if (!STATE_NAME.test(declarationName) || !STATE_NAME.test(name)) continue;
        const values = resolvedLiterals(member.type, aliases);
        if (values.size) properties.set(name, { symbol: `${declarationName}.${name}`, literals: values });
      }
      if (properties.size) objects.set(declarationName, properties);
    });
  }
  return { aliases, objects };
}

/** Returns literal values assigned by a property initializer. */
function expressionLiterals(expression: ts.Expression): string[] {
  if (ts.isStringLiteralLike(expression)) return [expression.text];
  if (ts.isConditionalExpression(expression)) {
    return [...expressionLiterals(expression.whenTrue), ...expressionLiterals(expression.whenFalse)];
  }
  return [];
}

/** Finds a property domain on an object type. */
function objectDomain(context: Context, objectType: string | undefined, property: string): Domain | undefined {
  return objectType ? context.objects.get(objectType)?.get(property) : undefined;
}

/** Keys one guard constraint by exact local variable and declared domain. */
function constraintKey(variable: string, domainSymbol: string): string {
  return JSON.stringify([variable, domainSymbol]);
}

/** Returns the property name encoded by one object-domain symbol. */
function domainProperty(domain: Domain): string {
  return domain.symbol.slice(domain.symbol.lastIndexOf(".") + 1);
}

/** Detects an exact alias or domain-property write between a copy and its use. */
function hasInterveningWrite(
  info: FunctionInfo,
  variable: string,
  property: string,
  after: number,
  before: number,
): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || node.pos >= before || node.end <= after) return;
    if (node !== info.node && ts.isFunctionLike(node)) return;
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (ts.isIdentifier(node.left) && node.left.text === variable) {
        if (node.right.pos <= before && before <= node.right.end) {
          ts.forEachChild(node.right, visit);
          return;
        }
        if (
          ts.isCallExpression(node.right)
          && node.right.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === variable)
        ) {
          ts.forEachChild(node.right, visit);
          return;
        }
        found = true;
        return;
      }
      if (
        ts.isPropertyAccessExpression(node.left)
        && ts.isIdentifier(node.left.expression)
        && node.left.expression.text === variable
        && node.left.name.text === property
      ) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  if (info.node.body) visit(info.node.body);
  return found;
}

/** Resolves a guard only through an exact, unmodified object-spread alias chain. */
function constraintForVariable(
  info: FunctionInfo,
  variable: string,
  domain: Domain,
  before: number,
  seen: Set<string> = new Set(),
): Set<string> | undefined {
  const direct = info.constraints.get(constraintKey(variable, domain.symbol));
  if (direct) return direct;
  if (seen.has(variable)) return undefined;
  seen.add(variable);
  const copied = info.copiedAliases.get(variable);
  const property = domainProperty(domain);
  if (
    !copied
    || copied.overriddenProperties.has(property)
    || hasInterveningWrite(info, variable, property, copied.declaredEnd, before)
  ) return undefined;
  return constraintForVariable(info, copied.source, domain, copied.declaredEnd, seen);
}

/** Removes parentheses around one expression. */
function unwrappedExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

/** Returns the object expression produced directly by one concise function. */
function conciseObjectBody(node: BodyFunction): ts.ObjectLiteralExpression | undefined {
  if (ts.isBlock(node.body)) return undefined;
  const expression = unwrappedExpression(node.body);
  return ts.isObjectLiteralExpression(expression) ? expression : undefined;
}

/** Clones a declared store property domain under its runtime property symbol. */
function storeDomain(context: Context, store: StoreInfo, property: string): Domain | undefined {
  const declared = objectDomain(context, store.objectType, property);
  return declared ? { symbol: property, literals: declared.literals } : undefined;
}

/** Returns whether a statement exits its branch immediately. */
function containsReturn(node: ts.Statement): boolean {
  if (ts.isReturnStatement(node)) return true;
  return ts.isBlock(node) && node.statements.some((statement) => containsReturn(statement));
}

/** Extracts state-property inequality guards that make fallthrough exact. */
function collectGuardComparisons(
  expression: ts.Expression,
  aliases: Map<string, string>,
  context: Context,
  output: Map<string, Set<string>>,
): void {
  if (ts.isParenthesizedExpression(expression)) {
    collectGuardComparisons(expression.expression, aliases, context, output);
    return;
  }
  if (ts.isBinaryExpression(expression)) {
    if (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      collectGuardComparisons(expression.left, aliases, context, output);
      collectGuardComparisons(expression.right, aliases, context, output);
      return;
    }
    const inequality = expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken
      || expression.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken;
    if (!inequality || !ts.isPropertyAccessExpression(expression.left) || !ts.isStringLiteralLike(expression.right)) return;
    const owner = expression.left.expression;
    if (!ts.isIdentifier(owner)) return;
    const domain = objectDomain(context, aliases.get(owner.text), expression.left.name.text);
    if (!domain || !domain.literals.has(expression.right.text)) return;
    const key = constraintKey(owner.text, domain.symbol);
    const values = output.get(key) ?? new Set<string>();
    values.add(expression.right.text);
    output.set(key, values);
  }
}

/** Summarizes constructor-like functions that return fixed object-domain values. */
function initializerSummaries(
  files: Map<string, ts.SourceFile>,
  objects: Map<string, Map<string, Domain>>,
): Map<string, { objectType: string; values: Map<string, string> }> {
  const summaries = new Map<string, { objectType: string; values: Map<string, string> }>();
  for (const source of files.values()) {
    for (const node of functionNodes(source)) {
      const name = functionName(node);
      const returnedType = typeName(node.type);
      if (!name || !returnedType || !objects.has(returnedType) || !node.body || !ts.isBlock(node.body)) continue;
      for (const statement of node.body.statements) {
        if (!ts.isReturnStatement(statement) || !statement.expression || !ts.isObjectLiteralExpression(statement.expression)) continue;
        if (statement.expression.properties.some(ts.isSpreadAssignment)) continue;
        const values = new Map<string, string>();
        for (const property of statement.expression.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)
            ? property.name.text
            : undefined;
          if (!propertyName) continue;
          const domain = objects.get(returnedType)?.get(propertyName);
          const literals = expressionLiterals(property.initializer);
          if (domain && literals.length === 1 && domain.literals.has(literals[0])) values.set(propertyName, literals[0]);
        }
        if (values.size) summaries.set(name, { objectType: returnedType, values });
      }
    }
  }
  return summaries;
}

/** Builds function aliases, exact guards, calls, and hook declarations. */
function buildContext(request: Request): Context {
  const files = new Map<string, ts.SourceFile>();
  for (const [path, text] of Object.entries(request.sources)) {
    files.set(path, ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
  }
  const { aliases, objects } = collectDomains(files);
  const summaries = initializerSummaries(files, objects);
  const functions: FunctionInfo[] = [];
  const functionsByNode = new Map<ts.FunctionLikeDeclaration, FunctionInfo>();
  const functionsByName = new Map<string, FunctionInfo[]>();
  const hooksByFile = new Map<string, HookInfo[]>();
  const storesByFile = new Map<string, StoreInfo[]>();
  const context: Context = {
    files,
    aliases,
    objects,
    functions,
    functionsByNode,
    functionsByName,
    hooksByFile,
    storesByFile,
  };

  for (const [path, source] of files) {
    for (const node of functionNodes(source)) {
      const name = functionName(node) ?? `<anonymous:${node.pos}>`;
      const info: FunctionInfo = {
        key: `${path}:${name}:${node.pos}`,
        name,
        path,
        node,
        aliases: new Map(),
        copiedAliases: new Map(),
        knownValues: new Map(),
        constraints: new Map(),
        calls: [],
      };
      for (const parameter of node.parameters) {
        if (ts.isIdentifier(parameter.name)) {
          const referenced = typeName(parameter.type);
          if (referenced && objects.has(referenced)) info.aliases.set(parameter.name.text, referenced);
        }
      }
      functions.push(info);
      functionsByNode.set(node, info);
      const named = functionsByName.get(name) ?? [];
      named.push(info);
      functionsByName.set(name, named);
    }
  }

  for (const [path, source] of files) {
    const stores: StoreInfo[] = [];
    const visitStores = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node)
        && node.initializer
        && ts.isCallExpression(node.initializer)
        && ts.isIdentifier(node.initializer.expression)
        && node.initializer.expression.text === "create"
      ) {
        const objectType = typeName(node.initializer.typeArguments?.[0]);
        const callback = node.initializer.arguments[0];
        if (
          objectType
          && objects.has(objectType)
          && callback
          && isBodyFunction(callback)
          && callback.parameters.length >= 1
          && ts.isIdentifier(callback.parameters[0].name)
        ) {
          const initialValues = new Map<string, string>();
          const initialObject = conciseObjectBody(callback);
          for (const property of initialObject?.properties ?? []) {
            if (!ts.isPropertyAssignment(property)) continue;
            const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)
              ? property.name.text
              : undefined;
            if (!propertyName || !objectDomain(context, objectType, propertyName)) continue;
            const literals = expressionLiterals(property.initializer);
            if (literals.length === 1) initialValues.set(propertyName, literals[0]);
          }
          const getter = callback.parameters[1];
          stores.push({
            owner: callback,
            objectType,
            setterName: callback.parameters[0].name.text,
            getterName: getter && ts.isIdentifier(getter.name) ? getter.name.text : undefined,
            initialValues,
          });
        }
      }
      ts.forEachChild(node, visitStores);
    };
    visitStores(source);
    storesByFile.set(path, stores);
  }

  for (const info of functions) {
    const source = files.get(info.path)!;
    const hooks = hooksByFile.get(info.path) ?? [];
    const visitAliases = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const explicit = typeName(node.type);
        if (explicit && objects.has(explicit)) info.aliases.set(node.name.text, explicit);
        if (node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
          const spread = node.initializer.properties.find(ts.isSpreadAssignment);
          if (spread && ts.isIdentifier(spread.expression)) {
            const inherited = info.aliases.get(spread.expression.text);
            if (inherited) info.aliases.set(node.name.text, inherited);
            info.copiedAliases.set(node.name.text, {
              source: spread.expression.text,
              declaredEnd: node.end,
              overriddenProperties: new Set(
                node.initializer.properties.flatMap((property) => (
                  ts.isPropertyAssignment(property)
                  && (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name))
                    ? [property.name.text]
                    : []
                )),
              ),
            });
          }
        }
        if (node.initializer && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression)) {
          const summary = summaries.get(node.initializer.expression.text);
          if (summary) {
            info.aliases.set(node.name.text, summary.objectType);
            info.knownValues.set(node.name.text, new Map(summary.values));
          }
        }
      }
      if (
        ts.isVariableDeclaration(node)
        && ts.isArrayBindingPattern(node.name)
        && node.name.elements.length >= 2
        && ts.isBindingElement(node.name.elements[0])
        && ts.isIdentifier(node.name.elements[0].name)
        && ts.isBindingElement(node.name.elements[1])
        && ts.isIdentifier(node.name.elements[1].name)
        && node.initializer
        && ts.isCallExpression(node.initializer)
        && ts.isIdentifier(node.initializer.expression)
        && node.initializer.expression.text === "useState"
      ) {
        const stateName = node.name.elements[0].name.text;
        const setterName = node.name.elements[1].name.text;
        const typeArgument = node.initializer.typeArguments?.[0];
        const values = resolvedLiterals(typeArgument, aliases);
        const referenced = typeName(typeArgument);
        const hook: HookInfo = { owner: info.node, stateName, setterName };
        if (values.size) hook.scalar = { symbol: stateName, literals: values };
        if (referenced && objects.has(referenced)) hook.objectType = referenced;
        if (hook.scalar || hook.objectType) hooks.push(hook);
      }
      ts.forEachChild(node, visitAliases);
    };
    if (info.node.body) visitAliases(info.node.body);
    hooksByFile.set(info.path, hooks);

    if (info.node.body && ts.isBlock(info.node.body)) {
      for (const statement of info.node.body.statements) {
        if (ts.isIfStatement(statement) && containsReturn(statement.thenStatement)) {
          collectGuardComparisons(statement.expression, info.aliases, context, info.constraints);
        }
      }
    }
  }

  for (const info of functions) {
    const visitCalls = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        info.calls.push({
          name: node.expression.text,
          position: node.pos,
          arguments: node.arguments.map((argument) => (
            ts.isIdentifier(argument)
              ? { name: argument.text, type: info.aliases.get(argument.text) ?? "" }
              : { name: "", type: "" }
          )),
        });
      }
      ts.forEachChild(node, visitCalls);
    };
    if (info.node.body) visitCalls(info.node.body);
  }

  for (let iteration = 0; iteration < functions.length; iteration += 1) {
    let changed = false;
    for (const caller of functions) {
      for (const call of caller.calls) {
        const candidates = (functionsByName.get(call.name) ?? []).filter((candidate) => candidate.path === caller.path);
        if (candidates.length !== 1) continue;
        const callee = candidates[0];
        call.arguments.forEach((argument, index) => {
          if (!argument.name || !argument.type) return;
          const parameter = callee.node.parameters[index];
          if (!parameter || !ts.isIdentifier(parameter.name) || callee.aliases.get(parameter.name.text) !== argument.type) return;
          for (const domain of context.objects.get(argument.type)?.values() ?? []) {
            const values = constraintForVariable(caller, argument.name, domain, call.position);
            if (!values || values.size !== 1) continue;
            const parameterKey = constraintKey(parameter.name.text, domain.symbol);
            const target = callee.constraints.get(parameterKey) ?? new Set<string>();
            const before = target.size;
            target.add([...values][0]);
            callee.constraints.set(parameterKey, target);
            if (target.size !== before) changed = true;
          }
        });
      }
    }
    if (!changed) break;
  }
  return context;
}

/** Returns the nearest containing function info for a node. */
function containingFunction(context: Context, path: string, node: ts.Node): FunctionInfo | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionLike(current)) {
      const info = context.functionsByNode.get(current as ts.FunctionLikeDeclaration);
      return info?.path === path ? info : undefined;
    }
    current = current.parent;
  }
  return undefined;
}

/** Proves a hook setter's from-state from an enclosing equality guard. */
function guardedHookFrom(node: ts.Node, hook: HookInfo): string | undefined {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    const parent = current.parent;
    if (ts.isIfStatement(parent) && parent.thenStatement === current) {
      const condition = parent.expression;
      if (
        ts.isBinaryExpression(condition)
        && (condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken || condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken)
        && ts.isIdentifier(condition.left)
        && condition.left.text === hook.stateName
        && ts.isStringLiteralLike(condition.right)
      ) return condition.right.text;
    }
    current = parent;
  }
  return undefined;
}

/** Proves the APK completion callback edge from its explicit lifecycle reset. */
function lifecycleCallbackFrom(node: ts.Node, hook: HookInfo): string | undefined {
  let callbackProperty: ts.PropertyAssignment | undefined;
  let current: ts.Node | undefined = node.parent;
  while (current && current !== hook.owner) {
    if (
      ts.isPropertyAssignment(current)
      && (ts.isIdentifier(current.name) || ts.isStringLiteralLike(current.name))
      && current.name.text === "complete"
    ) {
      callbackProperty = current;
      break;
    }
    current = current.parent;
  }
  if (!callbackProperty) return undefined;
  current = callbackProperty.parent;
  while (current && current !== hook.owner) {
    if (
      isBodyFunction(current)
      && ts.isBlock(current.body)
      && ts.isCallExpression(current.parent)
      && ts.isIdentifier(current.parent.expression)
      && current.parent.expression.text === "useEffect"
    ) {
      const registrationStatement = current.body.statements.find(
        (statement) => statement.pos <= callbackProperty!.pos && statement.end >= callbackProperty!.end,
      );
      if (!registrationStatement) return undefined;
      for (const statement of current.body.statements) {
        if (statement === registrationStatement) break;
        if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue;
        const call = statement.expression;
        if (
          ts.isIdentifier(call.expression)
          && call.expression.text === hook.setterName
          && call.arguments.length === 1
          && ts.isStringLiteralLike(call.arguments[0])
        ) return call.arguments[0].text;
      }
      return undefined;
    }
    current = current.parent;
  }
  return undefined;
}

/** Converts one literal write syntax node into a raw compiler fact. */
function makeFact(
  source: ts.SourceFile,
  path: string,
  domain: Domain,
  target: string,
  node: ts.Node,
  from: string | undefined,
  proof: string | undefined,
  writeKind: string,
): WriteFact | undefined {
  if (!domain.literals.has(target) || from === target) return undefined;
  const [startLine, endLine] = lines(source, node);
  return {
    path,
    source_symbol: domain.symbol,
    to_state_id: target,
    proven_from_state_id: from ?? null,
    proof_kind: proof ?? null,
    start_line: startLine,
    end_line: endLine,
    write_kind: writeKind,
  };
}

/** Finds the typed Zustand store that owns one setter call. */
function owningStore(
  context: Context,
  path: string,
  call: ts.CallExpression,
): StoreInfo | undefined {
  if (!ts.isIdentifier(call.expression)) return undefined;
  const setterName = call.expression.text;
  return (context.storesByFile.get(path) ?? []).find(
    (store) => (
      store.setterName === setterName
      && call.pos >= store.owner.pos
      && call.end <= store.owner.end
    ),
  );
}

/** Maps local destructuring names back to properties read from one store getter. */
function storeReadAliases(owner: BodyFunction, store: StoreInfo): Map<string, string> {
  const aliases = new Map<string, string>();
  if (!store.getterName) return aliases;
  const visit = (node: ts.Node): void => {
    if (node !== owner && ts.isFunctionLike(node)) return;
    if (
      ts.isVariableDeclaration(node)
      && ts.isObjectBindingPattern(node.name)
      && node.initializer
      && ts.isCallExpression(node.initializer)
      && ts.isIdentifier(node.initializer.expression)
      && node.initializer.expression.text === store.getterName
    ) {
      for (const element of node.name.elements) {
        if (!ts.isIdentifier(element.name)) continue;
        const property = element.propertyName && ts.isIdentifier(element.propertyName)
          ? element.propertyName.text
          : element.name.text;
        aliases.set(element.name.text, property);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(owner);
  return aliases;
}

/** Extracts one exact property literal from a guard expression. */
function guardLiteral(
  expression: ts.Expression,
  property: string,
  aliases: Map<string, string>,
  stateParameter: string | undefined,
  comparisonKinds: Set<ts.SyntaxKind>,
  logicalKind: ts.SyntaxKind,
): string | undefined {
  const current = unwrappedExpression(expression);
  if (!ts.isBinaryExpression(current)) return undefined;
  if (current.operatorToken.kind === logicalKind) {
    return guardLiteral(current.left, property, aliases, stateParameter, comparisonKinds, logicalKind)
      ?? guardLiteral(current.right, property, aliases, stateParameter, comparisonKinds, logicalKind);
  }
  if (!comparisonKinds.has(current.operatorToken.kind)) return undefined;
  const pairs: Array<[ts.Expression, ts.Expression]> = [
    [current.left, current.right],
    [current.right, current.left],
  ];
  for (const [candidate, literal] of pairs) {
    if (!ts.isStringLiteralLike(literal)) continue;
    if (ts.isIdentifier(candidate) && aliases.get(candidate.text) === property) return literal.text;
    if (
      stateParameter
      && ts.isPropertyAccessExpression(candidate)
      && ts.isIdentifier(candidate.expression)
      && candidate.expression.text === stateParameter
      && candidate.name.text === property
    ) return literal.text;
  }
  return undefined;
}

/** Returns the nearest executable function that contains a store write. */
function nearestBodyOwner(node: ts.Node, boundary: BodyFunction): BodyFunction | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isBodyFunction(current)) return current;
    if (current === boundary) break;
    current = current.parent;
  }
  return undefined;
}

/** Finds the top-level statement in a function body that contains one node. */
function owningTopLevelStatement(block: ts.Block, node: ts.Node): ts.Statement | undefined {
  return block.statements.find((statement) => statement.pos <= node.pos && statement.end >= node.end);
}

/** Proves the current store property from an enclosing or fallthrough guard. */
function guardedStoreFrom(
  node: ts.Node,
  store: StoreInfo,
  property: string,
  callback?: BodyFunction,
): string | undefined {
  const owner = callback ?? nearestBodyOwner(node, store.owner);
  if (!owner) return undefined;
  const stateParameter = callback && callback.parameters[0] && ts.isIdentifier(callback.parameters[0].name)
    ? callback.parameters[0].name.text
    : undefined;
  const aliases = storeReadAliases(owner, store);
  let current: ts.Node | undefined = node;
  while (current.parent && current !== owner) {
    const parent = current.parent;
    if (ts.isIfStatement(parent) && parent.thenStatement === current) {
      const from = guardLiteral(
        parent.expression,
        property,
        aliases,
        stateParameter,
        new Set([ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken]),
        ts.SyntaxKind.AmpersandAmpersandToken,
      );
      if (from) return from;
    }
    current = parent;
  }
  if (!ts.isBlock(owner.body)) return undefined;
  const targetStatement = owningTopLevelStatement(owner.body, node);
  if (!targetStatement) return undefined;
  for (const statement of owner.body.statements) {
    if (statement === targetStatement) break;
    if (!ts.isIfStatement(statement) || !containsReturn(statement.thenStatement)) continue;
    const from = guardLiteral(
      statement.expression,
      property,
      aliases,
      stateParameter,
      new Set([ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken]),
      ts.SyntaxKind.BarBarToken,
    );
    if (from) return from;
  }
  return undefined;
}

/** Resolves a returned shorthand through one guarded conditional local. */
function derivedStoreWrite(
  callback: BodyFunction,
  property: string,
  identifier: ts.Identifier,
): { target: string; from: string; node: ts.Node } | undefined {
  if (!ts.isBlock(callback.body) || !callback.parameters[0] || !ts.isIdentifier(callback.parameters[0].name)) {
    return undefined;
  }
  const stateParameter = callback.parameters[0].name.text;
  let declaration: ts.VariableDeclaration | undefined;
  const visit = (node: ts.Node): void => {
    if (declaration || (node !== callback && ts.isFunctionLike(node))) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === identifier.text) {
      declaration = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  const initializer = declaration?.initializer;
  if (!initializer || !ts.isConditionalExpression(initializer)) return undefined;
  const fallback = unwrappedExpression(initializer.whenFalse);
  if (
    !ts.isStringLiteralLike(initializer.whenTrue)
    || !ts.isPropertyAccessExpression(fallback)
    || !ts.isIdentifier(fallback.expression)
    || fallback.expression.text !== stateParameter
    || fallback.name.text !== property
  ) return undefined;
  const from = guardLiteral(
    initializer.condition,
    property,
    new Map(),
    stateParameter,
    new Set([ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken]),
    ts.SyntaxKind.AmpersandAmpersandToken,
  );
  return from ? { target: initializer.whenTrue.text, from, node: initializer } : undefined;
}

/** Returns every object literal returned by one functional setter callback. */
function returnedStoreObjects(callback: BodyFunction): ts.ObjectLiteralExpression[] {
  const concise = conciseObjectBody(callback);
  if (concise) return [concise];
  if (!ts.isBlock(callback.body)) return [];
  const objects: ts.ObjectLiteralExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== callback && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) {
      const expression = unwrappedExpression(node.expression);
      if (ts.isObjectLiteralExpression(expression)) objects.push(expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return objects;
}

/** Enumerates declared-domain writes from one Zustand setter call. */
function enumerateStoreSetFacts(
  context: Context,
  path: string,
  source: ts.SourceFile,
  call: ts.CallExpression,
): WriteFact[] {
  const store = owningStore(context, path, call);
  if (!store || call.arguments.length !== 1) return [];
  const facts: WriteFact[] = [];
  const argument = unwrappedExpression(call.arguments[0]);
  const callback = isBodyFunction(argument) ? argument : undefined;
  const objects = ts.isObjectLiteralExpression(argument)
    ? [argument]
    : callback
      ? returnedStoreObjects(callback)
      : [];
  for (const object of objects) {
    for (const propertyNode of object.properties) {
      if (!ts.isPropertyAssignment(propertyNode)) continue;
      const property = ts.isIdentifier(propertyNode.name) || ts.isStringLiteralLike(propertyNode.name)
        ? propertyNode.name.text
        : undefined;
      if (!property) continue;
      const domain = storeDomain(context, store, property);
      if (!domain) continue;
      const from = guardedStoreFrom(propertyNode, store, property, callback);
      for (const target of expressionLiterals(propertyNode.initializer)) {
        const fact = makeFact(
          source,
          path,
          domain,
          target,
          propertyNode,
          from,
          from ? "ast-zustand-guarded-write" : undefined,
          callback ? "zustand-functional-set-property" : "zustand-object-set-property",
        );
        if (fact) facts.push(fact);
      }
      if (callback && ts.isIdentifier(propertyNode.initializer)) {
        const derived = derivedStoreWrite(callback, property, propertyNode.initializer);
        if (!derived) continue;
        const fact = makeFact(
          source,
          path,
          domain,
          derived.target,
          derived.node,
          derived.from,
          "ast-zustand-conditional-guarded-write",
          "zustand-functional-derived-property",
        );
        if (fact) facts.push(fact);
      }
    }
  }
  return facts;
}

/** Enumerates Phase-1 executable domain writes for one source file. */
function enumeratePhase1FileFacts(context: Context, path: string, source: ts.SourceFile): WriteFact[] {
  const facts: WriteFact[] = [];
  const hooks = context.hooksByFile.get(path) ?? [];
  const visit = (node: ts.Node): void => {
    const info = containingFunction(context, path, node);
    if (ts.isCallExpression(node)) {
      facts.push(...enumerateStoreSetFacts(context, path, source, node));
    }
    if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression) && info) {
      const spread = node.expression.properties.find(ts.isSpreadAssignment);
      const spreadName = spread && ts.isIdentifier(spread.expression) ? spread.expression.text : undefined;
      const objectType = spreadName ? info.aliases.get(spreadName) : undefined;
      if (objectType) {
        for (const property of node.expression.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name) ? property.name.text : undefined;
          if (!propertyName) continue;
          const domain = objectDomain(context, objectType, propertyName);
          if (!domain) continue;
          const constraint = constraintForVariable(info, spreadName!, domain, property.pos);
          const from = constraint?.size === 1 ? [...constraint][0] : undefined;
          for (const target of expressionLiterals(property.initializer)) {
            const fact = makeFact(source, path, domain, target, property, from, from ? "ast-entry-guarded-write" : undefined, "return-object-property");
            if (fact) facts.push(fact);
          }
        }
      }
    }
    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left)
      && ts.isIdentifier(node.left.expression)
      && info
    ) {
      const domain = objectDomain(context, info.aliases.get(node.left.expression.text), node.left.name.text);
      if (domain) {
        const constraint = constraintForVariable(info, node.left.expression.text, domain, node.pos);
        const from = constraint?.size === 1 ? [...constraint][0] : undefined;
        for (const target of expressionLiterals(node.right)) {
          const fact = makeFact(source, path, domain, target, node, from, from ? "ast-propagated-entry-guarded-write" : undefined, "property-assignment");
          if (fact) facts.push(fact);
        }
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.arguments.length === 1) {
      const setterName = node.expression.text;
      const hook = hooks.find((candidate) => candidate.setterName === setterName);
      if (hook) {
        const argument = node.arguments[0];
        if (hook.scalar && ts.isStringLiteralLike(argument)) {
          const guarded = guardedHookFrom(node, hook);
          const lifecycle = guarded ? undefined : lifecycleCallbackFrom(node, hook);
          const from = guarded ?? lifecycle;
          const fact = makeFact(source, path, hook.scalar, argument.text, node, from, guarded ? "ast-guarded-setter-call" : lifecycle ? "ast-lifecycle-reset-callback-write" : undefined, "hook-setter-call");
          if (fact) facts.push(fact);
        }
        if (hook.objectType && ts.isObjectLiteralExpression(argument) && info) {
          const spread = argument.properties.find(ts.isSpreadAssignment);
          const inherited = spread && ts.isIdentifier(spread.expression) ? info.knownValues.get(spread.expression.text) : undefined;
          for (const property of argument.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name) ? property.name.text : undefined;
            if (!propertyName) continue;
            const domain = objectDomain(context, hook.objectType, propertyName);
            if (!domain) continue;
            for (const target of expressionLiterals(property.initializer)) {
              const from = inherited?.get(propertyName);
              const fact = makeFact(source, path, domain, target, property, from, from ? "ast-object-spread-state-write" : undefined, "hook-object-setter-call");
              if (fact) facts.push(fact);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return facts;
}

/** Independently enumerates Phase-2 raw domain writes from compiler nodes. */
function enumeratePhase2FileFacts(context: Context, path: string, source: ts.SourceFile): WriteFact[] {
  const rawFacts: WriteFact[] = [];
  const rawHooks = context.hooksByFile.get(path) ?? [];
  const visitRawWrite = (node: ts.Node): void => {
    const owner = containingFunction(context, path, node);
    if (ts.isCallExpression(node)) {
      rawFacts.push(...enumerateStoreSetFacts(context, path, source, node));
    }

    if (ts.isReturnStatement(node) && node.expression && ts.isObjectLiteralExpression(node.expression) && owner) {
      const spread = node.expression.properties.find(ts.isSpreadAssignment);
      const spreadName = spread && ts.isIdentifier(spread.expression) ? spread.expression.text : undefined;
      const ownerType = spreadName ? owner.aliases.get(spreadName) : undefined;
      if (ownerType) {
        for (const property of node.expression.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)
            ? property.name.text
            : undefined;
          if (!propertyName) continue;
          const domain = objectDomain(context, ownerType, propertyName);
          if (!domain) continue;
          const constraints = constraintForVariable(owner, spreadName!, domain, property.pos);
          const fromState = constraints?.size === 1 ? [...constraints][0] : undefined;
          for (const targetState of expressionLiterals(property.initializer)) {
            const fact = makeFact(
              source,
              path,
              domain,
              targetState,
              property,
              fromState,
              fromState ? "ast-entry-guarded-write" : undefined,
              "return-object-property",
            );
            if (fact) rawFacts.push(fact);
          }
        }
      }
    }

    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left)
      && ts.isIdentifier(node.left.expression)
      && owner
    ) {
      const domain = objectDomain(context, owner.aliases.get(node.left.expression.text), node.left.name.text);
      if (domain) {
        const constraints = constraintForVariable(owner, node.left.expression.text, domain, node.pos);
        const fromState = constraints?.size === 1 ? [...constraints][0] : undefined;
        for (const targetState of expressionLiterals(node.right)) {
          const fact = makeFact(
            source,
            path,
            domain,
            targetState,
            node,
            fromState,
            fromState ? "ast-propagated-entry-guarded-write" : undefined,
            "property-assignment",
          );
          if (fact) rawFacts.push(fact);
        }
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.arguments.length === 1) {
      const rawSetterName = node.expression.text;
      const hook = rawHooks.find((candidate) => candidate.setterName === rawSetterName);
      if (hook) {
        const argument = node.arguments[0];
        if (hook.scalar && ts.isStringLiteralLike(argument)) {
          const guardedState = guardedHookFrom(node, hook);
          const lifecycleState = guardedState ? undefined : lifecycleCallbackFrom(node, hook);
          const fromState = guardedState ?? lifecycleState;
          const fact = makeFact(
            source,
            path,
            hook.scalar,
            argument.text,
            node,
            fromState,
            guardedState
              ? "ast-guarded-setter-call"
              : lifecycleState
                ? "ast-lifecycle-reset-callback-write"
                : undefined,
            "hook-setter-call",
          );
          if (fact) rawFacts.push(fact);
        }
        if (hook.objectType && ts.isObjectLiteralExpression(argument) && owner) {
          const spread = argument.properties.find(ts.isSpreadAssignment);
          const inherited = spread && ts.isIdentifier(spread.expression)
            ? owner.knownValues.get(spread.expression.text)
            : undefined;
          for (const property of argument.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const propertyName = ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)
              ? property.name.text
              : undefined;
            if (!propertyName) continue;
            const domain = objectDomain(context, hook.objectType, propertyName);
            if (!domain) continue;
            for (const targetState of expressionLiterals(property.initializer)) {
              const fromState = inherited?.get(propertyName);
              const fact = makeFact(
                source,
                path,
                domain,
                targetState,
                property,
                fromState,
                fromState ? "ast-object-spread-state-write" : undefined,
                "hook-object-setter-call",
              );
              if (fact) rawFacts.push(fact);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visitRawWrite);
  };
  visitRawWrite(source);
  return rawFacts;
}

/** Phase-1 traversal, intentionally separate from the Phase-2 entry point. */
function enumeratePhase1Facts(context: Context): WriteFact[] {
  const facts: WriteFact[] = [];
  for (const [path, source] of context.files) facts.push(...enumeratePhase1FileFacts(context, path, source));
  return facts;
}

/** Phase-2 raw traversal, independently iterating every parsed frozen source. */
function enumeratePhase2Facts(context: Context): WriteFact[] {
  const byPath = [...context.files.keys()].sort();
  return byPath.flatMap((path) => enumeratePhase2FileFacts(context, path, context.files.get(path)!));
}

/** Parses stdin, executes the selected independent traversal, and writes JSON facts. */
function main(): void {
  const chunks: Buffer[] = [];
  process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
  process.stdin.on("end", () => {
    const request = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Request;
    if (!request || (request.mode !== "phase1" && request.mode !== "phase2") || !request.sources) {
      throw new Error("invalid transition AST request");
    }
    const context = buildContext(request);
    const facts = request.mode === "phase1" ? enumeratePhase1Facts(context) : enumeratePhase2Facts(context);
    const unique = new Map<string, WriteFact>();
    for (const fact of facts) {
      unique.set(JSON.stringify([fact.path, fact.source_symbol, fact.to_state_id, fact.start_line, fact.write_kind]), fact);
    }
    process.stdout.write(JSON.stringify({ literal_domain_writes: [...unique.values()] }));
  });
}

main();
