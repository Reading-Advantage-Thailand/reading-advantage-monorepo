import { StudentGamesCatalog } from "@/components/apk/StudentGamesCatalog";
import { toUserContext } from "@/lib/apk/to-user-context";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

/**
 * Renders the Reading game catalog with validated student reward identity.
 * Unauthenticated visitors are sent to sign-in, matching sibling student pages.
 * @returns The client catalog with an optional RPG owner key.
 */
export default async function GamesPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return redirect("/auth/signin");
  const user = toUserContext(sessionUser);
  const ownerKey = user?.role === "STUDENT" && user.schoolId
    ? `${user.schoolId}:${user.id}`
    : undefined;

  return <StudentGamesCatalog ownerKey={ownerKey} />;
}
