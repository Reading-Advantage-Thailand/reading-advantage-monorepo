import { Footer } from "@/components/index/footer";
import { MainNav } from "@/components/nav/main-nav";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { indexPageConfig } from "@/configs/index-page-config";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const t = await getTranslations("MainNav");

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="z-40 container">
          <div className="flex h-20 items-center justify-between py-6">
            <MainNav items={indexPageConfig.mainNav} />
            <nav>
              <Link
                href="/auth/signin"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "px-4",
                )}
              >
                {t("login")}
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    );
  } else {
    return (
      <div className="bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="flex min-h-screen flex-col">
          <header className="z-40 container">
            <div className="flex h-20 items-center justify-between py-6">
              <MainNav items={indexPageConfig.mainNav} />
              <nav>
                <UserAccountNav user={{ ...user, xp: 0, level: 0, cefrLevel: "", email: null, image: null }} />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </div>
    );
  }
}
