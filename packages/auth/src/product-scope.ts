import { z } from "zod";

/** Explicit authorization boundary carried by a verified product principal. */
export const productAuthorizationScopeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("company"),
    applicationKey: z.string().min(1),
    organizationId: z.string().uuid(),
    organizationKey: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal("legacy-school"),
    applicationKey: z.string().min(1),
    schoolId: z.string().min(1),
  }),
]);

/** Complete company or legacy-school boundary; partial and mixed scopes are invalid. */
export type ProductAuthorizationScope = z.infer<
  typeof productAuthorizationScopeSchema
>;
