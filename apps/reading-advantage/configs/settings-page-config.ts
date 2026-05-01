import { StudentPageConfig } from "@/types";

export const settingsPageConfig: StudentPageConfig = {
  mainNav: [],
  sidebarNav: [
    {
      title: "User Profile",
      href: "/settings/user-profile",
      icon: "user",
    },
    // {
    //     title: "Localization",
    //     href: '/settings/localization',
    //     icon: "globe",
    //     disabled: true,
    // },
  ],
};
