"use client";

import { cartridgeCatalog } from "@reading-advantage/game-cartridges";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { useScopedI18n } from "@/locales/client";

const CATALOG_COVERS: Readonly<Record<string, string>> = Object.freeze({
  "abyssal-well": "/games/cover/cover-the-abyssal-well.png",
  "alchemists-synthesis": "/games/cover/cover-alchemists-synthesis.png",
  "archers-revenge": "/games/cover/cover-archers-revenge.png",
  "astral-mage": "/games/cover/cover-astral-mage.png",
  "castle-defense": "/games/cover/castle-defense-cover.png",
  "devourer-slime": "/games/cover/cover-devourer-slime.png",
  "dragon-flight": "/games/cover/dragon-flight-cover.png",
  "dragon-rider": "/games/cover/cover-dragon-rider.png",
  "dungeon-liberator": "/games/cover/dungeon-liberator.png",
  "enchanted-library": "/games/cover/enchanted-library-cover.png",
  "griffin-riders-escape": "/games/cover/cover-griffin-riders-escape.png",
  "griffin-sky-joust": "/games/cover/cover-griffin-sky-joust.png",
  "gryphon-patrol": "/games/cover/cover-gryphon-patrol.png",
  "haunted-library": "/games/cover/cover-haunted-library.png",
  "labyrinth-goblin-king": "/games/cover/cover-labyrinth-of-the-goblin-king.png",
  "magic-defense": "/games/cover/magic-defense-cover.png",
  "paladins-twin-soul": "/games/cover/cover-paladins-twin-soul.png",
  "potion-rush": "/games/cover/potion-rush-cover.png",
  "realm-carver": "/games/cover/cover-realm-carver.png",
  "rpg-battle": "/games/cover/rpg-battle-cover.png",
  "rune-forge-chamber": "/games/cover/cover-rune-forge-chamber.png",
  "rune-match": "/games/cover/rune-match-cover.png",
  "shadow-gate-dungeon": "/games/cover/cover-shadow-gate-dungeon.png",
  "sorcerer-ziggurat": "/games/cover/cover-sorcerers-ziggurat.png",
  "spellweavers-run": "/games/cover/cover-spellweavers-run.png",
  "storm-castle-tower": "/games/cover/cover-storm-the-castle-tower.png",
  "village-guardian": "/games/cover/cover-village-guardian.png",
  "wizard-vs-zombie": "/games/cover/wizard-vs-zombie-cover.png",
});

/**
 * Builds the live APK student route for one catalog cartridge.
 * @param cartridgeId Public cartridge identifier.
 * @returns The authenticated APK path for that cartridge.
 */
function catalogApkHref(cartridgeId: string): string {
  return `/student/games/apk/${cartridgeId}`;
}

/**
 * Resolves a catalog cover image for one cartridge.
 * @param cartridgeId Public cartridge identifier.
 * @returns A public cover path used by the student catalog card.
 */
function catalogCover(cartridgeId: string): string {
  return CATALOG_COVERS[cartridgeId] ?? `/games/cover/${cartridgeId}-cover.png`;
}

/**
 * Renders the Reading student catalog with a Play link for every live APK title.
 * @returns The student games catalog page.
 */
export default function GamesPage() {
  const router = useRouter();
  const t = useScopedI18n("pages.student.gamesPage");
  const vocabularyGames = cartridgeCatalog.filter((entry) => entry.inputMode === "vocabulary");
  const sentenceGames = cartridgeCatalog.filter((entry) => entry.inputMode === "sentence");

  return (
    <>
      <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6">
        <div className="flex flex-col gap-12">
          <section>
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">{t("sections.vocabulary")}</h2>
              <p className="text-muted-foreground">{t("sections.vocabularyDescription")}</p>
            </div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <TooltipProvider>
                {vocabularyGames.map((game) => (
                  <div key={game.id} className="h-full">
                    <Card
                      className="group relative h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 hover:z-30 cursor-pointer border-2 hover:border-primary/50 bg-card/50 backdrop-blur-sm flex flex-col"
                      onClick={() => router.push(catalogApkHref(game.id))}
                    >
                      <CardHeader className="relative p-0 overflow-hidden shrink-0">
                        <div className="relative w-full h-48 group-hover:h-56 transition-all duration-300 overflow-hidden">
                          <Image
                            src={catalogCover(game.id)}
                            alt={game.title}
                            fill
                            className="object-cover transition-all duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute bottom-4 right-4 z-10 bg-white/90 dark:bg-gray-900/90 p-2 rounded-lg shadow-lg">
                              <Gamepad2 className="h-6 w-6 text-primary" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("clickToPlay")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </CardHeader>
                      <CardContent className="pt-6 pb-4 space-y-4 flex-1 flex flex-col">
                        <CardTitle className="mb-2 text-2xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                          {game.title}
                        </CardTitle>
                        <CardDescription className="text-base leading-relaxed line-clamp-3">
                          {game.description}
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="pt-0 pb-6 mt-auto">
                        <Button
                          className="w-full font-semibold text-base h-11 shadow-md hover:shadow-lg"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(catalogApkHref(game.id));
                          }}
                        >
                          <Gamepad2 className="w-4 h-4 mr-2" />
                          {t("playNow")}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </section>

          <section>
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">{t("sections.sentence")}</h2>
              <p className="text-muted-foreground">{t("sections.sentenceDescription")}</p>
            </div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <TooltipProvider>
                {sentenceGames.map((game) => (
                  <div key={game.id} className="h-full">
                    <Card
                      className="group relative h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1 hover:z-30 cursor-pointer border-2 hover:border-primary/50 bg-card/50 backdrop-blur-sm flex flex-col"
                      onClick={() => router.push(catalogApkHref(game.id))}
                    >
                      <CardHeader className="relative p-0 overflow-hidden shrink-0">
                        <div className="relative w-full h-48 group-hover:h-56 transition-all duration-300 overflow-hidden">
                          <Image
                            src={catalogCover(game.id)}
                            alt={game.title}
                            fill
                            className="object-cover transition-all duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 pb-4 space-y-4 flex-1 flex flex-col">
                        <CardTitle className="mb-2 text-2xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                          {game.title}
                        </CardTitle>
                        <CardDescription className="text-base leading-relaxed line-clamp-3">
                          {game.description}
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="pt-0 pb-6 mt-auto">
                        <Button
                          className="w-full font-semibold text-base h-11 shadow-md hover:shadow-lg"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(catalogApkHref(game.id));
                          }}
                        >
                          <Gamepad2 className="w-4 h-4 mr-2" />
                          {t("playNow")}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
