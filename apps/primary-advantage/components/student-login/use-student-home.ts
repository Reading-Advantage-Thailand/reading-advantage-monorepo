"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { replaceLocation } from "@/lib/student-login/replace-location";
import { STUDENT_HOME } from "@/lib/student-home";
import { studentCallbackPath } from "@/lib/safe-callback-path";

export { STUDENT_HOME };

/**
 * Returns a function that opens a page after a sign-in. It uses a full page load: on a shared
 * device the client auth state and caches of the student before must not stay, and the auth
 * client ignores `refresh()` after a logout in the same page life. The load replaces the
 * sign-in page in the history, so Back does not return to it.
 * @returns A function that takes the page path (default: the student page of the sign-in page's
 * `callbackUrl`, for example the article of a printed QR code, else the student home).
 */
export function useEnterAfterSignIn(): (path?: string) => Promise<void> {
  const locale = useLocale();
  return useCallback(
    async (path?: string) => {
      const target = path ?? studentCallbackPath(new URLSearchParams(window.location.search).get("callbackUrl")) ?? STUDENT_HOME;
      replaceLocation(getPathname({ href: target, locale }));
    },
    [locale],
  );
}
