"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { replaceLocation } from "@/lib/student-login/replace-location";

/** Student home after a sign-in. Lane C will add `/student/home`. */
export const STUDENT_HOME = "/student/read";

/**
 * Returns a function that opens a page after a sign-in. It uses a full page load: on a shared
 * device the client auth state and caches of the student before must not stay, and the auth
 * client ignores `refresh()` after a logout in the same page life. The load replaces the
 * sign-in page in the history, so Back does not return to it.
 * @returns A function that takes the page path (default: the student home).
 */
export function useEnterAfterSignIn(): (path?: string) => Promise<void> {
  const locale = useLocale();
  return useCallback(
    async (path: string = STUDENT_HOME) => {
      replaceLocation(getPathname({ href: path, locale }));
    },
    [locale],
  );
}
