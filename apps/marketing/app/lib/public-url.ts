import { createPublicOriginGuard } from "@reading-advantage/auth/public-url";

const guard = createPublicOriginGuard({
  defaultOrigin: "https://marketing.reading-advantage.com",
  previewOriginsEnv: "MARKETING_PREVIEW_ORIGINS",
});

/**
 * Gets the configured Marketing OIDC callback origin.
 * @returns The callback origin used by Accounts.
 * @throws When the callback URL configuration is malformed.
 */
export const getMarketingCallbackOrigin = guard.getCallbackOrigin;

/**
 * Builds the browser-visible origin for a request.
 * @param request Incoming browser request.
 * @returns Public origin URL.
 * @throws When the resolved origin is not approved.
 */
export const getPublicOrigin = guard.getPublicOrigin;
