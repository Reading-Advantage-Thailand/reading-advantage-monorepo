import { AdminPageConfig } from "@/types";
import { sharedMainNav } from "./index-page-config";

export const adminPageConfig: AdminPageConfig = {
  mainNav: [...sharedMainNav],
  sidebarNav: [
    {
      title: "adminDashboard",
      href: "/admin/dashboard",
      icon: "dashboard",
    },
    {
      title: "adminManagement",
      href: "/admin/management",
      icon: "MonitorCog",
    },
    {
      title: "adminArticlesCreation",
      href: "/admin/article-creation",
      icon: "BookPlus",
    },
    {
      title: "reports",
      href: "/admin/reports",
      icon: "report",
    },
    {
      title: "teacherAssignments",
      href: "/admin/teacher-assignments",
      icon: "clipboard",
    },
  ],
};
