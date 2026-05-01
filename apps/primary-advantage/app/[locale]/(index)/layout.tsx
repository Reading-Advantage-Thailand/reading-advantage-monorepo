import { Footer } from "@/components/index/footer";
import { MainNav } from "@/components/nav/main-nav";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { indexPageConfig } from "@/configs/index-page-config";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await auth();
  const t = await getTranslations("MainNav");

  // return (
  //   <div className="bg-background relative z-10 flex min-h-svh flex-col">
  //     <SiteHeader />
  //     <main className="flex flex-1 flex-col">{children}</main>
  //     <Footer />
  //   </div>
  // );

  if (!session?.user) {
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
              {/* <ProgressBar progress={user.xp} level={user.level!} /> */}
              <nav>
                <UserAccountNav user={session?.user} />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </div>
    );
  }

  // if (user && user.cefr_level === "" && user.level === 0 && user.xp === 0) {
  //   return (
  //     <div className="bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
  //       <div className="flex min-h-screen flex-col">
  //         <header className="container z-40 bg-background">
  //           <div className="flex h-20 items-center justify-between py-6">
  //             <MainNav items={indexPageConfig.mainNav} />
  //             <nav>
  //               <UserAccountNav user={user} />
  //             </nav>
  //           </div>
  //         </header>
  //         <main className="flex-1">{children}</main>
  //         <Footer />
  //       </div>
  //     </div>
  //   );
  // } else {
  //   return (
  //     <div className="bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
  //       <div className="flex min-h-screen flex-col">
  //         <header className="container z-40">
  //           <div className="flex h-20 items-center justify-between py-6">
  //             <MainNav items={indexPageConfig.mainNav} />
  //             {/* <ProgressBar progress={user.xp} level={user.level!} /> */}
  //             <nav>
  //               <UserAccountNav user={user} />
  //             </nav>
  //           </div>
  //         </header>
  //         <main className="flex-1">{children}</main>
  //         <Footer />
  //       </div>
  //     </div>
  //   );
  // }
}
