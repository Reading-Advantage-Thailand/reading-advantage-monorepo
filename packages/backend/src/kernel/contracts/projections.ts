import { createHash } from "node:crypto";

import { z } from "zod";

import {
  referenceIdSchema,
  schemaFingerprintSchema,
  structuredJsonObjectSchema,
  type StructuredJsonObject,
} from "./primitives.js";

const SENSITIVE_KEY_FRAGMENTS = [
  "apikey",
  "authorization",
  "cookie",
  "credential",
  "password",
  "privatekey",
  "secret",
  "session",
  "sql",
  "stack",
  "token",
] as const;

function isSensitiveProjectionKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment),
  );
}

interface CanonicalSchemaObject {
  readonly [key: string]: CanonicalSchemaValue;
}

type CanonicalSchemaValue =
  | boolean
  | number
  | string
  | null
  | readonly CanonicalSchemaValue[]
  | CanonicalSchemaObject;

function canonicalizeConstraint(
  value: unknown,
  path: string,
): CanonicalSchemaValue {
  if (value === undefined) {
    return { undefined: true };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite projection number is forbidden: ${path}`);
    }
    return value;
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (value instanceof RegExp) {
    return { flags: value.flags, source: value.source, type: "regexp" };
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      canonicalizeConstraint(item, `${path}[${index}]`),
    );
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Unsupported projection constraint: ${path}`);
    }
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [
          key,
          canonicalizeConstraint(item, `${path}.${key}`),
        ]),
    );
  }
  throw new TypeError(`Function-defined projection semantics are forbidden: ${path}`);
}

function canonicalizeShape(
  shape: z.ZodRawShape,
  path = "values",
): CanonicalSchemaValue {
  return Object.fromEntries(
    Object.entries(shape)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, schema]) => {
        const keyPath = `${path}.${key}`;
        if (isSensitiveProjectionKey(key)) {
          throw new TypeError(`Sensitive projection key is forbidden: ${keyPath}`);
        }
        return [key, canonicalizeSchema(schema, keyPath)];
      }),
  );
}

function canonicalizeSchema(
  schema: z.ZodTypeAny,
  path: string,
): CanonicalSchemaValue {
  if (schema instanceof z.ZodObject) {
    if (schema._def.unknownKeys !== "strict") {
      throw new TypeError(`Nested projection object must be strict: ${path}`);
    }
    return { shape: canonicalizeShape(schema.shape, path), type: "object" };
  }
  if (schema instanceof z.ZodArray) {
    return {
      element: canonicalizeSchema(schema.element, `${path}[]`),
      exactLength: canonicalizeConstraint(schema._def.exactLength, `${path}.exactLength`),
      maxLength: canonicalizeConstraint(schema._def.maxLength, `${path}.maxLength`),
      minLength: canonicalizeConstraint(schema._def.minLength, `${path}.minLength`),
      type: "array",
    };
  }
  if (schema instanceof z.ZodUnion) {
    return {
      options: schema.options.map((option: z.ZodTypeAny, index: number) =>
        canonicalizeSchema(option, `${path}|${index}`),
      ),
      type: "union",
    };
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    return {
      discriminator: schema.discriminator,
      options: [...schema.options.values()].map((option, index) =>
        canonicalizeSchema(option, `${path}|${index}`),
      ),
      type: "discriminated-union",
    };
  }
  if (schema instanceof z.ZodEffects) {
    throw new TypeError(`Function-defined projection semantics are forbidden: ${path}`);
  }
  if (schema instanceof z.ZodOptional) {
    return { inner: canonicalizeSchema(schema.unwrap(), path), type: "optional" };
  }
  if (schema instanceof z.ZodNullable) {
    return { inner: canonicalizeSchema(schema.unwrap(), path), type: "nullable" };
  }
  if (schema instanceof z.ZodBranded) {
    return { inner: canonicalizeSchema(schema.unwrap(), path), type: "branded" };
  }
  if (schema instanceof z.ZodReadonly) {
    return { inner: canonicalizeSchema(schema.unwrap(), path), type: "readonly" };
  }
  if (schema instanceof z.ZodDefault) {
    throw new TypeError(`Function-defined projection semantics are forbidden: ${path}`);
  }
  if (schema instanceof z.ZodString) {
    return {
      checks: canonicalizeConstraint(schema._def.checks, `${path}.checks`),
      coerce: schema._def.coerce,
      type: "string",
    };
  }
  if (schema instanceof z.ZodNumber) {
    return {
      checks: canonicalizeConstraint(schema._def.checks, `${path}.checks`),
      coerce: schema._def.coerce,
      type: "number",
    };
  }
  if (schema instanceof z.ZodBoolean) {
    return { coerce: schema._def.coerce, type: "boolean" };
  }
  if (schema instanceof z.ZodNull) {
    return { type: "null" };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: "enum", values: [...schema.options].sort() };
  }
  if (schema instanceof z.ZodNativeEnum) {
    const values = [...new Set(Object.values(schema.enum))]
      .filter((value): value is string | number =>
        typeof value === "string" || typeof value === "number",
      )
      .sort((left, right) => String(left).localeCompare(String(right)));
    return { type: "native-enum", values };
  }
  if (schema instanceof z.ZodLiteral) {
    const literal = schema.value;
    if (
      literal === null ||
      typeof literal === "string" ||
      (typeof literal === "number" && Number.isFinite(literal)) ||
      typeof literal === "boolean"
    ) {
      return { type: "literal", value: literal };
    }
  }
  throw new TypeError(`Unsupported projection schema is forbidden: ${path}`);
}

/**
 * Computes the identity of an exact reviewed Zod projection shape.
 * @param shape Exact projection shape to canonicalize and fingerprint.
 * @returns SHA-256 identity derived from nested types, constraints, and wrappers.
 * @throws When the shape contains sensitive keys or unsupported semantics.
 */
export function computeProjectionSchemaIdentity(
  shape: z.ZodRawShape,
): z.infer<typeof schemaFingerprintSchema> {
  const canonical = canonicalizeShape(shape);
  return schemaFingerprintSchema.parse(
    `sha256:${createHash("sha256").update(JSON.stringify(canonical)).digest("hex")}`,
  );
}

function addSortedUniqueKeyIssues(
  keys: readonly string[],
  context: z.RefinementCtx,
): void {
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["allowedKeys"],
      message: "Projection keys must be unique.",
    });
  }
  const sorted = [...keys].sort((left, right) => left.localeCompare(right));
  if (keys.some((key, index) => key !== sorted[index])) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["allowedKeys"],
      message: "Projection keys must be sorted.",
    });
  }
  for (const key of keys) {
    if (isSensitiveProjectionKey(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowedKeys"],
        message: `Sensitive projection key is forbidden: ${key}`,
      });
    }
  }
}

/** Runtime contract for a reviewed structured-data projection reference. */
export const projectionReferenceSchema = z
  .strictObject({
    projectorId: referenceIdSchema,
    schemaIdentity: schemaFingerprintSchema,
    allowedKeys: z.array(z.string().min(1).max(100)).max(100),
  })
  .superRefine((reference, context) => {
    addSortedUniqueKeyIssues(reference.allowedKeys, context);
  });

/** Reviewed identity and exact allowed keys of a structured-data projection. */
export type ProjectionReference = z.infer<typeof projectionReferenceSchema>;

/** Structural envelope candidate that still requires registered-contract validation. */
export const projectedDataEnvelopeSchema = z
  .strictObject({
    projectorId: referenceIdSchema,
    schemaIdentity: schemaFingerprintSchema,
    allowedKeys: z.array(z.string().min(1).max(100)).max(100),
    values: structuredJsonObjectSchema,
  })
  .superRefine((projected, context) => {
    addSortedUniqueKeyIssues(projected.allowedKeys, context);
    const allowed = new Set(projected.allowedKeys);
    for (const key of Object.keys(projected.values)) {
      if (!allowed.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["values", key],
          message: "Projected value was not declared by the reviewed allowlist.",
        });
      }
    }
  });

declare const validatedProjectionBrand: unique symbol;

/** Executor-facing data proven against a reviewed strict projection contract. */
export type ValidatedProjectedData<
  TValues extends StructuredJsonObject = StructuredJsonObject,
> = Readonly<{
  projectorId: string;
  schemaIdentity: string;
  allowedKeys: readonly string[];
  values: Readonly<TValues>;
  [validatedProjectionBrand]: true;
}>;

/** Input for constructing a strict reviewed projection contract. */
export interface AllowedProjectionContractInput<
  TShape extends z.ZodRawShape,
> {
  /** Stable ID of the registered projector. */
  readonly projectorId: string;
  /** Exact Zod shape whose keys form the allowlist. */
  readonly shape: TShape;
}

/** Strict schema, reference, and validator for one reviewed projection. */
export interface AllowedProjectionContract<TShape extends z.ZodRawShape> {
  /** Stable reference recorded by descriptors and generated metadata. */
  readonly reference: Readonly<ProjectionReference>;
  /** Strict schema that rejects every undeclared key. */
  readonly schema: z.ZodObject<TShape, "strict">;
  /**
   * Validates a projector candidate and brands the resulting envelope.
   * @param candidate Untrusted projector output candidate.
   * @returns Immutable data proven against the reviewed strict schema.
   */
  validate(
    candidate: unknown,
  ): ValidatedProjectedData<z.output<z.ZodObject<TShape, "strict">>>;
}

/**
 * Creates an exact-key projection contract after rejecting sensitive keys.
 * @param input Stable projector ID and exact strict projection shape.
 * @returns Strict schema, reference metadata, and executor validator.
 * @throws When IDs are invalid or a requested key is sensitive.
 */
export function createAllowedProjectionContract<
  TShape extends z.ZodRawShape,
>(input: AllowedProjectionContractInput<TShape>): AllowedProjectionContract<TShape> {
  const schemaIdentity = computeProjectionSchemaIdentity(input.shape);
  const allowedKeys = Object.keys(input.shape).sort((left, right) =>
    left.localeCompare(right),
  );
  const reference = projectionReferenceSchema.parse({
    projectorId: input.projectorId,
    schemaIdentity,
    allowedKeys,
  });
  const schema = z.strictObject(input.shape);

  return Object.freeze({
    reference: Object.freeze(reference),
    schema,
    validate(candidate: unknown) {
      const values = schema.parse(candidate);
      const envelope = projectedDataEnvelopeSchema.parse({
        ...reference,
        values,
      });
      return Object.freeze(envelope) as unknown as ValidatedProjectedData<
        z.output<z.ZodObject<TShape, "strict">>
      >;
    },
  });
}

/**
 * Produces a structured-data candidate for validation by a reviewed contract.
 * @param source Trusted source from which the candidate is projected.
 * @returns Untrusted candidate data, synchronously or asynchronously.
 */
export type StructuredDataProjector<TSource> = (
  source: Readonly<TSource>,
) => unknown | Promise<unknown>;

/** Registered typed projector paired with its reviewed strict contract. */
export interface StructuredDataProjectorDefinition<
  TSource,
  TShape extends z.ZodRawShape,
> {
  /** Reviewed contract governing the projector output. */
  readonly contract: AllowedProjectionContract<TShape>;
  /** Function that produces an untrusted candidate for executor validation. */
  readonly project: StructuredDataProjector<TSource>;
}

/** Read-only registry for reviewed structured-data projectors. */
export interface StructuredDataProjectorRegistryReadHandle {
  /**
   * Resolves a projector only when ID and reviewed schema identity match.
   * @param reference Descriptor-declared reviewed projection reference.
   * @returns Matching projector definition, or undefined when unresolved.
   */
  getProjector(
    reference: Readonly<ProjectionReference>,
  ): StructuredDataProjectorDefinition<unknown, z.ZodRawShape> | undefined;
}
