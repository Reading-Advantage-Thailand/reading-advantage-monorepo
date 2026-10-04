"use client";

import { useCallback } from "react";
import { useAuth } from "@reading-advantage/auth-client";
import { useRouter } from "@/i18n/navigation";

/** Student home after a sign-in. Lane C will add `/student/home`. */
export const STUDENT_HOME = "/student/read";

/**
 * Returns a function that opens a page after a sign-in. The function first reads the new session
 * into the client auth state, then replaces the sign-in page in the history, so Back does not
 * return to it.
 * @returns A function that takes the page path (default: the student home).
 */
export function useEnterAfterSignIn(): (path?: string) => Promise<void> {
  const { refresh } = useAuth();
  const router = useRouter();
  return useCallback(
    async (path: string = STUDENT_HOME) => {
      try {
        await refresh();
      } catch {
        // The session cookie is set. The next page reads the session on the server.
      }
      router.replace(path);
    },
    [refresh, router],
  );
}
