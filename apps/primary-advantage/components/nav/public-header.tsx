import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MainNavItem } from "@/types";
import { Brand } from "./brand";

/**
 * Renders the header of public pages: the brand, the marketing links (signed-out visitors
 * only; pass no links for signed-in users), and the actions on the right.
 * @param props The marketing links and the actions (for example the login link).
 * @returns The public header.
 */
export function PublicHeader({ links = [], children }: { links?: MainNavItem[]; children?: ReactNode }) {
  const t = useTranslations("MainNav");
  const tShell = useTranslations("AppShell");
  return (
    <header className="container z-40">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
        <Brand />
        {links.length > 0 && (
          <nav
            aria-label={tShell("publicNavigation")}
            className="order-last w-full overflow-x-auto md:order-none md:w-auto md:flex-1"
          >
            <ul className="flex gap-5">
              {links.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground text-sm font-medium whitespace-nowrap"
                  >
                    {t(item.title)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
