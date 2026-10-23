import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HelpIndex } from "@/components/help/help-index";
import { TeacherPageHeader } from "@/components/teacher/teacher-shell";

/**
 * Page title: the help videos.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Help");
  return { title: t("title") };
}

/**
 * The teacher help index (track primary_in_app_help_20261023, FR-9): all teacher help videos by area.
 * @param props.searchParams `play`: the id of a video to open at once (the manual's "Watch the video").
 * @returns The page.
 */
export default async function TeacherHelpPage({ searchParams }: { searchParams: Promise<{ play?: string }> }) {
  const [{ play }, t] = await Promise.all([searchParams, getTranslations("Help")]);
  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader title={t("title")} description={t("indexIntro")} />
      <HelpIndex initial={play} />
    </div>
  );
}
