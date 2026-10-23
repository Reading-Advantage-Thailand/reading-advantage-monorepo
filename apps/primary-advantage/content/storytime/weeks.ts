/** The Storytime weeks received from Workbooks by scripts/storytime/receive-weeks.ts (do not edit by hand). */
export const STORYTIME_WEEKS: Readonly<Record<string, () => Promise<unknown>>> = {
  "2/1": () => import("./l2/w01.json").then((m) => m.default),
  "2/2": () => import("./l2/w02.json").then((m) => m.default),
  "2/3": () => import("./l2/w03.json").then((m) => m.default),
  "2/4": () => import("./l2/w04.json").then((m) => m.default),
  "2/5": () => import("./l2/w05.json").then((m) => m.default),
  "2/6": () => import("./l2/w06.json").then((m) => m.default),
  "2/7": () => import("./l2/w07.json").then((m) => m.default),
  "2/8": () => import("./l2/w08.json").then((m) => m.default),
};
