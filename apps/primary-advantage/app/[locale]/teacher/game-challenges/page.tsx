import { TeacherChallengePanel } from "@reading-advantage/advantage-play-kit/react";
import { CARTRIDGE_CHALLENGE_CAPABILITIES, getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";

/**
 * Renders the Primary teacher challenge manager.
 * @param props The locale route parameters.
 * @returns The authorized challenge manager.
 */
export default async function TeacherGameChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user || !user.schoolId || (user.role !== "TEACHER" && user.role !== "ADMIN")) notFound();
  const games = Object.fromEntries(Object.entries(CARTRIDGE_CHALLENGE_CAPABILITIES).flatMap(([id, capability]) => {
    const entry = getCartridgeCatalogEntry(id);
    return entry ? [[id, { title: entry.title, version: capability.version }]] : [];
  }));
  return <main><Link href="/teacher/my-classes">Back to classes</Link><TeacherChallengePanel ownerKey={`${user.schoolId}:${user.id}`} games={games} endpoint="/api/v1/apk/challenges" classesEndpoint="/api/v1/apk/challenges/teacher-classes" /></main>;
}
