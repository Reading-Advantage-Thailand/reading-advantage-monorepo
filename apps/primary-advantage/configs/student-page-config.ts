import { PageConfig } from "@/types";
import { STUDENT_HOME } from "@/components/student-login/use-student-home";

/** Student navigation: four bottom-bar tabs and the full sidebar list. */
export const studentPageConfig: PageConfig = {
  tabs: [
    { key: "home", href: STUDENT_HOME, icon: "HouseIcon" },
    { key: "read", href: "/student/read", icon: "BookOpenIcon", match: ["/student/lesson"] },
    { key: "games", href: "/student/games", icon: "Gamepad2Icon" },
    { key: "me", href: "/settings/user-profile", icon: "CircleUserIcon", match: ["/settings"] },
  ],
  sidebarNav: [
    {
      title: "home",
      href: STUDENT_HOME,
      icon: "HouseIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
    {
      title: "read",
      href: "/student/read",
      icon: "BookOpenIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
    {
      title: "games",
      href: "/student/games",
      icon: "Gamepad2Icon",
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
      icon: "LanguagesIcon",
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
    {
      title: "me",
      href: "/settings/user-profile",
      icon: "CircleUserIcon",
      requiredPermissions: ["STUDENT_ACCESS"],
    },
  ],
};
