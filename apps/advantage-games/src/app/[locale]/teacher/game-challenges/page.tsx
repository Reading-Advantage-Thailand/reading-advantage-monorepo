import { TeacherChallengePanel } from "@reading-advantage/advantage-play-kit/react";
import { SESSION_COOKIE_NAME, validateSession } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { CARTRIDGE_CHALLENGE_CAPABILITIES, getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { withBasePath } from "@/lib/games-runtime";

/**
 * Renders the Advantage teacher challenge manager.
 * @param props The locale route parameters.
 * @returns The authorized challenge manager.
 */
export default async function TeacherGameChallengesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = token ? (await validateSession(db, token))?.user : undefined;
  if (!user || !user.schoolId || (user.role !== "TEACHER" && user.role !== "ADMIN")) notFound();
  const games = Object.fromEntries(Object.entries(CARTRIDGE_CHALLENGE_CAPABILITIES).flatMap(([id, capability]) => {
    const entry = getCartridgeCatalogEntry(id);
    return entry ? [[id, { title: entry.title, version: capability.version }]] : [];
  }));
  return <main><Link href={`/${locale}/student/games`}>Back to games</Link><TeacherChallengePanel ownerKey={`${user.schoolId}:${user.id}`} games={games} endpoint={withBasePath("/api/v1/apk/challenges")} classesEndpoint={withBasePath("/api/v1/apk/challenges/teacher-classes")} basePath={withBasePath("/")} /></main>;
}
