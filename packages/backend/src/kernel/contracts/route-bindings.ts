import { z } from "zod";

import { capabilityKindSchema } from "./descriptors.js";
import { capabilityIdSchema, referenceIdSchema } from "./primitives.js";

/** Runtime contract for route exposure relative to authentication. */
export const routeExposureSchema = z.enum([
  "public",
  "optional-auth",
  "authenticated",
  "internal",
]);

/** Authentication exposure declared by an explicit binding. */
export type RouteExposure = z.infer<typeof routeExposureSchema>;

/** Runtime contract for supported HTTP methods. */
export const httpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

/** HTTP method supported by generated request bindings. */
export type HttpMethod = z.infer<typeof httpMethodSchema>;

const bindingIdSchema = z.string().min(3).max(500);
const synchronousCapabilityKindSchema = z.enum(["query", "command"]);
const httpPathSchema = z
  .string()
  .min(1)
  .max(500)
  .regex(/^\/(?:[A-Za-z0-9._~:@!$&'()*+,;=-]+\/?)*$/);

const httpBindingFields = {
  bindingId: bindingIdSchema,
  capabilityId: capabilityIdSchema,
  capabilityKind: synchronousCapabilityKindSchema,
  exposure: routeExposureSchema,
  method: httpMethodSchema,
  path: httpPathSchema,
};

/** Runtime contract for a generated Next.js HTTP binding declaration. */
export const nextHttpRouteBindingSchema = z.strictObject({
  ...httpBindingFields,
  transport: z.literal("next-http"),
});

/** Runtime contract for a generated Hono HTTP binding declaration. */
export const honoHttpRouteBindingSchema = z.strictObject({
  ...httpBindingFields,
  transport: z.literal("hono-http"),
});

/** Runtime contract for a generated tRPC binding declaration. */
export const trpcRouteBindingSchema = z
  .strictObject({
    bindingId: bindingIdSchema,
    transport: z.literal("trpc"),
    capabilityId: capabilityIdSchema,
    capabilityKind: synchronousCapabilityKindSchema,
    exposure: z.enum(["public", "optional-auth", "authenticated", "internal"]),
    router: referenceIdSchema,
    procedure: z.string().min(1).max(200).regex(/^[a-z][A-Za-z0-9]*$/),
    procedureType: z.enum(["query", "mutation"]),
  })
  .superRefine((binding, context) => {
    const expected = binding.capabilityKind === "query" ? "query" : "mutation";
    if (binding.procedureType !== expected) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["procedureType"],
        message: "tRPC procedure type must match capability kind.",
      });
    }
  });

/** Runtime contract for a generated synchronous CLI binding declaration. */
export const cliRouteBindingSchema = z.strictObject({
  bindingId: bindingIdSchema,
  transport: z.literal("cli"),
  capabilityId: capabilityIdSchema,
  capabilityKind: synchronousCapabilityKindSchema,
  exposure: z.literal("internal"),
  command: z.string().min(1).max(200).regex(/^[a-z][a-z0-9:-]*$/),
});

/** Runtime contract for an asynchronous durable-worker binding declaration. */
export const workerRouteBindingSchema = z.strictObject({
  bindingId: bindingIdSchema,
  transport: z.literal("worker"),
  capabilityId: capabilityIdSchema,
  capabilityKind: z.literal("job"),
  exposure: z.literal("internal"),
  queue: z.string().min(1).max(200).regex(/^[a-z][a-z0-9-]*$/),
});

/** Runtime contract for request/response bindings that cannot invoke jobs. */
export const synchronousRouteBindingSchema = z.union([
  nextHttpRouteBindingSchema,
  honoHttpRouteBindingSchema,
  trpcRouteBindingSchema,
  cliRouteBindingSchema,
]);

/** Runtime contract for every explicit generated binding declaration. */
export const routeBindingSchema = z.union([
  synchronousRouteBindingSchema,
  workerRouteBindingSchema,
]);

/** Explicit route or worker binding declaration. */
export type RouteBinding = z.infer<typeof routeBindingSchema>;

/** Supported transport discriminator for explicit route bindings. */
export const bindingTransportSchema = z.enum([
  "next-http",
  "hono-http",
  "trpc",
  "cli",
  "worker",
]);

/** Supported explicit binding transport. */
export type BindingTransport = z.infer<typeof bindingTransportSchema>;

/** Runtime contract proving that binding capability kinds are known. */
export const bindingCapabilityKindSchema = capabilityKindSchema;
