"use client";

import { useSession } from "@reading-advantage/auth-client";

export const useCurrentRole = () => {
  const { user } = useSession();
  return user?.role;
};
