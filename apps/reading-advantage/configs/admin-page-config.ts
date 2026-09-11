import { AdminPageConfig } from "@/types";
import { sharedMainNav } from "./index-page-config";

export const adminPageConfig: AdminPageConfig = {
  mainNav: [...sharedMainNav],
  sidebarNav: [
    {
      title: "Admin Dashboard",
      href: "/admin/dashboard",
      icon: "dashboard",
    },
    {
      title: "Admin Management",
      href: "/admin/management",
      icon: "MonitorCog",
    },
    {
      title: "Admin Articles Creation",
      href: "/admin/article-creation",
      icon: "BookPlus",
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: "report",
    },
    {
      title: "Teacher Assignments",
      href: "/admin/teacher-assignments",
      icon: "clipboard",
    },
  ],
};
