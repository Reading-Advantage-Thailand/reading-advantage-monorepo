import { createResetPasswordHandler } from "@reading-advantage/api/routes/auth";
import { authorizeResetTarget, resetActorRank } from "@/server/utils/auth";

// Strict variant: same school only, effective rank (legacy rows included), no school-less matches.
// authorizeTarget stays boolean so an older packages/api build still refuses (fails closed).
export const POST = createResetPasswordHandler({
  authorizeTarget: authorizeResetTarget,
  auditActorRole: resetActorRank,
});
