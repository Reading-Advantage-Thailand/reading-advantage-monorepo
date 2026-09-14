import { PageConfig } from "@/types";
import { sharedMainNav } from "./main-nav";

export const systemPageConfig: PageConfig = {
  mainNav: [...sharedMainNav],
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
    {
      title: "testing",
      href: "/system/test",
      icon: "LayoutDashboardIcon",
    },
  ],
};
