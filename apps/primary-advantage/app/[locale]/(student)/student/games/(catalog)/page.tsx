import { Gamepad2Icon, MessageSquareTextIcon, WholeWordIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  CARTRIDGE_CHALLENGE_CAPABILITIES,
  cartridgeCatalog,
  getCartridgeCatalogEntry,
  type CartridgeCatalogEntry,
} from "@reading-advantage/game-cartridges";
import { StudentChallengeCatalogPanel, StudentRpgCatalogPanel } from "@reading-advantage/advantage-play-kit/react";
import { EmptyState, cardHoverClassName } from "@reading-advantage/ui";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

/** The catalog groups, by the practice input of each game. */
const GROUPS = [
  { mode: "vocabulary", title: "wordGames", hint: "wordGamesHint", icon: WholeWordIcon, tone: "bg-brand-100 text-brand-700 dark:text-brand-300" },
  { mode: "sentence", title: "sentenceGames", hint: "sentenceGamesHint", icon: MessageSquareTextIcon, tone: "bg-(--accent-blue-light) text-blue-700 dark:text-blue-300" },
] as const;

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
 * Student games catalog: the class challenges and rewards panels, then the APK games in two
 * groups (word games and sentence games) as cards that link to the game. An empty catalog shows
 * an empty state. The game internals and the play-kit panels are unchanged.
 * @returns The games page.
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>
      <div className="flex flex-col gap-4 empty:hidden">
        <StudentRpgCatalogPanel ownerKey={ownerKey} />
        <StudentChallengeCatalogPanel ownerKey={ownerKey} locale={locale} games={challengeGames} />
      </div>
      {/* The 3D story games (APK 3D port). Phase 4 of the RPG skin moves them to the arena wall. */}
      <Link
        className={cn(
          "bg-card text-card-foreground focus-visible:ring-ring/50 border-primary flex min-h-20 items-start gap-3 rounded-2xl border p-4 shadow-sm outline-none focus-visible:ring-[3px]",
          cardHoverClassName,
        )}
        href="/student/games/story"
      >
        <span aria-hidden="true" className="bg-brand-100 text-brand-700 dark:text-brand-300 flex size-11 shrink-0 items-center justify-center rounded-xl [&>svg]:size-6">
          <Gamepad2Icon />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-base leading-snug font-semibold">{t("storyLink")}</span>
          <span className="text-muted-foreground line-clamp-2 text-sm">{t("storyLinkDescription")}</span>
        </span>
      </Link>
      {cartridgeCatalog.length === 0 ? (
        <EmptyState className="bg-card border" icon={<Gamepad2Icon />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        GROUPS.map((group) => {
          // Every game shows: a game that is not a sentence game goes to the word games.
          const games = cartridgeCatalog.filter((entry) =>
            group.mode === "sentence" ? entry.inputMode === "sentence" : entry.inputMode !== "sentence",
          );
          if (games.length === 0) return null;
          return (
            <section key={group.mode} aria-labelledby={`games-${group.mode}`} className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 id={`games-${group.mode}`} className="text-xl font-semibold">
                  {t(group.title)}
                </h2>
                <p className="text-muted-foreground text-sm">{t(group.hint)}</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {games.map((entry) => (
                  <li key={entry.id}>
                    <GameCard entry={entry} icon={<group.icon />} tone={group.tone} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

/**
 * One game as a card link: an icon tile, the title, and a two-line description.
 * @param props.entry The catalog entry.
 * @param props.icon The group icon (decorative).
 * @param props.tone Color classes for the icon tile.
 * @returns The card link.
 */
function GameCard({ entry, icon, tone }: { entry: CartridgeCatalogEntry; icon: React.ReactNode; tone: string }) {
  return (
    <Link
      className={cn(
        "bg-card text-card-foreground focus-visible:ring-ring/50 flex min-h-20 items-start gap-3 rounded-2xl border p-4 shadow-sm outline-none focus-visible:ring-[3px]",
        "hover:border-primary",
        cardHoverClassName,
      )}
      href={`/student/games/apk/${entry.id}`}
    >
      <span aria-hidden="true" className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl [&>svg]:size-6", tone)}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-base leading-snug font-semibold">{entry.title}</span>
        <span className="text-muted-foreground line-clamp-2 text-sm">{entry.description}</span>
      </span>
    </Link>
  );
}
