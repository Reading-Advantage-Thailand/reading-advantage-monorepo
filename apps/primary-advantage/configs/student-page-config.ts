import { PageConfig } from "@/types";
import { sharedMainNav } from "./main-nav";

export const studentPageConfig: PageConfig = {
  mainNav: [...sharedMainNav],
  sidebarNav: [
    {
      title: "read",
      href: "/student/read",
      icon: "BookIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
    {
      title: "games",
      href: "/student/games",
      icon: "BookIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
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
