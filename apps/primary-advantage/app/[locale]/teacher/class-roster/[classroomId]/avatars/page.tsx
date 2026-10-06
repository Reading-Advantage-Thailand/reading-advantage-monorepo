import type { Metadata } from "next";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getClassAvatars, type ClassAvatar } from "@reading-advantage/domain/primary-avatar";
import { EmptyState, ErrorState } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { ClassAvatars } from "@/components/avatar/class-avatars";

/**
 * Page title: the class avatars.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ClassAvatars");
  return { title: t("title") };
}

/**
 * The teacher's class avatar page (FR-6): a portrait per student and a reset action.
 * @param props.params The route params with the class id.
 * @returns The page.
 */
export default async function ClassAvatarsPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const [{ classroomId }, user, t] = await Promise.all([params, currentUser(), getTranslations("ClassAvatars")]);
  let students: ClassAvatar[] | null = null;
  if (user) {
    try {
      students = await getClassAvatars({ db, user }, classroomId);
    } catch {
      students = null;
    }
  }
  const back = (
    <Link href={`/teacher/class-roster/${classroomId}`} className="text-muted-foreground inline-flex min-h-11 items-center gap-2 text-sm hover:underline">
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      {t("backToClass")}
    </Link>
  );
  return (
    <div className="flex flex-col gap-6">
      {back}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>
      {students === null ? (
        <ErrorState className="bg-card border" title={t("loadError")} />
      ) : students.length === 0 ? (
        <EmptyState className="bg-card border" title={t("noStudents")} />
      ) : (
        <ClassAvatars classroomId={classroomId} students={students} />
      )}
    </div>
  );
}
