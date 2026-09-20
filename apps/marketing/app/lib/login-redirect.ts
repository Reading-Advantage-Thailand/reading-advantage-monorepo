"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  hasControlCharacter,
  hasMalformedPercentEncoding,
} from "@reading-advantage/auth/public-url";

/**
 * Checks whether a pathname with query is safe for a local return path.
 * @param pathnameWithQuery Current pathname with its query string.
 * @returns Whether the value is a safe relative return path.
 */
function isSafeReturnPath(pathnameWithQuery: string): boolean {
  if (
    !pathnameWithQuery.startsWith("/") ||
    pathnameWithQuery.startsWith("//") ||
    pathnameWithQuery.includes("\\") ||
    pathnameWithQuery.includes("#") ||
    hasControlCharacter(pathnameWithQuery) ||
    hasMalformedPercentEncoding(pathnameWithQuery) ||
    pathnameWithQuery.length > 2_048
  ) {
    return false;
  }
  return true;
}

/**
 * Builds the Marketing login redirect for the current path and query.
 * @param pathnameWithQuery Current pathname including its query string.
 * @returns Login path with the original destination carried as `returnTo`.
 */
export function redirectToLogin(pathnameWithQuery: string): string {
  const returnTo = isSafeReturnPath(pathnameWithQuery)
    ? pathnameWithQuery
    : "/";
  return `/login?${new URLSearchParams({ returnTo }).toString()}`;
}

/**
 * Builds the shared authentication-failure handler for Marketing pages.
 * The returned callback sends unauthenticated sessions and HTTP 401
 * responses to the login screen with the current path preserved as
 * `returnTo`, and keeps the client-side history instead of forcing a full
 * page reload.
 * @returns A callback that redirects on a missing session or an HTTP 401
 * response and reports whether it redirected.
 */
export function useHandleAuthFailure(): (response?: Response) => boolean {
  const router = useRouter();
  return useCallback(
    (response?: Response): boolean => {
      if (response && response.status !== 401) return false;
      router.replace(
        redirectToLogin(`${window.location.pathname}${window.location.search}`),
      );
      return true;
    },
    [router],
  );
}
