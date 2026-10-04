import { createLoginHandler } from "@reading-advantage/api/routes/auth";
export const POST = createLoginHandler({ legacyUsersPasswordFallback: true });
