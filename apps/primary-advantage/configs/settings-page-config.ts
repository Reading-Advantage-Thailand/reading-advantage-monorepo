import { PageConfig } from "@/types";

/** Settings links that staff see under their area menu (students use the Me tab). */
export const settingsPageConfig: PageConfig = {
  sidebarNav: [
    {
      title: "userProfile",
      href: "/settings/user-profile",
      icon: "UserIcon",
    },
    {
      title: "schoolProfile",
      href: "/settings/school-profile",
      icon: "SchoolIcon",
      requiredPermissions: ["SCHOOL_ADMIN_ACCESS"],
      hideWhenNoPermission: true,
    },
  ],
};
