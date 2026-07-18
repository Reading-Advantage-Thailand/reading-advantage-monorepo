import { z } from "zod";

import { auditPolicySchema } from "./audit.js";
import { declaredErrorSchema } from "./errors.js";
import {
  authenticationRequirementSchema,
  authorizationPolicySchema,
  observabilityPolicySchema,
  operationRiskSchema,
  queryOperationRiskSchema,
  tenancyPolicySchema,
  transactionPolicySchema,
} from "./policies.js";
import {
  capabilityIdSchema,
  capabilityOwnerSchema,
  schemaFingerprintSchema,
} from "./primitives.js";
import { routeBindingSchema } from "./route-bindings.js";

/** Runtime contract for serializable idempotency metadata in the catalog. */
export const catalogIdempotencyPolicySchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("none") }),
  z.strictObject({
    mode: z.literal("required"),
    keySchemaFingerprint: schemaFingerprintSchema,
    scope: z.enum(["tenant-capability", "global-capability"]),
    retentionSeconds: z.number().int().positive().max(31_536_000),
    conflict: z.enum(["reject", "replay"]),
  }),
]);

/** Serializable idempotency declaration published in generated metadata. */
export type CatalogIdempotencyPolicy = z.infer<
  typeof catalogIdempotencyPolicySchema
>;

function addSortedUniqueIssues(
  values: readonly string[],
  context: z.RefinementCtx,
  path: Array<string | number>,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Values must be unique.",
    });
  }
  const sorted = [...values].sort((left, right) => left.localeCompare(right));
  if (values.some((value, index) => value !== sorted[index])) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Values must be sorted for deterministic generation.",
    });
  }
}

/** Runtime contract for handler-free generated capability catalog entries. */
const catalogEntryFields = {
  id: capabilityIdSchema,
  summary: z.string().min(1).max(500),
  owner: capabilityOwnerSchema,
  auth: authenticationRequirementSchema,
  authorization: authorizationPolicySchema,
  tenancy: tenancyPolicySchema,
  transaction: transactionPolicySchema,
  errors: z.array(declaredErrorSchema).max(100),
  audit: auditPolicySchema,
  idempotency: catalogIdempotencyPolicySchema,
  observability: observabilityPolicySchema,
  inputSchemaFingerprint: schemaFingerprintSchema,
  outputSchemaFingerprint: schemaFingerprintSchema,
  bindings: z.array(z.string().min(1).max(500)),
  migration: z.enum(["registered", "legacy-unbound"]),
};

/** Runtime contract for handler-free generated capability catalog entries. */
export const capabilityCatalogEntrySchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...catalogEntryFields,
    kind: z.literal("query"),
    risk: queryOperationRiskSchema,
  }),
  z.strictObject({
    ...catalogEntryFields,
    kind: z.literal("command"),
    risk: operationRiskSchema,
  }),
  z.strictObject({
    ...catalogEntryFields,
    kind: z.literal("job"),
    risk: operationRiskSchema,
  }),
]);

/** Handler-free generated metadata for one registered capability. */
export type CapabilityCatalogEntry = z.infer<
  typeof capabilityCatalogEntrySchema
>;

/** Runtime contract preserving visibility of a not-yet-migrated legacy route. */
export const legacyRouteCatalogEntrySchema = z.strictObject({
  routeId: z.string().min(1).max(500),
  owner: capabilityOwnerSchema,
  transport: z.string().min(1).max(100),
  method: z.string().min(1).max(20).optional(),
  path: z.string().min(1).max(500),
  migration: z.literal("legacy-unbound"),
});

/** Generated metadata for one explicitly inventoried legacy route. */
export type LegacyRouteCatalogEntry = z.infer<
  typeof legacyRouteCatalogEntrySchema
>;

/** Runtime contract for the deterministic generated capability catalog. */
export const capabilityCatalogSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    capabilities: z.array(capabilityCatalogEntrySchema),
    legacyRoutes: z.array(legacyRouteCatalogEntrySchema),
  })
  .superRefine((catalog, context) => {
    addSortedUniqueIssues(
      catalog.capabilities.map((entry) => entry.id),
      context,
      ["capabilities"],
    );
    addSortedUniqueIssues(
      catalog.legacyRoutes.map((entry) => entry.routeId),
      context,
      ["legacyRoutes"],
    );
    for (const [index, entry] of catalog.capabilities.entries()) {
      addSortedUniqueIssues(entry.bindings, context, [
        "capabilities",
        index,
        "bindings",
      ]);
    }
  });

/** Deterministic, handler-free generated capability catalog. */
export type CapabilityCatalog = z.infer<typeof capabilityCatalogSchema>;

/** Runtime contract for the deterministic explicit route manifest. */
export const routeManifestSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    bindings: z.array(routeBindingSchema),
  })
  .superRefine((manifest, context) => {
    addSortedUniqueIssues(
      manifest.bindings.map((binding) => binding.bindingId),
      context,
      ["bindings"],
    );
    const httpRoutes = new Set<string>();
    for (const [index, binding] of manifest.bindings.entries()) {
      if (binding.transport !== "next-http" && binding.transport !== "hono-http") {
        continue;
      }
      const routeKey = `${binding.method} ${binding.path}`;
      if (httpRoutes.has(routeKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bindings", index],
          message: "HTTP method/path pairs must be unique across transports.",
        });
      }
      httpRoutes.add(routeKey);
    }
  });

/** Deterministic generated manifest for explicit executor bindings. */
export type RouteManifest = z.infer<typeof routeManifestSchema>;
