import type { Metadata } from "next";
import { ArrowLeftIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getAvatarState, listAvatarShop, type AvatarShopItem, type AvatarState } from "@reading-advantage/domain/primary-avatar";
import { ErrorState } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { AvatarShop } from "@/components/avatar/avatar-shop";

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
  return (
    <div className="flex flex-col gap-6">
      <Link href="/student/avatar" className="text-muted-foreground inline-flex min-h-11 items-center gap-2 text-sm hover:underline">
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("shop.home")}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("shop.shopTitle")}</h1>
        <p className="text-muted-foreground">{t("shop.shopSubtitle")}</p>
      </header>
      {state ? <AvatarShop items={items} gp={state.gp} /> : <ErrorState className="bg-card border" title={t("shop.shopError")} />}
    </div>
  );
}
