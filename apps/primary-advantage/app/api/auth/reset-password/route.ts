import { createResetPasswordHandler } from "@reading-advantage/api/routes/auth";
import { authorizeResetTarget } from "@/server/utils/auth";

// Strict variant: same school only, effective rank (legacy rows included), no school-less matches.
export const POST = createResetPasswordHandler({ authorizeTarget: authorizeResetTarget });
