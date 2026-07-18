const FORMAT = "reading-advantage.durable-value.v1";

type EncodedValue =
  | readonly ["undefined"]
  | readonly ["null"]
  | readonly ["boolean", boolean]
  | readonly ["number", string]
  | readonly ["bigint", string]
  | readonly ["string", string]
  | readonly ["reference", number];

type EncodedNode =
  | readonly ["array", number, readonly (readonly [number, EncodedValue])[]]
  | readonly [
      "object",
      "default" | "null",
      readonly (readonly [string, EncodedValue])[],
    ]
  | readonly ["map", readonly (readonly [EncodedValue, EncodedValue])[]]
  | readonly ["set", readonly EncodedValue[]]
  | readonly ["date", string]
  | readonly ["regexp", string, string, number]
  | readonly ["url", string]
  | readonly ["array-buffer", string]
  | readonly ["typed-array", string, EncodedValue, number, number];

/** JSON-safe tagged graph persisted for an arbitrary validated capability value. */
export interface DurableValueEnvelope {
  /** Versioned codec identifier used to reject incompatible stored data. */
  readonly format: typeof FORMAT;
  /** Root primitive or reference into the node graph. */
  readonly root: EncodedValue;
  /** Identity-preserving graph nodes in deterministic traversal order. */
  readonly nodes: readonly EncodedNode[];
}

function canonicalNumber(value: number): string {
  if (Number.isNaN(value)) return "nan";
  if (value === Number.POSITIVE_INFINITY) return "+infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-infinity";
  if (Object.is(value, -0)) return "-0";
  return String(value);
}

function canonicalPrimitive(value: unknown): string | undefined {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "boolean") return `boolean:${value ? "true" : "false"}`;
  if (typeof value === "number") return `number:${canonicalNumber(value)}`;
  if (typeof value === "bigint") return `bigint:${value.toString(10)}`;
  if (typeof value === "string") return `string:${JSON.stringify(value)}`;
  return undefined;
}

function bytesToHex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function viewLength(value: ArrayBufferView): number {
  return value instanceof DataView
    ? value.byteLength
    : (value as ArrayBufferView & { readonly length: number }).length;
}

function regexpLastIndex(value: RegExp): number {
  if (!Number.isSafeInteger(value.lastIndex) || value.lastIndex < 0) {
    throw new TypeError("Unsupported durable regular expression state.");
  }
  return value.lastIndex;
}

function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[a-f0-9]{2})*$/u.test(value)) {
    throw new TypeError("Malformed durable byte encoding.");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function assertPlainDataObject(
  value: object,
): asserts value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Unsupported durable value object.");
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError("Symbol-keyed durable values are unsupported.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((descriptor) =>
    descriptor.enumerable !== true || !("value" in descriptor))) {
    throw new TypeError("Accessor or hidden durable values are unsupported.");
  }
}

/**
 * Produces a deterministic tagged representation for capability fingerprints.
 * @param value Validated input or idempotency key.
 * @returns Collision-resistant canonical text preserving supported value types.
 * @throws When the value contains unsupported executable or accessor state.
 */
export function canonicalizeDurableValue(value: unknown): string {
  const seen = new Map<object, number>();
  let nextReference = 0;
  const visit = (candidate: unknown): string => {
    const primitive = canonicalPrimitive(candidate);
    if (primitive !== undefined) return primitive;
    if (typeof candidate !== "object" || candidate === null) {
      throw new TypeError("Unsupported durable value.");
    }
    const existing = seen.get(candidate);
    if (existing !== undefined) return `reference:${existing}`;
    const reference = nextReference;
    nextReference += 1;
    seen.set(candidate, reference);
    if (candidate instanceof Date) {
      if (Number.isNaN(candidate.getTime())) throw new TypeError("Invalid durable date.");
      return `date:${reference}:${candidate.toISOString()}`;
    }
    if (candidate instanceof RegExp) {
      return `regexp:${reference}:${JSON.stringify(candidate.source)}:` +
        `${candidate.flags}:${regexpLastIndex(candidate)}`;
    }
    if (candidate instanceof URL) {
      return `url:${reference}:${JSON.stringify(candidate.href)}`;
    }
    if (candidate instanceof ArrayBuffer) {
      return `array-buffer:${reference}:${bytesToHex(new Uint8Array(candidate))}`;
    }
    if (ArrayBuffer.isView(candidate)) {
      return `typed-array:${reference}:${candidate.constructor.name}:` +
        `buffer=${visit(candidate.buffer)}:offset=${candidate.byteOffset}:` +
        `length=${viewLength(candidate)}`;
    }
    if (Array.isArray(candidate)) {
      const items: string[] = [];
      for (let index = 0; index < candidate.length; index += 1) {
        items.push(index in candidate ? visit(candidate[index]) : "array-hole");
      }
      return `array:${reference}:[${items.join(",")}]`;
    }
    if (candidate instanceof Map) {
      const entries = [...candidate.entries()];
      return `map:${reference}:{${entries.map(([key, item]) =>
        `${visit(key)}=>${visit(item)}`).join(",")}}`;
    }
    if (candidate instanceof Set) {
      return `set:${reference}:{${[...candidate].map(visit).join(",")}}`;
    }
    assertPlainDataObject(candidate);
    return `object:${reference}:{${Object.keys(candidate).sort().map((key) =>
      `${JSON.stringify(key)}:${visit(candidate[key])}`).join(",")}}`;
  };
  return visit(value);
}

function encodePrimitive(value: unknown): EncodedValue | undefined {
  if (value === undefined) return ["undefined"];
  if (value === null) return ["null"];
  if (typeof value === "boolean") return ["boolean", value];
  if (typeof value === "number") return ["number", canonicalNumber(value)];
  if (typeof value === "bigint") return ["bigint", value.toString(10)];
  if (typeof value === "string") return ["string", value];
  return undefined;
}

/**
 * Encodes a validated capability output into a JSON-safe tagged object graph.
 * @param value Validated output to retain for durable replay.
 * @returns Versioned graph preserving type, cycles, and shared references.
 * @throws Before persistence when unsupported executable or accessor state exists.
 */
export function encodeDurableValue(value: unknown): DurableValueEnvelope {
  const nodes: EncodedNode[] = [];
  const seen = new Map<object, number>();
  const visit = (candidate: unknown): EncodedValue => {
    const primitive = encodePrimitive(candidate);
    if (primitive !== undefined) return primitive;
    if (typeof candidate !== "object" || candidate === null) {
      throw new TypeError("Unsupported durable value.");
    }
    const existing = seen.get(candidate);
    if (existing !== undefined) return ["reference", existing];
    const reference = nodes.length;
    seen.set(candidate, reference);
    nodes.push(["object", "default", []]);
    let node: EncodedNode;
    if (candidate instanceof Date) {
      if (Number.isNaN(candidate.getTime())) throw new TypeError("Invalid durable date.");
      node = ["date", candidate.toISOString()];
    } else if (candidate instanceof RegExp) {
      node = [
        "regexp",
        candidate.source,
        candidate.flags,
        regexpLastIndex(candidate),
      ];
    } else if (candidate instanceof URL) {
      node = ["url", candidate.href];
    } else if (candidate instanceof ArrayBuffer) {
      node = ["array-buffer", bytesToHex(new Uint8Array(candidate))];
    } else if (ArrayBuffer.isView(candidate)) {
      node = [
        "typed-array",
        candidate.constructor.name,
        visit(candidate.buffer),
        candidate.byteOffset,
        viewLength(candidate),
      ];
    } else if (Array.isArray(candidate)) {
      const entries: [number, EncodedValue][] = [];
      for (let index = 0; index < candidate.length; index += 1) {
        if (index in candidate) entries.push([index, visit(candidate[index])]);
      }
      node = ["array", candidate.length, entries];
    } else if (candidate instanceof Map) {
      const entries = [...candidate.entries()]
        .map(([key, item]) => [visit(key), visit(item)] as const);
      node = ["map", entries];
    } else if (candidate instanceof Set) {
      const items = [...candidate].map(visit);
      node = ["set", items];
    } else {
      assertPlainDataObject(candidate);
      node = [
        "object",
        Object.getPrototypeOf(candidate) === null ? "null" : "default",
        Object.keys(candidate).sort().map((key) => [key, visit(candidate[key])]),
      ];
    }
    nodes[reference] = node;
    return ["reference", reference];
  };
  return { format: FORMAT, root: visit(value), nodes };
}

function decodeNumber(value: string): number {
  if (value === "nan") return Number.NaN;
  if (value === "+infinity") return Number.POSITIVE_INFINITY;
  if (value === "-infinity") return Number.NEGATIVE_INFINITY;
  if (value === "-0") return -0;
  const decoded = Number(value);
  if (!Number.isFinite(decoded) || String(decoded) !== value) {
    throw new TypeError("Malformed durable number.");
  }
  return decoded;
}

function assertExactTuple(
  value: unknown,
  length: number,
  message: string,
): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new TypeError(message);
  }
}

function readNonnegativeSafeInteger(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(message);
  }
  return value;
}

function assertEncodedValueShape(
  value: unknown,
  nodeCount: number,
): asserts value is EncodedValue {
  if (!Array.isArray(value) || typeof value[0] !== "string") {
    throw new TypeError("Malformed durable graph value.");
  }
  switch (value[0]) {
    case "undefined":
    case "null":
      assertExactTuple(value, 1, "Malformed durable primitive.");
      break;
    case "boolean":
      assertExactTuple(value, 2, "Malformed durable boolean.");
      if (typeof value[1] !== "boolean") {
        throw new TypeError("Malformed durable boolean.");
      }
      break;
    case "number":
      assertExactTuple(value, 2, "Malformed durable number.");
      if (typeof value[1] !== "string") {
        throw new TypeError("Malformed durable number.");
      }
      decodeNumber(value[1]);
      break;
    case "bigint":
      assertExactTuple(value, 2, "Malformed durable bigint.");
      if (typeof value[1] !== "string" ||
          !/^(?:0|[1-9]\d*|-[1-9]\d*)$/u.test(value[1])) {
        throw new TypeError("Malformed durable bigint.");
      }
      break;
    case "string":
      assertExactTuple(value, 2, "Malformed durable string.");
      if (typeof value[1] !== "string") {
        throw new TypeError("Malformed durable string.");
      }
      break;
    case "reference": {
      assertExactTuple(value, 2, "Malformed durable graph reference.");
      const reference = readNonnegativeSafeInteger(
        value[1],
        "Malformed durable graph reference.",
      );
      if (reference >= nodeCount) {
        throw new TypeError("Malformed durable graph reference.");
      }
      break;
    }
    default:
      throw new TypeError("Unknown durable graph value.");
  }
}

function encodedSameValueZeroToken(value: EncodedValue): string {
  if (value[0] === "number" && (value[1] === "0" || value[1] === "-0")) {
    return JSON.stringify(["number", "zero"]);
  }
  return JSON.stringify(value);
}

function assertNodeShape(
  value: unknown,
  nodeCount: number,
): asserts value is EncodedNode {
  if (!Array.isArray(value) || typeof value[0] !== "string") {
    throw new TypeError("Malformed durable graph node.");
  }
  switch (value[0]) {
    case "array": {
      assertExactTuple(value, 3, "Malformed durable array node.");
      const length = readNonnegativeSafeInteger(
        value[1],
        "Malformed durable array length.",
      );
      if (length > 0xffff_ffff || !Array.isArray(value[2])) {
        throw new TypeError("Malformed durable array node.");
      }
      const keys = new Set<number>();
      for (const entry of value[2]) {
        assertExactTuple(entry, 2, "Malformed durable array entry.");
        const key = readNonnegativeSafeInteger(
          entry[0],
          "Malformed durable array key.",
        );
        if (key >= length || keys.has(key)) {
          throw new TypeError("Malformed durable array key.");
        }
        keys.add(key);
        assertEncodedValueShape(entry[1], nodeCount);
      }
      break;
    }
    case "object": {
      assertExactTuple(value, 3, "Malformed durable object node.");
      if ((value[1] !== "default" && value[1] !== "null") ||
          !Array.isArray(value[2])) {
        throw new TypeError("Malformed durable object node.");
      }
      const keys = new Set<string>();
      for (const entry of value[2]) {
        assertExactTuple(entry, 2, "Malformed durable object entry.");
        if (typeof entry[0] !== "string" || keys.has(entry[0])) {
          throw new TypeError("Malformed durable object key.");
        }
        keys.add(entry[0]);
        assertEncodedValueShape(entry[1], nodeCount);
      }
      break;
    }
    case "map": {
      assertExactTuple(value, 2, "Malformed durable map node.");
      if (!Array.isArray(value[1])) {
        throw new TypeError("Malformed durable map entries.");
      }
      const keys = Object.create(null) as Record<string, true>;
      for (const entry of value[1]) {
        assertExactTuple(entry, 2, "Malformed durable map entry.");
        assertEncodedValueShape(entry[0], nodeCount);
        assertEncodedValueShape(entry[1], nodeCount);
        const token = encodedSameValueZeroToken(entry[0]);
        if (Object.hasOwn(keys, token)) {
          throw new TypeError("Malformed durable duplicate map key.");
        }
        keys[token] = true;
      }
      break;
    }
    case "set": {
      assertExactTuple(value, 2, "Malformed durable set node.");
      if (!Array.isArray(value[1])) {
        throw new TypeError("Malformed durable set entries.");
      }
      const items = Object.create(null) as Record<string, true>;
      for (const item of value[1]) {
        assertEncodedValueShape(item, nodeCount);
        const token = encodedSameValueZeroToken(item);
        if (Object.hasOwn(items, token)) {
          throw new TypeError("Malformed durable duplicate set item.");
        }
        items[token] = true;
      }
      break;
    }
    case "date": {
      assertExactTuple(value, 2, "Malformed durable date node.");
      if (typeof value[1] !== "string") {
        throw new TypeError("Malformed durable date.");
      }
      const date = new Date(value[1]);
      if (Number.isNaN(date.getTime()) || date.toISOString() !== value[1]) {
        throw new TypeError("Malformed durable date.");
      }
      break;
    }
    case "regexp": {
      assertExactTuple(value, 4, "Malformed durable regular expression node.");
      if (typeof value[1] !== "string" || typeof value[2] !== "string") {
        throw new TypeError("Malformed durable regular expression.");
      }
      const lastIndex = readNonnegativeSafeInteger(
        value[3],
        "Malformed durable regular expression state.",
      );
      const expression = new RegExp(value[1], value[2]);
      if (expression.source !== value[1] || expression.flags !== value[2] ||
          lastIndex !== value[3]) {
        throw new TypeError("Malformed durable regular expression.");
      }
      break;
    }
    case "url": {
      assertExactTuple(value, 2, "Malformed durable URL node.");
      if (typeof value[1] !== "string") {
        throw new TypeError("Malformed durable URL.");
      }
      const url = new URL(value[1]);
      if (url.href !== value[1]) throw new TypeError("Malformed durable URL.");
      break;
    }
    case "array-buffer":
      assertExactTuple(value, 2, "Malformed durable array-buffer node.");
      if (typeof value[1] !== "string") {
        throw new TypeError("Malformed durable byte encoding.");
      }
      hexToBytes(value[1]);
      break;
    case "typed-array":
      assertExactTuple(value, 5, "Malformed durable typed-array node.");
      if (typeof value[1] !== "string") {
        throw new TypeError("Malformed durable typed-array constructor.");
      }
      assertEncodedValueShape(value[2], nodeCount);
      readNonnegativeSafeInteger(
        value[3],
        "Malformed durable typed-array bounds.",
      );
      readNonnegativeSafeInteger(
        value[4],
        "Malformed durable typed-array bounds.",
      );
      break;
    default:
      throw new TypeError("Unknown durable graph node.");
  }
}

function createTypedArray(
  name: string,
  buffer: ArrayBuffer,
  byteOffset: number,
  length: number,
): ArrayBufferView {
  if (!Number.isInteger(byteOffset) || byteOffset < 0 ||
      !Number.isInteger(length) || length < 0) {
    throw new TypeError("Malformed durable typed-array bounds.");
  }
  switch (name) {
    case "DataView": return new DataView(buffer, byteOffset, length);
    case "Int8Array": return new Int8Array(buffer, byteOffset, length);
    case "Uint8Array": return new Uint8Array(buffer, byteOffset, length);
    case "Uint8ClampedArray": {
      return new Uint8ClampedArray(buffer, byteOffset, length);
    }
    case "Int16Array": return new Int16Array(buffer, byteOffset, length);
    case "Uint16Array": return new Uint16Array(buffer, byteOffset, length);
    case "Int32Array": return new Int32Array(buffer, byteOffset, length);
    case "Uint32Array": return new Uint32Array(buffer, byteOffset, length);
    case "Float32Array": return new Float32Array(buffer, byteOffset, length);
    case "Float64Array": return new Float64Array(buffer, byteOffset, length);
    case "BigInt64Array": return new BigInt64Array(buffer, byteOffset, length);
    case "BigUint64Array": return new BigUint64Array(buffer, byteOffset, length);
    default: throw new TypeError("Unsupported durable typed array.");
  }
}

function assertEnvelope(value: unknown): asserts value is DurableValueEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Malformed durable value envelope.");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(value).sort();
  if (keys.length !== 3 || keys[0] !== "format" || keys[1] !== "nodes" ||
      keys[2] !== "root" ||
      !Object.hasOwn(value, "format") || record.format !== FORMAT ||
      !Object.hasOwn(value, "root") ||
      !Object.hasOwn(value, "nodes") || !Array.isArray(record.nodes)) {
    throw new TypeError("Malformed durable value envelope.");
  }
}

/**
 * Decodes a tagged durable graph into the original capability output surface.
 * @param candidate JSON value loaded from durable idempotency storage.
 * @returns Reconstructed value with cycles and shared references restored.
 * @throws When stored data is malformed, unsupported, or version-incompatible.
 */
export function decodeDurableValue(candidate: unknown): unknown {
  assertEnvelope(candidate);
  const rawNodes: readonly unknown[] = candidate.nodes;
  for (const node of rawNodes) assertNodeShape(node, rawNodes.length);
  assertEncodedValueShape(candidate.root, rawNodes.length);
  const nodes = rawNodes as readonly EncodedNode[];
  const decodedNodes: unknown[] = new Array(nodes.length);
  nodes.forEach((node, index) => {
    switch (node[0]) {
      case "array": {
        decodedNodes[index] = new Array(node[1]);
        break;
      }
      case "object": {
        decodedNodes[index] = node[1] === "null" ? Object.create(null) : {};
        break;
      }
      case "map":
        decodedNodes[index] = new Map<unknown, unknown>();
        break;
      case "set":
        decodedNodes[index] = new Set<unknown>();
        break;
      case "date": {
        decodedNodes[index] = new Date(node[1]);
        break;
      }
      case "regexp": {
        const expression = new RegExp(node[1], node[2]);
        expression.lastIndex = node[3];
        decodedNodes[index] = expression;
        break;
      }
      case "url":
        decodedNodes[index] = new URL(node[1]);
        break;
      case "array-buffer": {
        const bytes = hexToBytes(node[1]);
        decodedNodes[index] = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        break;
      }
      case "typed-array":
        break;
      default: throw new TypeError("Unknown durable graph node.");
    }
  });
  const decode = (encoded: unknown): unknown => {
    assertEncodedValueShape(encoded, decodedNodes.length);
    switch (encoded[0]) {
      case "undefined": return undefined;
      case "null": return null;
      case "boolean": return encoded[1];
      case "number": return decodeNumber(encoded[1]);
      case "bigint": return BigInt(encoded[1]);
      case "string": return encoded[1];
      case "reference": {
        const reference = encoded[1];
        return decodedNodes[reference];
      }
      default: throw new TypeError("Unknown durable graph value.");
    }
  };
  nodes.forEach((node, index) => {
    if (node[0] !== "typed-array") return;
    const buffer = decode(node[2]);
    if (!(buffer instanceof ArrayBuffer)) {
      throw new TypeError("Malformed durable typed-array buffer.");
    }
    decodedNodes[index] = createTypedArray(
      node[1],
      buffer,
      node[3],
      node[4],
    );
  });
  nodes.forEach((node, index) => {
    const target = decodedNodes[index];
    switch (node[0]) {
      case "array":
        for (const [key, encoded] of node[2]) {
          (target as unknown[])[key] = decode(encoded);
        }
        break;
      case "object":
        for (const [key, encoded] of node[2]) {
          Object.defineProperty(target, key, {
            configurable: true,
            enumerable: true,
            value: decode(encoded),
            writable: true,
          });
        }
        break;
      case "map":
        for (const [key, value] of node[1]) {
          (target as Map<unknown, unknown>).set(decode(key), decode(value));
        }
        break;
      case "set":
        for (const item of node[1]) {
          (target as Set<unknown>).add(decode(item));
        }
        break;
      default:
        break;
    }
  });
  return decode(candidate.root);
}
