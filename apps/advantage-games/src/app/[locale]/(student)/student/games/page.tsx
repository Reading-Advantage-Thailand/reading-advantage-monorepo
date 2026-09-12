import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, validateSession } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { StudentChallengeCatalogPanel, StudentRpgCatalogPanel } from "@reading-advantage/advantage-play-kit/react";
import { CARTRIDGE_CHALLENGE_CAPABILITIES, getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gameCards } from "@/lib/gameCards";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/games-runtime";

type StudentGamesCatalogPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Resolves a locale-agnostic catalog path into a locale-prefixed launch URL.
 * @param locale Route locale segment from the student catalog page.
 * @param href Catalog path for a playable game.
 * @returns A locale-prefixed student game route.
 */
export function resolveCatalogGameHref(locale: string, href: string): string {
  return `/${locale}${href}`;
}

/**
 * Renders the authenticated student game catalog at /[locale]/student/games.
 * @param props Asynchronous locale route parameters.
 * @returns The student catalog page.
 */
export default async function StudentGamesCatalogPage({
  params,
}: StudentGamesCatalogPageProps) {
  const { locale } = await params;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await validateSession(db, token) : null;
  const ownerKey = session?.user.role === "STUDENT" && session.user.schoolId
    ? `${session.user.schoolId}:${session.user.id}`
    : undefined;
  const canManageChallenges = Boolean(session?.user.schoolId && (session.user.role === "TEACHER" || session.user.role === "ADMIN"));
  const challengeGames = Object.fromEntries(Object.entries(CARTRIDGE_CHALLENGE_CAPABILITIES).flatMap(([gameId, capability]) => {
    const entry = getCartridgeCatalogEntry(gameId);
    return entry ? [[gameId, { title: entry.title, version: capability.version }]] : [];
  }));

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-6xl space-y-12">
        <header className="text-center space-y-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Back to Arcade</Link>
          </Button>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-foreground">
            Vocab Arcade
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            High-precision vocabulary training
          </p>
          {canManageChallenges ? <Link href={`/${locale}/teacher/game-challenges`}>Class challenges</Link> : null}
        </header>

        <StudentRpgCatalogPanel
          ownerKey={ownerKey}
          endpoint={withBasePath("/api/v1/apk/rpg")}
          basePath={withBasePath("/")}
        />
        <StudentChallengeCatalogPanel
          ownerKey={ownerKey}
          locale={locale}
          games={challengeGames}
          classesEndpoint={withBasePath("/api/v1/apk/classes")}
          challengesEndpoint={withBasePath("/api/v1/apk/challenges")}
          basePath={withBasePath("/")}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {gameCards.map((game) => {
            const isPlayable = game.status === "playable";

            return (
              <Card
                key={game.id}
                className={cn(
                  "group overflow-hidden transition-all duration-200 hover:border-foreground/50",
                  !isPlayable && "border-dashed opacity-60",
                )}
              >
                <div className="relative w-full overflow-hidden border-b border-border bg-secondary">
                  <Image
                    src={game.cover}
                    alt={`${game.title} cover`}
                    width={1024}
                    height={1536}
                    sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
                    className={cn(
                      "w-full h-auto object-contain transition-transform duration-300 grayscale hover:grayscale-0",
                      isPlayable && "group-hover:scale-105",
                    )}
                  />
                </div>
                <CardHeader className="gap-2 px-6 pt-6">
                  <CardTitle>{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-4">
                  {isPlayable && game.href ? (
                    <Button asChild className="w-full" size="lg">
                      <Link href={resolveCatalogGameHref(locale, game.href)}>
                        Start Game
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled variant="secondary" className="w-full" size="lg">
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
