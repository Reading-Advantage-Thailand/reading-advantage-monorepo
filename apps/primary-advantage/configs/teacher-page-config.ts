import { PageConfig } from "@/types";

/** Teacher navigation: four bottom-bar tabs and the full sidebar list. */
export const teacherPageConfig: PageConfig = {
  tabs: [
    { key: "home", href: "/teacher/dashboard", icon: "HouseIcon" },
    {
      key: "classes",
      href: "/teacher/my-classes",
      icon: "SchoolIcon",
      match: ["/teacher/class-roster", "/teacher/my-students", "/teacher/game-challenges"],
    },
    { key: "assignments", href: "/teacher/assignments", icon: "ClipboardCheckIcon" },
    {
      key: "reports",
      href: "/teacher/reports",
      icon: "ChartColumnBigIcon",
      match: ["/teacher/student-progress"],
    },
  ],
  sidebarNav: [
    {
      title: "home",
      href: "/teacher/dashboard",
      icon: "HouseIcon",
      requiredPermissions: ["TEACHER_ACCESS"],
    },
    // Regular navigation item
    {
      title: "myClasses",
      href: "/teacher/my-classes",
      icon: "SchoolIcon",
      requiredPermissions: ["CLASS_MANAGEMENT"],
    },

    // Collapsible section: Student Management
    {
      title: "myStudents",
      icon: "UsersIcon",
      // You can include href for the parent section too
      href: "/teacher/my-students",
      requiredPermissions: ["TEACHER_ACCESS"],
      items: [
        {
          title: "allStudents",
          href: "/teacher/my-students",
          icon: "UsersIcon",
          requiredPermissions: ["TEACHER_ACCESS"],
        },
        {
          title: "classRoster",
          href: "/teacher/class-roster",
          icon: "ClipboardListIcon",
          requiredPermissions: ["CLASS_MANAGEMENT"],
        },
      ],
    },

    // Collapsible section: Reports & Analytics
    {
      title: "reports",
      icon: "ChartColumnBigIcon",
      requiredPermissions: ["REPORTS_ACCESS"],
      items: [
        {
          title: "overviewReports",
          href: "/teacher/reports",
          icon: "ChartColumnBigIcon",
          requiredPermissions: ["REPORTS_ACCESS"],
        },
      ],
    },

    {
      title: "assignments",
      href: "/teacher/assignments",
      icon: "ClipboardCheckIcon",
      requiredPermissions: ["TEACHER_ACCESS"],
    },
  ],
};
