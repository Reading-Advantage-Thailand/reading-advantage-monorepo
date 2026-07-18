import { z } from "zod";

import {
  capabilityDescriptorSchema,
  type CapabilityDescriptor,
} from "./descriptors.js";

/** Runtime contract for one handler-free registry metadata entry. */
export const capabilityRegistryEntrySchema = z.strictObject({
  descriptor: capabilityDescriptorSchema,
  sourceModule: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[a-zA-Z0-9@._/-]+$/)
    .refine(
      (value) => !value.startsWith("/") && !value.split("/").includes(".."),
      "Registry source modules must be repository-relative.",
    ),
});

/** Handler-free metadata entry accepted by deterministic registry inspection. */
export type CapabilityRegistryEntry = z.infer<
  typeof capabilityRegistryEntrySchema
>;

/** Runtime contract for a sorted, unique, handler-free registry snapshot. */
export const capabilityRegistrySnapshotSchema = z
  .strictObject({ entries: z.array(capabilityRegistryEntrySchema) })
  .superRefine((snapshot, context) => {
    const ids = snapshot.entries.map((entry) => entry.descriptor.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "Registry capability IDs must be unique.",
      });
    }
    const sorted = [...ids].sort((left, right) => left.localeCompare(right));
    if (ids.some((id, index) => id !== sorted[index])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "Registry entries must be sorted by capability ID.",
      });
    }
  });

/** Deterministic handler-free registry snapshot for catalog generation. */
export type CapabilityRegistrySnapshot = z.infer<
  typeof capabilityRegistrySnapshotSchema
>;

/**
 * Public read handle for registry metadata.
 * Handler storage and invocation remain private to the future executor registry.
 */
export interface CapabilityRegistryReadHandle {
  /**
   * Reads one public descriptor without exposing its handler.
   * @param capabilityId Stable capability identifier.
   * @returns Public descriptor metadata, or undefined when it is not registered.
   */
  getDescriptor(
    capabilityId: string,
  ): Readonly<CapabilityDescriptor> | undefined;

  /**
   * Lists public descriptors in stable capability-ID order.
   * @returns Immutable handler-free descriptor list.
   */
  listDescriptors(): readonly Readonly<CapabilityDescriptor>[];

  /**
   * Produces a validated snapshot for deterministic generation.
   * @returns Immutable handler-free registry snapshot.
   */
  snapshot(): Readonly<CapabilityRegistrySnapshot>;
}
