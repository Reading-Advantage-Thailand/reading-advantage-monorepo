import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getAvatarProfile } from "@reading-advantage/domain/primary-avatar";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { REEDY_STATES, Reedy } from "@/components/reedy/reedy";

/**
 * A development preview of the eight Reedy states with the signed-in student's avatar (as
 * Tutor's `REEDY_POSES` page). Not served in production.
 * @returns The page.
 */
export default async function ReedyPosesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });
  const profile = await getAvatarProfile({ db, user });
  if (!profile) return redirect({ href: "/student/avatar", locale: await getLocale() });
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Reedy poses</h1>
      <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {REEDY_STATES.map((state) => (
          <li key={state} className="flex flex-col items-center gap-2">
            <Reedy profile={profile} state={state} level={0.7} />
            <code className="text-muted-foreground text-xs">{state}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
