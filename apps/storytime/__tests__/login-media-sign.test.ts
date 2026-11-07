/**
 * The signed media URLs (AC-4.7, test strategy P2b.7, task 2b.2).
 *
 * `apps/storytime/lib/media/sign.ts` exports `signWeekMedia(week, deps)`. `deps` holds the storage
 * client and an optional media base; the module reads `STORYTIME_MEDIA_BASE` when the base is
 * absent. The map is `file -> signed URL` for the `file` fields of that week only. The real
 * `S3StorageDriver` presigns; presigning is a local computation, so no network call runs.
 *
 * At the base the first assertion fails on `Missing apps/storytime/lib/media/sign.ts`. The module
 * is loaded only after that assertion, so no case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import week1 from "../content/l2/w01.json";

const APP = resolve(import.meta.dirname, "..");
const SIGN_MODULE = resolve(APP, "lib/media/sign.ts");
const MISSING = "Missing apps/storytime/lib/media/sign.ts";
const BUCKET = "storytime-app-media";
const MEDIA_BASE = `gs://${BUCKET}`;

interface StorageClient {
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

interface SignModule {
  signWeekMedia(
    week: unknown,
    deps: { storage?: StorageClient; mediaBase?: string },
  ): Promise<Record<string, string>>;
}

/** A deep clone of the shipped week 1. */
function cloneWeek(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(week1)) as Record<string, unknown>;
}

/** Collects every `file` value of one week object. */
function collectFiles(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const entry of value) collectFiles(entry, out);
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === "file" && typeof entry === "string") out.push(entry);
      else collectFiles(entry, out);
    }
  }
  return out;
}

/** Builds the real storage client with fake keys and the Google interop endpoint. */
async function realStorage(): Promise<StorageClient> {
  const mod = (await import("@reading-advantage/storage")) as {
    createStorageClient(config: {
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    }): StorageClient;
  };
  return mod.createStorageClient({
    endpoint: "https://storage.googleapis.com",
    region: "auto",
    bucket: BUCKET,
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
  });
}

/** Loads the signing module after the pinned path check. */
async function loadSign(): Promise<SignModule> {
  const modulePath = resolve(APP, "lib/media/sign.js");
  return (await import(/* @vite-ignore */ modulePath)) as SignModule;
}

afterEach(() => {
  delete process.env.STORYTIME_MEDIA_BASE;
});

describe("login media sign (red)", () => {
  it("signs every file of the week for the private bucket with a six-hour expiry", async () => {
    expect(existsSync(SIGN_MODULE), MISSING).toBe(true);
    const sign = await loadSign();
    const storage = await realStorage();
    const week = cloneWeek();
    const files = new Set(collectFiles(week));
    expect(files.size, "the fixture holds files").toBeGreaterThan(0);
    const map = await sign.signWeekMedia(week, { storage, mediaBase: MEDIA_BASE });
    const mediaUrlsFound = Object.keys(map).length;
    console.log(`media_urls_found=${mediaUrlsFound} unique_files=${files.size}`);
    expect(mediaUrlsFound, "media_urls_found").toBe(files.size);
    expect(mediaUrlsFound).toBeGreaterThan(0);

    let signedUrlsChecked = 0;
    for (const [file, rawUrl] of Object.entries(map)) {
      expect(files.has(file), `${file} is a file of the week`).toBe(true);
      const url = new URL(rawUrl);
      expect(url.host, `${file} uses the storage host`).toBe("storage.googleapis.com");
      expect(url.pathname.startsWith(`/${BUCKET}/`), `${file} is in the private bucket`).toBe(true);
      expect(rawUrl, `${file} names no public bucket`).not.toContain("primary-app-storage");
      expect(rawUrl, `${file} names no media proxy`).not.toContain("/media/");
      expect(url.searchParams.get("X-Amz-Signature"), `${file} is signed`).toBeTruthy();
      const expires = Number(url.searchParams.get("X-Amz-Expires"));
      expect(Number.isFinite(expires), `${file} holds X-Amz-Expires`).toBe(true);
      expect(expires, `${file} expires in at most six hours`).toBeLessThanOrEqual(21_600);
      signedUrlsChecked += 1;
    }
    console.log(`signed_urls_checked=${signedUrlsChecked}`);
    expect(signedUrlsChecked, "signed_urls_checked == media_urls_found").toBe(mediaUrlsFound);
  });

  it("signs no path that leaves the week and fails closed on a bad key", async () => {
    expect(existsSync(SIGN_MODULE), MISSING).toBe(true);
    const sign = await loadSign();
    const storage = await realStorage();
    const week = cloneWeek();
    let injected = false;
    const walk = (value: unknown) => {
      if (!injected && value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.file === "string") {
          record.file = "../escape.jpg";
          injected = true;
        }
        for (const entry of Object.values(record)) walk(entry);
      } else if (Array.isArray(value)) {
        for (const entry of value) walk(entry);
      }
    };
    walk(week);
    expect(injected, "the bad key is planted").toBe(true);

    let map: Record<string, string> = {};
    let threw = false;
    try {
      map = await sign.signWeekMedia(week, { storage, mediaBase: MEDIA_BASE });
    } catch {
      threw = true;
    }
    const keys = Object.keys(map);
    console.log(`bad_key_signed=${threw ? 0 : keys.filter((key) => key === "../escape.jpg").length}`);
    expect(threw || !keys.includes("../escape.jpg"), "the bad key is not signed").toBe(true);
    for (const key of keys) {
      expect(key.includes(".."), `${key} holds no dot segments`).toBe(false);
      expect(key.startsWith("/"), `${key} is relative`).toBe(false);
      expect(key.includes("://"), `${key} holds no scheme`).toBe(false);
    }
  });

  it("uses the six-hour constant and refuses a public bucket or a missing client", async () => {
    expect(existsSync(SIGN_MODULE), MISSING).toBe(true);
    const sign = await loadSign();
    const storage = await realStorage();
    const policy = (await import("../lib/auth/session-policy.js")) as {
      MEDIA_URL_EXPIRES_S: number;
    };
    expect(policy.MEDIA_URL_EXPIRES_S, "MEDIA_URL_EXPIRES_S").toBe(21_600);

    process.env.STORYTIME_MEDIA_BASE = "gs://primary-app-storage";
    await expect(
      sign.signWeekMedia(cloneWeek(), { storage }),
      "the public bucket is refused",
    ).rejects.toThrow();

    delete process.env.STORYTIME_MEDIA_BASE;
    await expect(
      sign.signWeekMedia(cloneWeek(), {}),
      "a missing client fails closed and makes no unsigned fallback",
    ).rejects.toThrow();
  });
});
