import { SystemPageConfig } from "@/types";

export const systemPageConfig: SystemPageConfig = {
  mainNav: [
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
  ],
  systemSidebarNav: [
    {
      title: "System Dashboard",
      href: "/system/dashboard",
      icon: "dashboard",
    },
    {
      title: "Schools Dashboard",
      href: "/system/schooldashboard",
      icon: "MonitorCog",
    },
    {
      title: "Handle Passages",
      href: "/system/handle-passages",
      icon: "book",
    },
    {
      title: "Reports",
      href: "/system/reports",
      icon: "report",
    },
    {
      title: "License",
      href: "/system/license",
      icon: "scrollText",
    },
  ],
};
