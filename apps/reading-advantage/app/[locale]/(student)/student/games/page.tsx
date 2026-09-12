import { StudentGamesCatalog } from "@/components/apk/StudentGamesCatalog";
import { toUserContext } from "@/lib/apk/to-user-context";
import { getCurrentUser } from "@/lib/session";

/**
 * Renders the Reading game catalog with validated student reward identity.
 * @returns The client catalog with an optional RPG owner key.
 */
export default async function GamesPage() {
  const sessionUser = await getCurrentUser();
  const user = sessionUser ? toUserContext(sessionUser) : null;
  const ownerKey = user?.role === "STUDENT" && user.schoolId
    ? `${user.schoolId}:${user.id}`
    : undefined;

  return <StudentGamesCatalog ownerKey={ownerKey} />;
}
