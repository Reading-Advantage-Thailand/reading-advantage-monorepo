import { PageConfig } from "@/types";
import type { Permission } from "@/lib/permissions";

export const teacherPageConfig: PageConfig = {
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
        // {
        //   title: "studentProgress",
        //   href: "/teacher/student-progress",
        //   icon: "TrendingUpIcon",
        //   requiredPermissions: ["REPORTS_ACCESS"],
        // },
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
        // {
        //   title: "performanceAnalytics",
        //   href: "/teacher/reports/analytics",
        //   icon: "BarChartIcon",
        //   requiredPermissions: ["REPORTS_ACCESS"],
        // },
        // {
        //   title: "progressTracking",
        //   href: "/teacher/reports/progress",
        //   icon: "TrendingUpIcon",
        //   requiredPermissions: ["REPORTS_ACCESS"],
        // },
      ],
    },

    // Uncommented items can be added as regular or collapsible sections:
    // {
    //   title: "passages",
    //   href: "/teacher/passages",
    //   icon: "FileTextIcon",
    // },
    // {
    //   title: "google classroom",
    //   href: "/teacher/classroom",
    //   icon: "GraduationCapIcon",
    // },
    {
      title: "assignments",
      href: "/teacher/assignments",
      icon: "ClipboardCheckIcon",
      requiredPermissions: ["TEACHER_ACCESS"],
    },
  ],
};
