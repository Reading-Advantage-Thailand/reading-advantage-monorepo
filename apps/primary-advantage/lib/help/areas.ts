import { HELP_VIDEOS, type HelpVideo } from "./videos";

/** The areas of the teacher help index (track primary_in_app_help_20261023, FR-9), in page order. */
export const HELP_AREAS = ["start", "signin", "roster", "books", "reports", "games", "avatars", "quest"] as const;
/** One area of the teacher help index. */
export type HelpArea = (typeof HELP_AREAS)[number];

/** The first rule that matches any route of a video gives its area. A video with no match is in "start". */
const RULES: readonly [HelpArea, (route: string) => boolean][] = [
  ["signin", (route) => route.startsWith("/auth/")],
  ["quest", (route) => route.startsWith("/teacher/quest")],
  ["games", (route) => route.startsWith("/teacher/game-challenges")],
  ["avatars", (route) => route.endsWith("/avatars")],
  ["books", (route) => route.includes("/books/")],
  ["reports", (route) => /^\/teacher\/(reports|student-progress|assignments)/.test(route)],
  ["roster", (route) => /^\/teacher\/(class-roster|my-classes)/.test(route)],
];

/**
 * The area of a video in the teacher help index.
 * @param video A registry video.
 * @returns The area of the first matching rule, else "start".
 */
export function helpArea(video: HelpVideo): HelpArea {
  return RULES.find(([, test]) => video.routes.some(test))?.[0] ?? "start";
}

/**
 * The enabled teacher videos by area, for `/teacher/help` (FR-9), and the parent videos in "start" (a
 * teacher shows them at a parent meeting; PR look check M3). Empty areas are left out.
 * @param videos The registry (the default is HELP_VIDEOS).
 * @returns The areas in page order, each with its videos in registry order.
 */
export function teacherHelpIndex(videos: readonly HelpVideo[] = HELP_VIDEOS): { area: HelpArea; videos: HelpVideo[] }[] {
  const teacher = videos.filter((video) => video.enabled && video.audience !== "student");
  return HELP_AREAS.map((area) => ({ area, videos: teacher.filter((video) => helpArea(video) === area) })).filter((group) => group.videos.length > 0);
}
