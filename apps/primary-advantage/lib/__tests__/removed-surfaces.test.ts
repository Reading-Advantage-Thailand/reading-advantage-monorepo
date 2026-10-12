import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(__dirname, "../..");
const sourceDirs = ["app", "components", "lib", "server", "actions", "configs", "public"];
const sourceExt = /\.(ts|tsx|js|jsx|mjs)$/;
const thisFile = path.resolve(__dirname, "removed-surfaces.test.ts");

/**
 * Lists every source file under the scanned app folders, except this guard test.
 * @returns Absolute paths of the source files.
 */
function listSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next") continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (sourceExt.test(name) && full !== thisFile) out.push(full);
    }
  };
  for (const dir of sourceDirs) walk(path.join(appRoot, dir));
  return out;
}

/**
 * Returns the source files whose text matches a pattern.
 * @param pattern The pattern to search for.
 * @returns Paths relative to the app root.
 */
function filesMatching(pattern: RegExp): string[] {
  return listSources()
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(appRoot, file));
}

describe("SYS-04: System Testing page", () => {
  it("has no page folder and no test actions file", () => {
    expect(existsSync(path.join(appRoot, "app/[locale]/system/test"))).toBe(false);
    expect(existsSync(path.join(appRoot, "actions/test.ts"))).toBe(false);
  });

  it("has no source that names the removed code", () => {
    expect(filesMatching(/deleteAllArticles|@\/actions\/test["']/)).toEqual([]);
  });

  it("has no source that deletes all rows of articles", () => {
    expect(filesMatching(/\.delete\(articles\)\s*(\.returning|;)/)).toEqual([]);
  });
});

describe("ADM-11: Admin Article Creation", () => {
  it("has no page, component, or custom-generate routes", () => {
    expect(existsSync(path.join(appRoot, "app/[locale]/admin/article-creation"))).toBe(false);
    expect(existsSync(path.join(appRoot, "components/admin/article-creation.tsx"))).toBe(false);
    expect(existsSync(path.join(appRoot, "app/api/articles/generate/custom-generate"))).toBe(false);
  });

  it("has no source that names the removed path or exports", () => {
    expect(
      filesMatching(
        /\/admin\/article-creation|custom-generate|\b(?:generateCustomArticle|saveArticleAndPublish|saveArticleAsDraft|saveArticleAsDraftModel|fetchCustomArticleController|createdArticleCustom|updateAprovedCustomArticle|getCustomArticle|checkExistingArticle|getDeleteArticleById|deleteArticleById|deleteArticleByIdModel)\b/,
      ),
    ).toEqual([]);
  });

  it("has no source that deletes a row of articles", () => {
    expect(filesMatching(/\.delete\(articles\)/)).toEqual([]);
  });

  it("has no message key of the removed page in any locale", () => {
    for (const locale of ["en", "th", "cn", "tw", "vi"]) {
      const m = JSON.parse(readFileSync(path.join(appRoot, `messages/${locale}.json`), "utf8"));
      expect(m.Sidebar.articlecreation).toBeUndefined();
      expect(m.AdminArticleCreationPage).toBeUndefined();
      expect(m.Components.AdminArticleCreation).toBeUndefined();
      expect(m.AdminDashboard.quickActions.createArticle).toBeUndefined();
      expect(m.AdminDashboard.quickActions.createArticleDesc).toBeUndefined();
    }
  });
});

describe("Content generation code", () => {
  it("has no bulk route, generators folder, or generator helper files", () => {
    expect(existsSync(path.join(appRoot, "app/api/articles/generate"))).toBe(false);
    expect(existsSync(path.join(appRoot, "server/utils/generators"))).toBe(false);
    expect(existsSync(path.join(appRoot, "server/utils/constants.ts"))).toBe(false);
    expect(existsSync(path.join(appRoot, "server/utils/logging.ts"))).toBe(false);
  });

  it("has no source that names the removed path or exports", () => {
    expect(
      filesMatching(
        /api\/articles\/generate|utils\/generators|\b(?:generateAllArticle|generateAllArticleNew|generateArticle|generateArticleNew|generateArticles|generateQuestions|saveArticleContent|requireToolingAccess|amountPerGenreSchema|articleGeneratorSchema|storyGeneratorSchema)\b/,
      ),
    ).toEqual([]);
  });

  it("has no generator data file", () => {
    const names = [
      "cefr-article-prompts.json",
      "new-article-prompts.json",
      "new-level-evaluation-prompts.json",
      "prompts-combined-LA.json",
      "prompts-combined-MC.json",
      "prompts-combined-SA.json",
      "title-a0.json",
      "title-a1.json",
      "title-a2.json",
      "audios/articles/temp.mp3",
      "audios/sentences/temp.mp3",
      "audios/words/temp.mp3",
      "images/temp.jpg",
    ];
    for (const name of names) {
      expect(existsSync(path.join(appRoot, "data", name))).toBe(false);
    }
  });
});

describe("M4: old game host (safe scope)", () => {
  it("has no host-proof page, route, client, or config", () => {
    for (const rel of [
      "app/[locale]/(host-proof)",
      "app/api/host-proof",
      "components/host-proof",
      "lib/host-proof-config.ts",
      "tests/e2e/host-proof-games.spec.ts",
    ]) {
      expect(existsSync(path.join(appRoot, rel)), rel).toBe(false);
    }
  });

  it("has no source that names the host-proof surface", () => {
    expect(
      filesMatching(/HostProofGameClient|isHostProofEnabled|HOST_PROOF_ENABLED|student\/host-proof|api\/host-proof/),
    ).toEqual([]);
  });

  it("has no old student host and no package dependency on game-cartridges", () => {
    for (const rel of ["components/apk/StudentCartridgeHost.tsx", "components/apk/apk-host-layout.ts", "lib/apk/realm-carver-input.ts"]) {
      expect(existsSync(path.join(appRoot, rel)), rel).toBe(false);
    }
    expect(filesMatching(/StudentCartridgeHost|apk-host-layout|realm-carver-input|@reading-advantage\/game-cartridges(?!-)/)).toEqual([]);
    const pkg = readFileSync(path.join(appRoot, "package.json"), "utf8");
    const next = readFileSync(path.join(appRoot, "next.config.ts"), "utf8");
    expect(pkg).not.toMatch(/@reading-advantage\/game-cartridges["/]/);
    expect(next).not.toMatch(/@reading-advantage\/game-cartridges["/]/);
  });

  it("ships no ElvGames standard pack", () => {
    expect(existsSync(path.join(appRoot, "public/assets/apk/standard-pack-qc"))).toBe(false);
    expect(filesMatching(/standard-pack-qc/)).toEqual([]);
  });
});
