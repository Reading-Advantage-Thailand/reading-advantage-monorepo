import { PageConfig } from "@/types";

export const settingsPageConfig: PageConfig = {
  mainNav: [],
  sidebarNav: [
    {
      title: "userProfile",
      href: "/settings/user-profile",
      // icon: "user",
    },
    {
      title: "schoolProfile",
      href: "/settings/school-profile",
    },
    // {
    //     title: "Localization",
    //     href: '/settings/localization',
    //     icon: "globe",
    //     disabled: true,
    // },
  ],
};
