import { Footer } from "@/components/index/footer";
import { PublicHeader } from "@/components/nav/public-header";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import { RpgLink } from "@/components/rpg/chrome";
import { SkipLink } from "@/components/shared/skip-link";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { ThemeToggle } from "@/components/switchers/theme-switcher-toggle";
import { indexPageConfig } from "@/configs/index-page-config";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { ReactNode } from "react";

/**
 * Renders the public pages in the Chibi Quest world (spec PP-1): the wooden header, the page's
 * own scene, and the wooden footer. Signed-out visitors see the marketing links and the
 * sign-in link; signed-in users see only the brand and their account menu.
 * @param props The page content.
 * @returns The public layout.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const t = await getTranslations("PublicSite");

  return (
    <div className="cq-world cq cq-public flex min-h-screen flex-col">
      <SkipLink />
      <PublicHeader links={user ? [] : indexPageConfig.mainNav}>
        <LocaleSwitcher />
        <ThemeToggle />
        {user ? (
          <UserAccountNav user={user} />
        ) : (
          <RpgLink href="/auth/signin" tone="gold" small>
            {t("signIn")}
          </RpgLink>
        )}
      </PublicHeader>
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
