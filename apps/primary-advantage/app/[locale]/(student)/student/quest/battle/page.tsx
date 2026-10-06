import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import {
  getAvatarState,
  toLaunchAvatar,
} from "@reading-advantage/domain/primary-avatar";
import {
  getBattleState,
  questTemplate,
} from "@reading-advantage/domain/primary-quest";
import { gameFor } from "@/lib/games/catalog";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { BattleClient } from "@/components/quest/battle-client";
import { Panel, RpgLink } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";

/**
 * Page title: the battle.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Quest.battle");
  return { title: t("title") };
}

/**
 * The phone battle page (FR-9). Without a quest it shows an empty state with a link home.
 * @returns The page.
 */
export default async function QuestBattlePage() {
  const user = await currentUser();
  if (!user)
    return redirect({ href: "/auth/signin", locale: await getLocale() });
  const [state, t] = await Promise.all([
    getBattleState({ db, user }).catch(() => null),
    getTranslations("Quest.battle"),
  ]);
  const template = state ? questTemplate(state.quest.templateId) : undefined;
  const game = template ? gameFor(template.gameId) : undefined;
  if (!state || !template || !game || !user.schoolId) {
    return (
      <Scene place="boss-arena">
        <Panel className="items-center text-center">
          <p className="text-lg font-bold">{t("none")}</p>
          <RpgLink href="/student/home" tone="iron">
            {t("home")}
          </RpgLink>
        </Panel>
      </Scene>
    );
  }
  const avatarState = await getAvatarState({ db, user }).catch(() => null);
  // The battle is the boss arena (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="boss-arena">
      <BattleClient
        initial={state}
        gameId={game.id}
        ownerKey={`${user.schoolId}:${user.id}`}
        profile={avatarState?.profile ?? null}
        avatar={avatarState ? toLaunchAvatar(avatarState) : null}
      />
    </Scene>
  );
}
