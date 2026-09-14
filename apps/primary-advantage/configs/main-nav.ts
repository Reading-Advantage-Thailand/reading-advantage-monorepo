import type { MainNavItem } from "@/types";

/**
 * Shared top-level navigation used by every page config.
 */
export const sharedMainNav: MainNavItem[] = [
  {
    title: "home",
    href: "/",
    icon: "HomeIcon",
  },
  {
    title: "about",
    href: "/about",
    icon: "InfoIcon",
  },
  {
    title: "contact",
    href: "/contact",
    icon: "MailIcon",
  },
  {
    title: "authors",
    href: "/authors",
    icon: "UsersIcon",
  },
];
