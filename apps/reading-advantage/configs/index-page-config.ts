import { IndexPageConfig, MainNavItem } from "@/types";

/**
 * Main navigation shared by the index, student, teacher, admin, and system
 * route groups.
 */
export const sharedMainNav: MainNavItem[] = [
  {
    title: "home",
    href: "/",
  },
  {
    title: "about",
    href: "/about",
  },
  {
    title: "contact",
    href: "/contact",
  },
  {
    title: "authors",
    href: "/authors",
  },
];

export const indexPageConfig: IndexPageConfig = {
  mainNav: [...sharedMainNav],
};
