import { useSession } from "next-auth/react";

export const useCurrentUser = () => {
  const { data: session } = useSession();
  // console.log("useCurrentUser Debug - Session:", session);
  return session?.user;
};
