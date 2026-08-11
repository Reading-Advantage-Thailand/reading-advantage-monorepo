import { AsyncLocalStorage } from "node:async_hooks";

import { z } from "zod";

import { httpMethodSchema } from "./route-bindings.js";

/** Exact HTTP route context established by a trusted transport adapter. */
export const capabilityRequestContextSchema = z.strictObject({
  bindingId: z.string().min(3).max(500),
  capabilityId: z.string().min(3).max(500),
  capabilityKind: z.enum(["query", "command"]),
  exposure: z.enum(["public", "authenticated"]),
  transport: z.enum(["next-http", "hono-http"]),
  method: httpMethodSchema,
  path: z.string().min(1).max(500),
});

/** Immutable route context visible only to trusted server-side adapters. */
export type CapabilityRequestContext = z.infer<
  typeof capabilityRequestContextSchema
>;

const requestContextStorage = new AsyncLocalStorage<
  Readonly<CapabilityRequestContext>
>();

/**
 * Runs one operation with a trusted transport context isolated by async execution.
 * @param context Route binding resolved by the owning transport registry.
 * @param operation Operation that should observe the context.
 * @returns The operation result.
 */
export function runWithTrustedCapabilityRequestContext<T>(
  context: Readonly<CapabilityRequestContext>,
  operation: () => T,
): T {
  const parsed = Object.freeze(capabilityRequestContextSchema.parse(context));
  return requestContextStorage.run(parsed, operation);
}

/**
 * Returns the current trusted transport context, if one encloses this operation.
 * @returns The current route context or undefined for direct backend calls.
 */
export function getCapabilityRequestContext():
  | Readonly<CapabilityRequestContext>
  | undefined {
  return requestContextStorage.getStore();
}
