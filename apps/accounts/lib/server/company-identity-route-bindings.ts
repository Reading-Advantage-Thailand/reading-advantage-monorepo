import { NextResponse } from "next/server";

import { createCompanyIdentityRouteAdapter } from "@reading-advantage/backend/company-identity/accounts-route-adapter";

const backendRouteAdapter = createCompanyIdentityRouteAdapter();

/** Backend-owned route denominator consumed by the Accounts route tests. */
export const companyIdentityRouteBindings = backendRouteAdapter.bindings;

/** Accounts-only named route operations; no generic binding ID or runner is exported. */
export const companyIdentityRouteHandlers = backendRouteAdapter.operations;

/**
 * Creates the no-body response used by explicitly reviewed OPTIONS handlers.
 * @param allow Comma-separated methods accepted by the route.
 * @returns A safe no-content preflight response.
 */
export function accountsOptionsResponse(allow: string): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: allow, "Cache-Control": "no-store" },
  });
}

/**
 * Creates the no-body response used by explicitly reviewed HEAD handlers.
 * @returns A safe no-content HEAD response.
 */
export function accountsHeadResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
