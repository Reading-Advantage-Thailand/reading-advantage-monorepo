"use client";

import { useSession } from "@reading-advantage/auth-client";

/**
 * Drop-in replacement for the old useCurrentUser hook.
 * Returns the same shape as NextAuth session.user.
 */
export const useCurrentUser = () => {
  const { user } = useSession();
  return user;
};
