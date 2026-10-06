import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getAvatarState, listAvatarShop, type AvatarShopItem, type AvatarState } from "@reading-advantage/domain/primary-avatar";
import { ErrorState } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { AvatarShop } from "@/components/avatar/avatar-shop";
import { RpgLink } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";

/**
 * Page title: the shop.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Avatar");
  return { title: t("shop.shopTitle") };
}

/**
 * The avatar shop page (FR-5): the GP balance and every piece the catalog has. A student with no
 * avatar goes to the picker first.
 * @returns The page.
 */
export default async function AvatarShopPage() {
  const user = await currentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/auth/signin", locale });
  const t = await getTranslations("Avatar");
  let state: AvatarState | null = null;
  let items: AvatarShopItem[] = [];
  try {
    state = await getAvatarState({ db, user });
    items = await listAvatarShop({ db, user });
  } catch {
    state = null;
  }
  if (state && !state.profile) return redirect({ href: "/student/avatar?from=me", locale });
  // The shop is the armory (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="armory">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("shop.shopTitle")}</h1>
        <p>{t("shop.shopSubtitle")}</p>
      </header>
      {state?.profile ? <AvatarShop items={items} gp={state.gp} profile={state.profile} loadout={state.loadout} /> : <ErrorState className="bg-card border" title={t("shop.shopError")} />}
      <RpgLink href="/student/avatar" tone="iron" className="w-fit">
        {t("shop.home")}
      </RpgLink>
    </Scene>
  );
}
