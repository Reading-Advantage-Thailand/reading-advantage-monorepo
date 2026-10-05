import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getQuestDashboard } from "@reading-advantage/domain/primary-quest";
import { getCurrentUser } from "@/lib/session";
import { LiveDashboard } from "@/components/quest/live-dashboard";

/**
 * Page title: the live dashboard.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Quest.live");
  return { title: t("title") };
}

/**
 * The projector dashboard page (FR-10): one page for the teacher's screen.
 * @param props.params The route params with the quest id.
 * @returns The page.
 */
export default async function QuestLivePage({ params }: { params: Promise<{ questId: string }> }) {
  const [{ questId }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) notFound();
  const state = await getQuestDashboard({ db, user }, questId).catch(() => null);
  if (!state) notFound();
  return <LiveDashboard initial={state} />;
}
