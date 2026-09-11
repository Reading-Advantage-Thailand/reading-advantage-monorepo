import { TeacherPageConfig } from "@/types";
import { sharedMainNav } from "./index-page-config";

export const teacherPageConfig: TeacherPageConfig = {
  mainNav: [...sharedMainNav],
  teacherSidebarNav: [
    {
      title: "dashboard",
      href: "/teacher/dashboard",
      icon: "dashboard",
    },
    {
      title: "myClasses",
      href: "/teacher/my-classes",
      icon: "class",
    },
    {
      title: "myStudents",
      href: "/teacher/my-students",
      icon: "student",
    },
    {
      title: "classRoster",
      href: "/teacher/class-roster",
      icon: "roster",
    },
    {
      title: "assignments",
      href: "/teacher/assignments",
      icon: "assignments",
    },
    //{
    //  title: "reports",
    //  href: "/teacher/reports",
    //  icon: "report",
    //},
    {
      title: "passages",
      href: "/teacher/passages",
      icon: "article",
    },
    {
      title: "workbookGenerator",
      href: "/teacher/workbook-generator",
      icon: "book",
    },
    // {
    //   title: "google classroom",
    //   href: "/teacher/classroom",
    //   icon: "class",
    // },
  ],
};
