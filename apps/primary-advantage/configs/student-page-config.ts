import { PageConfig } from "@/types";
import type { Permission } from "@/lib/permissions";

export const studentPageConfig: PageConfig = {
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
      title: "read",
      href: "/student/read",
      icon: "BookIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
    // {
    //   title: "stories",
    //   href: "/student/stories",
    //   icon: "BookAIcon",
    //   requiredPermissions: ["STUDENT_ACCESS"],
    // },
    {
      title: "assignments",
      href: "/student/assignments",
      icon: "ClipboardCheckIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
    {
      id: "onborda-sentences",
      title: "sentences",
      href: "/student/sentences",
      icon: "AlbumIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
    {
      id: "onborda-vocabulary",
      title: "vocabulary",
      href: "/student/vocabulary",
      icon: "BookIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
    {
      id: "onborda-reports",
      title: "reports",
      href: "/student/reports",
      icon: "LayoutDashboard",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
    {
      id: "onborda-history",
      title: "history",
      href: "/student/history",
      icon: "HistoryIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
  ],
};
