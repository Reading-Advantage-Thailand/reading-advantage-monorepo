import { Link } from "@/i18n/navigation";
import { CARTRIDGE_CHALLENGE_CAPABILITIES, cartridgeCatalog, getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { StudentChallengeCatalogPanel, StudentRpgCatalogPanel } from "@reading-advantage/advantage-play-kit/react";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";

/**
 * Page metadata for the student games catalog.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudentGames" });
  return { title: t("title"), description: t("description") };
}

/**
 * Lists live APK catalog titles on the real Primary student games route.
 * @returns A catalog of APK student game links.
 */
export default async function PrimaryStudentGamesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudentGames" });
  const user = await getCurrentUser();
  const ownerKey = user?.role === "STUDENT" && user.schoolId
    ? `${user.schoolId}:${user.id}`
    : undefined;
  const challengeGames = Object.fromEntries(Object.entries(CARTRIDGE_CHALLENGE_CAPABILITIES).flatMap(([gameId, capability]) => {
    const entry = getCartridgeCatalogEntry(gameId);
    return entry ? [[gameId, { title: entry.title, version: capability.version }]] : [];
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("description")}
        </p>
      </header>
      <div className="mb-8">
        <StudentRpgCatalogPanel ownerKey={ownerKey} />
        <StudentChallengeCatalogPanel ownerKey={ownerKey} locale={locale} games={challengeGames} />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {cartridgeCatalog.map((entry) => (
          <li key={entry.id}>
            <Link
              className="block rounded-lg border border-border p-4 hover:border-primary"
              href={`/student/games/apk/${entry.id}`}
            >
              <h2 className="text-lg font-semibold">{entry.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
