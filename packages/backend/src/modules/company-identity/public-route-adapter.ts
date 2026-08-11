import type { CapabilityRequestContext } from "../../kernel/contracts/request-context.js";

/** An operation supplied by an untrusted package consumer. */
type UntrustedRouteOperation = (
  context: Readonly<CapabilityRequestContext>,
) => Promise<void>;

/** Public compatibility shape that cannot establish trusted Accounts provenance. */
export interface PublicCompanyIdentityRouteAdapter {
  /** Operations preserve compatibility without trusted route provenance. */
  readonly operations: {
    /** Executes an untrusted callback without a route request context. */
    readonly oidcLogout: (operation: UntrustedRouteOperation) => Promise<void>;
  };
}

/**
 * Creates a public compatibility adapter without Accounts route authority.
 * @returns An adapter that executes callbacks without trusted route provenance.
 */
export function createCompanyIdentityRouteAdapter(): PublicCompanyIdentityRouteAdapter {
  return Object.freeze({
    operations: Object.freeze({
      oidcLogout: (operation: UntrustedRouteOperation): Promise<void> =>
        operation(undefined as never),
    }),
  });
}
