// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const routePath = resolve(app, "app/[locale]/st/[level]/[week]/page.tsx");
const route = readFileSync(routePath, "utf8");

describe("Phase 3 tiles and home card", () => {
  it("renders the three tiles with pictures and image.caption alt text", () => {
    expect(route, "entry tile renderer is missing").toMatch(/<img|<Image/);
    expect(route, "read-along, decodable, and song tile entries are required").toMatch(/readalong[\s\S]*decodable[\s\S]*song/i);
    expect(route, "pictures must use image.caption as alt text").toMatch(/alt=\{[^}]*caption/i);
  });

  it("uses recordings from the approved fields and never calls phone speech", () => {
    expect(route, "the page must not invoke phone speech").not.toMatch(/speechSynthesis/);
    expect(route, "recorded label and word audio fields must be used").toMatch(/focus\.element\.audio|element\?\.audio/);
    expect(route, "missing recordings must hide the speaker control").toMatch(/audio[\s\S]*speaker|speaker[\s\S]*audio/i);
    expect(route, "speaker playback must use the recorded file").toMatch(/new Audio|<audio/i);
    expect(route, "home words must not invent audio fields").not.toMatch(/home\.words[^\n]*audio/);
  });

  it("renders the Thai parent line, home words, frame, and activity from week data", () => {
    expect(route, "home parent text must come from home.line.th").toMatch(/home\??\.line\??\.th|home\.line\.th/);
    expect(route, "an empty Thai line must be omitted").toMatch(/line\.th[\s\S]*trim|line\.th[\s\S]*&&/);
    expect(route, "the three home words must come from home.words").toMatch(/home\??\.words/);
    expect(route, "the frame must come from focus.frame").toMatch(/focus\.frame/);
    expect(route, "the activity must come from home.activity").toMatch(/home\.activity/);
  });

  it("shows a karaoke tile only when song.karaoke exists", () => {
    expect(route, "karaoke must be conditional on song.karaoke").toMatch(/song\.karaoke[\s\S]*&&|song\.karaoke\s*\?/);
  });

  it("sets 64-pixel minimum tap targets for entry tiles and speakers", () => {
    expect(route, "entry tiles need a 64-pixel minimum target").toMatch(/min-h-16|min-h-\[64px\]/);
    expect(route, "speaker controls need a 64-pixel minimum target").toMatch(/min-w-16|min-w-\[64px\]/);
  });

  it("marks English and Thai text with the correct language", () => {
    expect(route, "English home text needs lang=en").toMatch(/lang=["']en["']/);
    expect(route, "Thai home text needs lang=th").toMatch(/lang=["']th["']/);
  });

  it("uses the Sarabun font for Thai app text", () => {
    const css = readFileSync(resolve(app, "app/globals.css"), "utf8");
    expect(css, "Thai app text must use Sarabun").toMatch(/Sarabun/i);
  });
});
