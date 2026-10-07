import { Gamepad2Icon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StudentChallengeCatalogPanel, StudentRpgCatalogPanel } from "@reading-advantage/advantage-play-kit/react";
import { EmptyState } from "@reading-advantage/ui";
import { Sign } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { challengeGames, isSentenceGame, playableGames } from "@/lib/games/catalog";
import { ART, rewardIconUrls } from "@/lib/rpg/places";
import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

/** The catalog groups, by the practice input of each game. */
const GROUPS = [
  { mode: "vocabulary", title: "wordGames", hint: "wordGamesHint", icon: ART.sharpBlade },
  { mode: "sentence", title: "sentenceGames", hint: "sentenceGamesHint", icon: ART.scroll },
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
 * Student games catalog: the class challenges and rewards panels, then the 3D games in two
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
  const games = playableGames();

  // The games are banners on the arena wall (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="arena" className="gap-8">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p>{t("description")}</p>
      </header>
      <div className="flex flex-col gap-4 empty:hidden">
        <StudentRpgCatalogPanel ownerKey={ownerKey} inventoryNote={t("rewardInInventory")} assetUrls={rewardIconUrls} credit={null} />
        <StudentChallengeCatalogPanel ownerKey={ownerKey} locale={locale} games={challengeGames()} />
      </div>
      {/* The 3D story games (APK 3D port) as the first banner on the arena wall. */}
      <GameCard href="/student/games/story" icon={ART.banner} title={t("storyLink")} description={t("storyLinkDescription")} />
      {games.length === 0 ? (
        <EmptyState className="cq-panel" icon={<Gamepad2Icon />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        GROUPS.map((group) => {
          // Every game shows: a game that is not a sentence game goes to the word games.
          const members = games.filter((game) => isSentenceGame(game) === (group.mode === "sentence"));
          if (members.length === 0) return null;
          return (
            <section key={group.mode} aria-labelledby={`games-${group.mode}`} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Sign className="w-fit">
                  <h2 id={`games-${group.mode}`} className="m-0 text-[length:inherit] font-bold">
                    {t(group.title)}
                  </h2>
                </Sign>
                <p className="cq-on-scene text-sm">{t(group.hint)}</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {members.map((game) => (
                  <li key={game.id}>
                    <GameCard href={`/student/games/apk/${game.id}`} icon={group.icon} title={game.manifest.title} description={game.manifest.description} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </Scene>
  );
}

/**
 * One game as a parchment banner link on the arena wall: a Forge icon, the title, and a two-line
 * description.
 * @param props.href The game route.
 * @param props.icon The icon path (decorative).
 * @param props.title The game title.
 * @param props.description The short description.
 * @returns The card link.
 */
function GameCard({ href, icon, title, description }: { href: string; icon: string; title: string; description: string }) {
  return (
    <Link className={cn("cq-panel cq-pin focus-visible:ring-ring/50 flex min-h-20 items-start gap-3 outline-none focus-visible:ring-[3px]", "transition-transform hover:-translate-y-0.5")} href={href}>
      <img src={icon} alt="" className="size-11 shrink-0" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-base leading-snug font-bold">{title}</span>
        <span className="cq-muted line-clamp-2 text-sm">{description}</span>
      </span>
    </Link>
  );
}
