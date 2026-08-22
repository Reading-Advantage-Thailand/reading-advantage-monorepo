/**
 * The single cartridge manifest contract that the runtime enforces at mount.
 *
 * Every cartridge passes this schema before the runtime creates a renderer, so
 * the manifest rules are load-path rules rather than documentation. The
 * scaffolding manifest extends this schema instead of restating it.
 */

import { z } from "zod";

/** Rejects a physical file path where a semantic asset key is required. */
const semanticAssetKeySchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith("/") && !/\.(png|jpe?g|webp|gif|svg|json|atlas|mp3|ogg|wav)$/iu.test(value), {
    message: "Asset bindings must be semantic keys, not physical file paths",
  });

/** Rejects a capability id that does not use the capability namespace. */
const capabilityIdSchema = z.string().regex(/^capability:[a-z0-9]+(?:-[a-z0-9]+)*$/u, {
  message: "Capability ids must use the capability: namespace and kebab-case",
});

/** Zod schema for the manifest that every mounted cartridge must supply. */
export const runtimeCartridgeManifestSchema = z
  .object({
    id: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, {
      message: "Cartridge id must be lowercase kebab-case",
    }),
    title: z.string().min(1),
    description: z.string().min(1),
    runtimeApiVersion: z.string().min(1),
    inputMode: z.enum(["vocabulary", "sentence"]),
    requiredAssetBindings: z.array(semanticAssetKeySchema),
    capabilities: z.array(capabilityIdSchema).min(1),
  })
  .strict();

/**
 * Validates the manifest of a cartridge that the runtime is about to mount.
 * @param manifest Untrusted manifest supplied by a cartridge module.
 * @returns The validated manifest.
 * @throws When a field is missing, an asset binding is a physical path, or a capability id is malformed.
 */
export function validateRuntimeCartridgeManifest(
  manifest: unknown,
): z.infer<typeof runtimeCartridgeManifestSchema> {
  const parsed = runtimeCartridgeManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    throw new Error(
      `Cartridge manifest validation failed: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return parsed.data;
}
