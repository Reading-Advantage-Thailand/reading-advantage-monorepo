import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getAvatarState, toLaunchAvatar } from "@reading-advantage/domain/primary-avatar";
import { getBattleState, questTemplate } from "@reading-advantage/domain/primary-quest";
import { getCartridgeCatalogEntry } from "@reading-advantage/game-cartridges";
import { EmptyState } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { BattleClient } from "@/components/quest/battle-client";

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
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });
  const [state, t] = await Promise.all([getBattleState({ db, user }).catch(() => null), getTranslations("Quest.battle")]);
  const template = state ? questTemplate(state.quest.templateId) : undefined;
  const entry = template ? getCartridgeCatalogEntry(template.gameId) : undefined;
  if (!state || !template || !entry || !user.schoolId) {
    return (
      <EmptyState className="bg-card border" title={t("none")}>
        <Link href="/student/home" className="min-h-11 underline-offset-4 hover:underline">
          {t("home")}
        </Link>
      </EmptyState>
    );
  }
  const avatarState = await getAvatarState({ db, user }).catch(() => null);
  return (
    <BattleClient
      initial={state}
      cartridge={{ id: entry.id, title: entry.title, description: entry.description, inputMode: entry.inputMode }}
      ownerKey={`${user.schoolId}:${user.id}`}
      profile={avatarState?.profile ?? null}
      avatar={avatarState ? toLaunchAvatar(avatarState) : null}
    />
  );
}
