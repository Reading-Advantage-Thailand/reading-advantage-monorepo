import { z } from "zod";

const identifierSchema = z.string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Identifiers must use lowercase kebab-case");
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u, "Digests must be lowercase SHA-256 values");
const positiveIntegerSchema = z.number().int().positive();
const safeRepositoryLocatorSchema = z.string().min(1).refine(
  (value) => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      return false;
    }
    return decoded === value
      && !value.startsWith("/")
      && !value.includes(String.fromCharCode(92))
      && !value.includes("//")
      && !/^[a-z][a-z0-9+.-]*:/iu.test(value)
      && !value.split("/").some((segment) => !segment || segment === "." || segment === "..");
  },
  "Repository locators must be safe relative paths",
);
const safeRuntimeUrlSchema = z.string().min(2).refine(
  (value) => value.startsWith("/")
    && !value.startsWith("//")
    && !value.includes(String.fromCharCode(92))
    && !value.includes("?")
    && !value.includes("#")
    && !value.slice(1).split("/").some((segment) => segment === "." || segment === ".."),
  "Runtime URLs must be safe absolute application paths",
);

/** Validates one immutable source identity from the Task-5 legacy inventory. */
export const standardPackLegacySourceInventoryBindingSchema = z.object({
  titleId: identifierSchema,
  assetId: identifierSchema,
  repositoryPath: safeRepositoryLocatorSchema,
  runtimeUrl: safeRuntimeUrlSchema,
  sourceSha256: digestSchema,
  width: positiveIntegerSchema,
  height: positiveIntegerSchema,
  observedRole: identifierSchema,
}).strict();

/** A source identity that an intake packet must match byte-for-byte. */
export type StandardPackLegacySourceInventoryBinding = z.infer<
  typeof standardPackLegacySourceInventoryBindingSchema
>;

/** Validates one supplied legal or provenance document without reviewing its substance. */
export const standardPackLegacySourcePacketDocumentSchema = z.object({
  documentId: identifierSchema,
  kind: z.enum(["provenance", "license", "credit"]),
  locator: safeRepositoryLocatorSchema,
  sha256: digestSchema,
}).strict();

/** A hash-bound supplied document retained only for later review. */
export type StandardPackLegacySourcePacketDocument = z.infer<
  typeof standardPackLegacySourcePacketDocumentSchema
>;

const noReleaseAuthorizationSchema = z.object({
  productionUseAuthorized: z.literal(false),
  ingestionAuthorized: z.literal(false),
  migrationAuthorized: z.literal(false),
  cutoverAuthorized: z.literal(false),
  retirementAuthorized: z.literal(false),
  deploymentAuthorized: z.literal(false),
}).strict();

/** Validates a complete but deliberately unreviewed legacy source-packet intake record. */
export const standardPackLegacySourcePacketSchema = z.object({
  schemaVersion: z.literal(1),
  packetId: identifierSchema,
  receivedAt: z.string().datetime({ offset: true }),
  receivedBy: identifierSchema,
  inventoryBinding: standardPackLegacySourceInventoryBindingSchema,
  documents: z.array(standardPackLegacySourcePacketDocumentSchema).length(3),
  lifecycle: z.literal("intake-complete-unreviewed"),
  authorization: noReleaseAuthorizationSchema,
  packetDigest: digestSchema,
}).strict().superRefine((packet, context) => {
  const kinds = packet.documents.map((document) => document.kind);
  const requiredKinds = ["provenance", "license", "credit"] as const;
  if (new Set(kinds).size !== kinds.length || requiredKinds.some((kind) => !kinds.includes(kind))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Source packets require exactly one provenance, license, and credit document",
      path: ["documents"],
    });
  }
  const ids = packet.documents.map((document) => document.documentId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Source-packet document identifiers must be unique",
      path: ["documents"],
    });
  }
});

/** A digest-bound, non-authorizing source-packet record awaiting independent review. */
export type StandardPackLegacySourcePacket = z.infer<typeof standardPackLegacySourcePacketSchema>;

/** Serializes JSON values with stable object-key order for deterministic digests. */
function stableJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

/** Computes a lowercase SHA-256 digest for one stable payload. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Serializes the digest-independent source-packet payload.
 * @param packet Source packet whose digest field is omitted from the serialization.
 * @returns Stable deterministic JSON for integrity hashing.
 */
export function serializeStandardPackLegacySourcePacketPayload(
  packet: Pick<StandardPackLegacySourcePacket, Exclude<keyof StandardPackLegacySourcePacket, "packetDigest">> & {
    packetDigest?: string;
  },
): string {
  const { packetDigest: _packetDigest, ...payload } = packet;
  return stableJson(payload);
}

/**
 * Validates one supplied source packet against exactly one known Task-5 inventory row.
 * @param candidate Untrusted packet received for evidence intake.
 * @param inventoryBinding Exact source identity that the packet must describe.
 * @returns A digest-verified, unreviewed source-packet record.
 * @throws When structure, document coverage, inventory identity, or digest validation fails.
 */
export async function validateStandardPackLegacySourcePacket(
  candidate: unknown,
  inventoryBinding: unknown,
): Promise<StandardPackLegacySourcePacket> {
  const packet = standardPackLegacySourcePacketSchema.parse(candidate);
  const expectedBinding = standardPackLegacySourceInventoryBindingSchema.parse(inventoryBinding);
  if (stableJson(packet.inventoryBinding) !== stableJson(expectedBinding)) {
    throw new Error("Source packet inventory binding does not match the expected Task-5 source identity");
  }
  if (await sha256(serializeStandardPackLegacySourcePacketPayload(packet)) !== packet.packetDigest) {
    throw new Error("Source packet digest does not match its payload");
  }
  return packet;
}
