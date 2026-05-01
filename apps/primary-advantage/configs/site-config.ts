import { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  name: "Primary Advantage",
  description: "Extensive reading app incorporating AI.",
  url: "https://primary.reading-advantage.com",
  ogImage: "",
  link: {
    github: "https://github.com/Reading-Advantage-Thailand/primary-advantage",
  },
  navItems: [
    {
      href: "/",
      label: "home",
      icon: "HomeIcon",
    },
    {
      href: "/contact",
      label: "contact",
      icon: "MailIcon",
    },

    {
      href: "/about",
      label: "about",
      icon: "InfoIcon",
    },
    {
      href: "/authors",
      label: "authors",
      icon: "UsersIcon",
    },
  ],
};
