import { TeacherChallengePanel } from "@reading-advantage/advantage-play-kit/react";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { challengeGames } from "@/lib/games/catalog";
import { getCurrentUser } from "@/lib/session";
import { TEACHER_BACK_LINK, TeacherPageHeader } from "@/components/teacher/teacher-shell";

/**
 * Frame classes for the shared challenge panel. The panel is navy with white text, and its
 * fields set no fill or border, so in this app they were dark on dark with no edge (audit T13).
 * The frame gives every field a light fill, dark text, a border, and some padding.
 */
const FIELD_FRAME = [
  "max-w-3xl min-w-0",
  "[&_input]:bg-background [&_input]:text-foreground [&_input]:border-input [&_input]:rounded-md [&_input]:border-2 [&_input]:px-3",
  "[&_select]:bg-background [&_select]:text-foreground [&_select]:border-input [&_select]:rounded-md [&_select]:border-2 [&_select]:px-3",
].join(" ");

/**
 * Renders the Primary teacher challenge manager in the teacher shell: a back link to My Classes,
 * the page heading, and the shared panel with visible fields.
 * @param props The locale route parameters.
 * @returns The authorized challenge manager.
 */
export default async function TeacherGameChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const user = await getCurrentUser();
  if (!user || !user.schoolId || (user.role !== "TEACHER" && user.role !== "ADMIN")) notFound();
  const t = await getTranslations("TeacherClass");
  const ts = await getTranslations("TeacherStudents");
  const games = challengeGames();
  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        back={
          <Link href="/teacher/my-classes" className={TEACHER_BACK_LINK}>
            <ArrowLeft aria-hidden="true" />
            {t("backToClasses")}
          </Link>
        }
        title={t("challenges")}
        description={ts("challengesHint")}
      />
      <div className={FIELD_FRAME}>
        <TeacherChallengePanel ownerKey={`${user.schoolId}:${user.id}`} games={games} endpoint="/api/v1/apk/challenges" classesEndpoint="/api/v1/apk/challenges/teacher-classes" />
      </div>
    </div>
  );
}
