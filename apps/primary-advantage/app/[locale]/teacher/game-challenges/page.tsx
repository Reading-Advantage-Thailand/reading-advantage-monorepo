import { TeacherChallengePanel } from "@reading-advantage/advantage-play-kit/react";
import type { CSSProperties } from "react";
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
  "[&_fieldset]:border-border",
].join(" ");

/**
 * Staff-card look for the shared panel (outside `.cq-world`): the sliced pack frames switch off, and the
 * panel and the buttons take the staff tokens, in day and night.
 */
const PANEL_FRAME_STYLE = {
  "--apk-arcade-panel-image": "none",
  "--apk-arcade-button-primary-image": "none",
  "--apk-arcade-button-secondary-image": "none",
  "--apk-arcade-panel-border-width": "2px",
  "--apk-arcade-panel-radius": "16px",
  "--apk-arcade-panel-fallback": "var(--border)",
  "--apk-arcade-panel-surface": "var(--card)",
  "--apk-arcade-panel-text": "var(--card-foreground)",
  "--apk-arcade-button-border-width": "2px",
  "--apk-arcade-button-border-inline-width": "2px",
  "--apk-arcade-button-radius": "10px",
  "--apk-arcade-button-fallback": "var(--border)",
  "--apk-arcade-primary-fallback": "var(--primary)",
  "--apk-arcade-primary-text": "var(--primary-foreground)",
  "--apk-arcade-secondary-fallback": "var(--secondary)",
  "--apk-arcade-secondary-text": "var(--secondary-foreground)",
} as CSSProperties;

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
      <div className={FIELD_FRAME} style={PANEL_FRAME_STYLE}>
        <TeacherChallengePanel ownerKey={`${user.schoolId}:${user.id}`} games={games} endpoint="/api/v1/apk/challenges" classesEndpoint="/api/v1/apk/challenges/teacher-classes" labels={t.raw("challengePanel")} />
      </div>
    </div>
  );
}
