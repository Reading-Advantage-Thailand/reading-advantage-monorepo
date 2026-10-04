import { PageConfig } from "@/types";

/** SYSTEM navigation: bottom-bar tabs and the current system menu. */
export const systemPageConfig: PageConfig = {
  tabs: [
    { key: "dashboard", href: "/system/dashboard", icon: "LayoutDashboardIcon" },
    { key: "schools", href: "/system/schools", icon: "SchoolIcon" },
    { key: "licenses", href: "/system/licenses", icon: "KeyIcon" },
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
    {
      title: "testing",
      href: "/system/test",
      icon: "LayoutDashboardIcon",
    },
  ],
};
