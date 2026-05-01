import { PageConfig } from "@/types";

export const systemPageConfig: PageConfig = {
  mainNav: [
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
  ],
  sidebarNav: [
    {
      title: "systemdashboard",
      href: "/system/dashboard",
      icon: "LayoutDashboardIcon",
    },
    {
      title: "schools",
      href: "/system/schools",
      icon: "SchoolIcon",
    },
    {
      title: "licenses",
      href: "/system/licenses",
      icon: "KeyIcon",
    },
    // {
    //   title: "testing",
    //   href: "/system/test",
    //   icon: "LayoutDashboardIcon",
    // },
  ],
};
