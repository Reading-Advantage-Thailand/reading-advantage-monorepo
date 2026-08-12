import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getInteractiveMediaAuthGate,
  resolveMediaStorageStatePath,
  selectInteractiveMediaAuthPlan,
} from "../../e2e/interactive-media-auth-gating.js";

const appRoot = resolve(process.cwd());

describe("interactive media authentication gating", () => {
  it("never selects legacy credential posting in company mode", () => {
    const gate = getInteractiveMediaAuthGate({
      hasUsername: true,
      hasPassword: true,
    });

    expect(selectInteractiveMediaAuthPlan("company", gate)).toBe("blocked");
  });

  it("selects the company session path only with explicit storage state", () => {
    const gate = getInteractiveMediaAuthGate({
      hasUsername: false,
      hasPassword: false,
      storageStatePath: "/app/playwright/.auth/codecamp.json",
    });

    expect(selectInteractiveMediaAuthPlan("company", gate)).toBe(
      "company-session",
    );
  });

  it("selects legacy credentials only in explicit legacy mode", () => {
    const gate = getInteractiveMediaAuthGate({
      hasUsername: true,
      hasPassword: true,
    });

    expect(selectInteractiveMediaAuthPlan("legacy", gate)).toBe(
      "legacy-credentials",
    );
    expect(
      selectInteractiveMediaAuthPlan("legacy", {
        hasLegacyCredentials: false,
        hasCompanyStorageState: false,
      }),
    ).toBe("blocked");
  });

  it("keeps the legacy fixture aligned with AuthEntry labels", () => {
    const fixtureSource = readFileSync(
      resolve(process.cwd(), "e2e/interactive-media-acceptance.spec.ts"),
      "utf8",
    );

    expect(fixtureSource).not.toContain("#dashboard-username");
    expect(fixtureSource).not.toContain("#dashboard-password");
    expect(fixtureSource).toContain('getByLabel("Username", { exact: true })');
    expect(fixtureSource).toContain('getByLabel("Password", { exact: true })');
  });

  it("requires a readable regular file contained under the app root", () => {
    expect(resolveMediaStorageStatePath("playwright.config.ts", appRoot)).toBe(
      resolve(appRoot, "playwright.config.ts"),
    );
    expect(() =>
      resolveMediaStorageStatePath("playwright.config.ts/child", appRoot),
    ).toThrow("regular readable file");
    expect(() =>
      resolveMediaStorageStatePath("../package.json", appRoot),
    ).toThrow("inside the Codecamp app root");
  });

  it("rejects absolute and directly nonexistent contained paths", () => {
    expect(() =>
      resolveMediaStorageStatePath(
        resolve(appRoot, "playwright.config.ts"),
        appRoot,
      ),
    ).toThrow("relative app-contained path");

    const missingPath = join(
      "playwright",
      ".auth",
      `.missing-${randomUUID()}.json`,
    );
    expect(() => resolveMediaStorageStatePath(missingPath, appRoot)).toThrow(
      "regular readable file",
    );
  });

  it("rejects a regular file when its readability check fails", () => {
    const appRootFixture = mkdtempSync(join(tmpdir(), "codecamp-media-root-"));
    const statePath = join(appRootFixture, "state.json");
    writeFileSync(statePath, "{}");
    const originalAccessSync = fs.accessSync;
    fs.accessSync = (() => {
      throw new Error("permission denied");
    }) as typeof fs.accessSync;

    try {
      expect(() =>
        resolveMediaStorageStatePath("state.json", appRootFixture),
      ).toThrow("regular readable file");
    } finally {
      fs.accessSync = originalAccessSync;
      rmSync(appRootFixture, { recursive: true, force: true });
    }
  });

  it("rejects a storage-state file symlink that escapes the app root", () => {
    const appRootFixture = mkdtempSync(join(tmpdir(), "codecamp-media-root-"));
    const outsideRoot = mkdtempSync(join(tmpdir(), "codecamp-media-outside-"));
    try {
      const stateDirectory = join(appRootFixture, "playwright", ".auth");
      mkdirSync(stateDirectory, { recursive: true });
      const outsideState = join(outsideRoot, "state.json");
      writeFileSync(outsideState, "{}");
      symlinkSync(outsideState, join(stateDirectory, "state.json"));

      expect(() =>
        resolveMediaStorageStatePath(
          "playwright/.auth/state.json",
          appRootFixture,
        ),
      ).toThrow("must not be a symlink");
    } finally {
      rmSync(appRootFixture, { recursive: true, force: true });
      rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked ancestor that resolves outside the canonical app root", () => {
    const appRootFixture = mkdtempSync(join(tmpdir(), "codecamp-media-root-"));
    const outsideRoot = mkdtempSync(join(tmpdir(), "codecamp-media-outside-"));
    try {
      const outsideStateDirectory = join(outsideRoot, ".auth");
      mkdirSync(outsideStateDirectory, { recursive: true });
      writeFileSync(join(outsideStateDirectory, "state.json"), "{}");
      symlinkSync(outsideRoot, join(appRootFixture, "playwright"), "dir");

      expect(() =>
        resolveMediaStorageStatePath(
          "playwright/.auth/state.json",
          appRootFixture,
        ),
      ).toThrow("canonical Codecamp app root");
    } finally {
      rmSync(appRootFixture, { recursive: true, force: true });
      rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  it("accepts a regular file when the app root itself is a symlink", () => {
    const actualAppRoot = mkdtempSync(join(tmpdir(), "codecamp-media-root-"));
    const linkedParent = mkdtempSync(join(tmpdir(), "codecamp-media-link-"));
    const linkedAppRoot = join(linkedParent, "app");
    try {
      const stateDirectory = join(actualAppRoot, "playwright", ".auth");
      mkdirSync(stateDirectory, { recursive: true });
      const statePath = join(stateDirectory, "state.json");
      writeFileSync(statePath, "{}");
      symlinkSync(actualAppRoot, linkedAppRoot, "dir");

      expect(
        resolveMediaStorageStatePath(
          "playwright/.auth/state.json",
          linkedAppRoot,
        ),
      ).toBe(realpathSync(statePath));
    } finally {
      rmSync(linkedParent, { recursive: true, force: true });
      rmSync(actualAppRoot, { recursive: true, force: true });
    }
  });
});
