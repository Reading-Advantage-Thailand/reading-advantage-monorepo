// @vitest-environment node
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMES } from "@reading-advantage/game-cartridges-3d";
import { routeScore } from "../match";
import { HELP_VIDEOS, helpVideoSchema } from "../videos";

/** Every page route of the app, in the folder form of the registry (route groups removed). */
function appRoutes(): Set<string> {
  const root = fileURLToPath(new URL("../../../app/[locale]", import.meta.url));
  const routes = new Set<string>();
  const walk = (dir: string, segments: string[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name === "page.tsx") routes.add(`/${segments.join("/")}`);
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
      const group = /^\(.+\)$/.test(entry.name) || entry.name.startsWith("@");
      walk(join(dir, entry.name), group ? segments : [...segments, entry.name]);
    }
  };
  walk(root, []);
  return routes;
}

describe("help video registry (spec FR-5)", () => {
  it("parses every entry, with unique ids", () => {
    for (const video of HELP_VIDEOS) expect(() => helpVideoSchema.parse(video), video.id).not.toThrow();
    const ids = HELP_VIDEOS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives teachers landscape videos and students portrait videos", () => {
    for (const video of HELP_VIDEOS) {
      if (video.audience !== "parent") expect(video.format, video.id).toBe(video.audience === "teacher" ? "16x9" : "9x16");
    }
  });

  it("keeps each route in its audience's area (the sign-in pages serve both)", () => {
    const areaOf = (route: string) => ({ teacher: "teacher", student: "student", settings: "student" })[route.split("/")[1]];
    for (const video of HELP_VIDEOS) {
      for (const route of video.routes.filter((r) => !r.startsWith("/auth/"))) {
        expect(areaOf(route), `${video.id} ${route}`).toBe(video.audience);
      }
    }
  });

  it("points every route at a real page of the app (AC-4)", () => {
    const routes = [...appRoutes()];
    expect(routes).toContain("/teacher/class-roster/[classroomId]");
    for (const video of HELP_VIDEOS) {
      for (const route of video.routes) {
        // A route is a page folder, or a concrete path of a page with a dynamic segment (one game).
        const real = routes.includes(route) || routes.some((page) => page.includes("[") && routeScore(page, route) !== null);
        expect(real, `${video.id} ${route}`).toBe(true);
      }
    }
  });

  it("gives each game video the page of a real game, one video per game", () => {
    const games = HELP_VIDEOS.flatMap((v) => v.routes).filter((r) => r.startsWith("/student/games/apk/")).map((r) => r.split("/").pop());
    expect(games).toHaveLength(GAMES.length);
    expect([...games].sort()).toEqual(GAMES.map((g) => g.id).sort());
  });

  it("has general videos for both shells (spec FR-4)", () => {
    const general = (audience: string) => HELP_VIDEOS.filter((v) => v.general && v.enabled && v.audience === audience).map((v) => v.id);
    expect(general("teacher")).toEqual(["A2", "E7"]);
    expect(general("student")).toEqual(["C1", "C2"]);
  });
});

describe("manual videos (FR-10)", () => {
  it("names an enabled teacher video for each manual section that has one", async () => {
    const { MANUAL_SECTIONS } = await import("@/lib/teacher-manual-guide");
    for (const section of MANUAL_SECTIONS.filter((s) => s.video)) {
      const video = HELP_VIDEOS.find((v) => v.id === section.video);
      expect(video, section.id).toMatchObject({ audience: "teacher", enabled: true });
    }
  });
});
