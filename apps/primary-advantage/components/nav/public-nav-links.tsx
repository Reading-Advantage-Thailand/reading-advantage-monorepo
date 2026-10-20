"use client";

import { Link, usePathname } from "@/i18n/navigation";
import type { MainNavItem } from "@/types";

/**
 * The marketing links of the public header as plank links; the link of the open page is marked.
 * @param props.links The links.
 * @param props.labels The translated label of each link, by its title key.
 * @returns The list.
 */
export function PublicNavLinks({ links, labels }: { links: MainNavItem[]; labels: Record<string, string> }) {
  const pathname = usePathname();
  return (
    <ul className="flex gap-1">
      {links.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="cq-navlink" aria-current={pathname === item.href ? "page" : undefined}>
            {labels[item.title]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
