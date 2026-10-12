import { notFound } from "next/navigation";
import { z } from "zod";

import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { resolveLegacyChapter, resolveLegacyStoryId } from "@reading-advantage/domain/stories";

/**
 * Legacy story URLs (`/student/stories`, `/student/stories/<cuid>`, `/student/stories/<cuid>/<n>`)
 * redirect to the Read pages. A legacy cuid goes through `primary_legacy_id_map`; a uuid passes
 * through; an unknown id or a bad chapter number returns 404.
 * @param props.params The locale and the optional path segments.
 * @returns Nothing; the page always redirects or returns 404.
 */
export default async function LegacyStoriesPage({
  params,
}: {
  params: Promise<{ locale: string; path?: string[] }>;
}) {
  const { locale, path = [] } = await params;
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale });

  if (path.length === 0) return redirect({ href: "/student/read/stories", locale });
  if (path.length > 2) notFound();

  const [rawStory, rawChapter] = path;
  let storyId = rawStory;
  if (!z.string().uuid().safeParse(rawStory).success) {
    const tenant = { schoolId: user.schoolId };
    const migrated = await resolveLegacyStoryId({ db: createTenantDB(db, tenant), user, tenant, input: { legacyId: rawStory } });
    if (!migrated) notFound();
    storyId = migrated;
  }
  if (rawChapter === undefined) return redirect({ href: `/student/read/stories/${storyId}`, locale });

  const chapter = resolveLegacyChapter(rawChapter);
  if (chapter === null) notFound();
  return redirect({ href: `/student/read/stories/${storyId}/${chapter}`, locale });
}
