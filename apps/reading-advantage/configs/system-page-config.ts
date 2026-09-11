import { SystemPageConfig } from "@/types";
import { sharedMainNav } from "./index-page-config";

export const systemPageConfig: SystemPageConfig = {
  mainNav: [...sharedMainNav],
  systemSidebarNav: [
    {
      title: "systemDashboard",
      href: "/system/dashboard",
      icon: "dashboard",
    },
    {
      title: "schoolsDashboard",
      href: "/system/schooldashboard",
      icon: "MonitorCog",
    },
    {
      title: "handlePassages",
      href: "/system/handle-passages",
      icon: "book",
    },
    {
      title: "reports",
      href: "/system/reports",
      icon: "report",
    },
    {
      title: "license",
      href: "/system/license",
      icon: "scrollText",
    },
  ],
};
