import { SystemPageConfig } from "@/types";
import { sharedMainNav } from "./index-page-config";

export const systemPageConfig: SystemPageConfig = {
  mainNav: [...sharedMainNav],
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
