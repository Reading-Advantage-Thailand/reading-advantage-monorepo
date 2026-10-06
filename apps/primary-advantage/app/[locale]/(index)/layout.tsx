import { Footer } from "@/components/index/footer";
import { PublicHeader } from "@/components/nav/public-header";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import { buttonVariants } from "@/components/ui/button";
import { indexPageConfig } from "@/configs/index-page-config";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ReactNode } from "react";

/**
 * Renders the public pages. Signed-out visitors see the marketing links and the login
 * link; signed-in users see only the brand and their account menu.
 * @param props The page content.
 * @returns The public layout.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const t = await getTranslations("MainNav");

  return (
    <div className="flex min-h-screen flex-col">
      {user ? (
        <PublicHeader>
          <UserAccountNav user={user} />
        </PublicHeader>
      ) : (
        <PublicHeader links={indexPageConfig.mainNav}>
          <Link
            href="/auth/signin"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "px-4")}
          >
            {t("login")}
          </Link>
        </PublicHeader>
      )}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
