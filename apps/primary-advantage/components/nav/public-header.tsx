import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons";
import { siteConfig } from "@/configs/site-config";
import { Link } from "@/i18n/navigation";
import type { MainNavItem } from "@/types";
import { PublicNavLinks } from "./public-nav-links";

/**
 * Renders the wooden header of the public pages (docs/primary-rpg-skin.md): the brand, the
 * marketing links (signed-out visitors only; pass no links for signed-in users), and the
 * actions on the right. On phones the brand is the logo only, so the actions fit beside it,
 * and the header scrolls away with the page.
 * @param props The marketing links and the actions (for example the sign-in link).
 * @returns The public header.
 */
export function PublicHeader({ links = [], children }: { links?: MainNavItem[]; children?: ReactNode }) {
  const t = useTranslations("MainNav");
  const tShell = useTranslations("AppShell");
  const labels = Object.fromEntries(links.map((item) => [item.title, t(item.title)]));
  return (
    <header className="cq cq-header relative z-40 md:sticky md:top-0">
      <div className="container flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <Link href="/" className="cq-brand flex min-h-11 items-center gap-2">
          <Icons.logo alt="" width={28} height={28} />
          <span className="max-sm:sr-only">{siteConfig.name}</span>
        </Link>
        {links.length > 0 && (
          <nav
            aria-label={tShell("publicNavigation")}
            className="order-last -mx-3 w-full overflow-x-auto md:order-none md:mx-0 md:w-auto md:flex-1"
          >
            <PublicNavLinks links={links} labels={labels} />
          </nav>
        )}
        <div className="flex items-center gap-1 sm:gap-2">{children}</div>
      </div>
    </header>
  );
}
