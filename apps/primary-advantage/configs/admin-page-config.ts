import { PageConfig } from "@/types";

/** School admin navigation: bottom-bar tabs and the current admin menu. */
export const adminPageConfig: PageConfig = {
  tabs: [
    {
      key: "dashboard",
      href: "/admin/dashboard",
      icon: "LayoutDashboardIcon",
      requiredPermissions: ["ADMIN_ACCESS"],
    },
    {
      key: "teachers",
      href: "/admin/teachers",
      icon: "UserIcon",
      requiredPermissions: ["USER_MANAGEMENT"],
    },
    {
      key: "students",
      href: "/admin/students",
      icon: "UsersIcon",
      requiredPermissions: ["USER_MANAGEMENT"],
    },
    {
      key: "import",
      href: "/admin/import-data",
      icon: "UploadIcon",
      requiredPermissions: ["IMPORT_DATA"],
    },
  ],
  sidebarNav: [
    {
      title: "dashboard",
      href: "/admin/dashboard",
      icon: "LayoutDashboardIcon",
      requiredPermissions: ["ADMIN_ACCESS"],
      // hideWhenNoPermission: true,
      items: [
        {
          title: "admin",
          href: "/admin/dashboard",
          icon: "ChevronRightIcon",
          requiredPermissions: ["ADMIN_ACCESS"],
        },
        {
          title: "teachers",
          href: "/admin/dashboard/teachers",
          icon: "ChevronRightIcon",
          requiredPermissions: ["SYSTEM_ACCESS"],
          hideWhenNoPermission: true,
        },
        {
          title: "students",
          href: "/admin/dashboard/students",
          icon: "ChevronRightIcon",
          requiredPermissions: ["SYSTEM_ACCESS"],
          hideWhenNoPermission: true,
        },
      ],
    },
    {
      title: "teachers",
      href: "/admin/teachers",
      icon: "UserIcon",
      requiredPermissions: ["USER_MANAGEMENT"],
      items: [
        {
          title: "allTeachers",
          href: "/admin/teachers",
          icon: "ChevronRightIcon",
          requiredPermissions: ["USER_MANAGEMENT"],
        },
        {
          title: "addTeacher",
          href: "/admin/teachers/add",
          icon: "ChevronRightIcon",
          requiredPermissions: ["USER_MANAGEMENT"],
        },
      ],
    },
    {
      title: "studentsandclasses",
      href: "/admin/students",
      icon: "UsersIcon",
      requiredPermissions: ["USER_MANAGEMENT"],
      items: [
        {
          title: "allStudents",
          href: "/admin/students",
          icon: "ChevronRightIcon",
          requiredPermissions: ["USER_MANAGEMENT"],
        },
        {
          title: "addStudent",
          href: "/admin/students/add",
          icon: "ChevronRightIcon",
          requiredPermissions: ["USER_MANAGEMENT"],
        },
        {
          title: "classrooms",
          href: "/admin/students/classrooms",
          icon: "ChevronRightIcon",
          requiredPermissions: ["CLASS_MANAGEMENT"],
        },
      ],
    },
    {
      title: "importdata",
      href: "/admin/import-data",
      icon: "UploadIcon",
      requiredPermissions: ["IMPORT_DATA"],
    },
    {
      title: "articlecreation",
      href: "/admin/article-creation",
      icon: "FileTextIcon",
      requiredPermissions: ["SYSTEM_ACCESS"],
    },
  ],
};
