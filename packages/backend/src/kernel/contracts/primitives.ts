import { z } from "zod";

/** JSON scalar accepted by structured contracts. */
export type JsonScalar = string | number | boolean | null;

/** Recursive JSON value accepted by structured contracts. */
export type JsonValue =
  | JsonScalar
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

/** Runtime contract for a globally stable capability identifier. */
export const capabilityIdSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(
    /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/,
    "Capability IDs must be lowercase, stable, and namespaced.",
  );

/** Runtime contract for a named policy or adapter reference. */
export const referenceIdSchema = z
  .string()
  .min(3)
  .max(200)
  .regex(
    /^[a-z][a-z0-9]*(?:[._:/-][a-z0-9]+)+$/,
    "References must be lowercase and namespaced.",
  );

/** Runtime contract for a deterministic SHA-256 schema fingerprint. */
export const schemaFingerprintSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/);

/** Runtime contract that accepts genuine Zod schemas and rejects lookalikes. */
export const zodSchemaContractSchema = z.custom<z.ZodTypeAny>(
  (value) => value instanceof z.ZodType,
  "A genuine Zod schema is required.",
);

/** Runtime contract for recursively structured JSON without a security claim. */
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

/** Runtime contract for a JSON object without an allowlist or security claim. */
export const structuredJsonObjectSchema = z.record(z.string(), jsonValueSchema);

/** JSON object whose security properties must be established by its caller. */
export type StructuredJsonObject = z.infer<typeof structuredJsonObjectSchema>;

/** Runtime contract for the package and module that own a capability. */
export const capabilityOwnerSchema = z.strictObject({
  package: z.string().min(1).max(200),
  module: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:[._/-][a-z0-9]+)*$/),
});

/** Package and module ownership metadata for a capability. */
export type CapabilityOwner = z.infer<typeof capabilityOwnerSchema>;
