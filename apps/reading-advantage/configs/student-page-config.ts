import { StudentPageConfig } from "@/types";
import { sharedMainNav } from "./index-page-config";

export const studentPageConfig: StudentPageConfig = {
  mainNav: [...sharedMainNav],
  sidebarNav: [
    {
      title: "read",
      href: "/student/read",
      icon: "book",
    },
    {
      title: "stories",
      href: "/student/stories",
      icon: "storyBook",
    },
    {
      title: "games",
      href: "/student/games",
      icon: "gamepad",
    },
    {
      title: "assignments",
      href: "/student/assignments",
      icon: "assignments",
    },
    {
      id: "onborda-sentences",
      title: "sentences",
      href: "/student/sentences",
      icon: "flashcard",
    },
    {
      id: "onborda-vocabulary",
      title: "vocabulary",
      href: "/student/vocabulary",
      icon: "book",
    },
    {
      id: "onborda-reports",
      title: "reports",
      href: "/student/reports",
      icon: "dashboard",
    },
    {
      id: "onborda-history",
      title: "history",
      href: "/student/history",
      icon: "record",
    },
  ],
};
