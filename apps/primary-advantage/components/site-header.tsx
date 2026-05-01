import { Link } from "@/i18n/navigation";

import { siteConfig } from "@/configs/site-config";
import { Icons } from "@/components/icons";
import { MainNav } from "@/components/nav/new-main-nav";
import { MobileNav } from "@/components/nav/new-mobile-nav";
import { SiteConfig } from "@/components/site-config";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-50 w-full">
      <div className="container-wrapper 3xl:fixed:px-0 px-6">
        <div className="3xl:fixed:container flex h-(--header-height) items-center gap-2 **:data-[slot=separator]:!h-4">
          <MobileNav
            // tree={pageTree}
            items={siteConfig?.navItems || []}
            className="flex lg:hidden"
          />
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden size-8 lg:flex"
          >
            <Link href="/">
              <Icons.logo />
              <span className="font-heading font-bold text-[#22d3ee]">
                {siteConfig.name}
              </span>
            </Link>
          </Button>
          <MainNav
            items={siteConfig?.navItems || []}
            className="hidden lg:flex"
          />
          <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
            <div className="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
              {/* <CommandMenu
                tree={pageTree}
                colors={colors}
                navItems={siteConfig.navItems}
              /> */}
            </div>
            <Separator
              orientation="vertical"
              className="ml-2 hidden lg:block"
            />
            {/* <GitHubLink /> */}
            <Separator orientation="vertical" className="3xl:flex hidden" />
            <SiteConfig className="3xl:flex hidden" />
            <Separator orientation="vertical" />
            {/* <ModeSwitcher /> */}
          </div>
        </div>
      </div>
    </header>
  );
}
