import { z } from "zod";
import {
  appEnum,
  campaignStatusEnum,
  campaignTypeEnum,
} from "@reading-advantage/db/schema";

/**
 * Zod schemas for the `/api/campaigns` and `/api/campaigns/[id]` routes.
 *
 * The marketing tables are global-internal (no `schoolId`, no `ownerId`),
 * so the only validation concern at the route boundary is enum membership
 * and the presence of required fields. Per-row ownership scoping is
 * deferred to a follow-up cycle if owner columns are added.
 */

const appEnumValues = appEnum.enumValues;
const campaignTypeValues = campaignTypeEnum.enumValues;
const campaignStatusValues = campaignStatusEnum.enumValues;

/**
 * Schema for creating a campaign. `type`, `app`, and `name` are required;
 * `status` defaults to `draft` at the DB layer and is omitted from the
 * create payload.
 */
export const createCampaignSchema = z.object({
  type: z.enum(campaignTypeValues as [string, ...string[]]),
  app: z.enum(appEnumValues as [string, ...string[]]),
  name: z.string().min(1).max(255),
});

export type CreateCampaignBody = z.infer<typeof createCampaignSchema>;

/**
 * Schema for partial campaign updates. At present only `status` is
 * updatable through the API; this keeps the surface area honest and the
 * state-machine in `lib/campaign-status.ts` authoritative.
 */
export const updateCampaignSchema = z.object({
  status: z.enum(campaignStatusValues as [string, ...string[]]),
});

export type UpdateCampaignBody = z.infer<typeof updateCampaignSchema>;