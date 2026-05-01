import { Footer } from "@/components/footer";
import { MainNav } from "@/components/main-navbar";
import { buttonVariants } from "@/components/ui/button";
import { indexPageConfig } from "@/configs/index-page-config";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ReactNode } from "react";
import ProgressBar from "@/components/progress-bar-xp";
import { getCurrentUser } from "@/lib/session";
import { UserAccountNav } from "@/components/user-account-nav";
import { getScopedI18n, setStaticParamsLocale } from "@/locales/server";

export default async function Layout({ 
  children,
  params 
}: { 
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);
  const t = await getScopedI18n("components");
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="flex min-h-screen flex-col bg-foreground/10 dark:bg-foreground/0">
          <header className="container z-40 bg-background/45 rounded-b-3xl shadow-md">
            <div className="flex h-20 items-center justify-between py-6">
              <MainNav />
              <nav>
                <Link
                  href="/auth/signin"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "px-4"
                  )}
                >
                  {t("loginButton")}
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </div>
    );
  }

  if (user && user.cefr_level === "" && user.level === 0 && user.xp === 0) {
    return (
      <div className="bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="flex min-h-screen flex-col bg-foreground/10 dark:bg-foreground/0">
          <header className="container z-40 bg-background">
            <div className="flex h-20 items-center justify-between py-6">
              <MainNav />
              <nav>
                <UserAccountNav user={user} />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </div>
    );
  } else {
    return (
      <div className="bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="flex min-h-screen flex-col bg-foreground/10 dark:bg-foreground/0">
          <header className="container z-40 bg-background/45 rounded-b-3xl shadow-md">
            <div className="flex h-20 items-center justify-between py-6">
              <MainNav />
              {/* <ProgressBar progress={user.xp} level={user.level!} /> */}
              <nav>
                <UserAccountNav user={user} />
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
