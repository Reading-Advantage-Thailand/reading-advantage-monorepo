/**
 * The signed media URLs (AC-4.7, test strategy P2b.7, task 2b.2).
 *
 * `apps/storytime/lib/media/sign.ts` exports `signWeekMedia(week, deps)`. `deps` holds the storage
 * client and an optional media base; the module reads `STORYTIME_MEDIA_BASE` when the base is
 * absent. The map is `file -> signed URL` for every media path of that week. The real
 * `S3StorageDriver` presigns; presigning is a local computation, so no network call runs.
 *
 * At the base the first assertion fails on `Missing apps/storytime/lib/media/sign.ts`. The module
 * is loaded only after that assertion, so no case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import week1 from "../content/l2/w01.json";
import { mediaPathsOf } from "../scripts/receive-weeks";

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
    // Every media path of the week outside `approval`, not only the `file` fields: the receiver's
    // walker is the one list, and the `approval` subtree holds prose that can end in `.mp3`.
    const expected = new Set(
      mediaPathsOf(week)
        .filter((entry) => !entry.path.startsWith("approval."))
        .map((entry) => entry.file),
    );
    console.log(`signed_map_size_expected=${expected.size}`);
    expect(expected.size, "signed_map_size_expected").toBe(42);

    // F7g positive control: the old pin signed only the `file` fields (26 of the 42), so the
    // unsigned check must report the 16 media paths that the old pin misses.
    const fileOnly = new Set(
      mediaPathsOf(week)
        .filter((entry) => entry.path.endsWith(".file") && !entry.path.startsWith("approval."))
        .map((entry) => entry.file),
    );
    console.log(`file_only_map_size=${fileOnly.size}`);
    expect(fileOnly.size, "file_only_map_size").toBe(26);
    const unsignedUnderOldPin = [...expected].filter((file) => !fileOnly.has(file));
    console.log(`old_pin_unsigned=${unsignedUnderOldPin.length}`);
    expect(unsignedUnderOldPin, "the old `file`-only map leaves 16 unsigned").toHaveLength(16);

    const map = await sign.signWeekMedia(week, { storage, mediaBase: MEDIA_BASE });
    const mediaUrlsFound = Object.keys(map).length;
    console.log(`signed_map_size=${mediaUrlsFound} expected=${expected.size}`);
    expect(mediaUrlsFound, "signed_map_size").toBe(expected.size);
    expect(mediaUrlsFound).toBeGreaterThan(0);

    const unsigned = [...expected].filter((file) => map[file] === undefined);
    console.log(`media_paths_unsigned=${unsigned.length}`);
    expect(unsigned, `unsigned expected media: ${unsigned.join(", ")}`).toEqual([]);

    let signedUrlsChecked = 0;
    for (const [file, rawUrl] of Object.entries(map)) {
      expect(expected.has(file), `${file} is a media path of the week`).toBe(true);
      const url = new URL(rawUrl);
      expect(url.host, `${file} uses the storage host`).toBe("storage.googleapis.com");
      expect(url.pathname.startsWith(`/${BUCKET}/`), `${file} is in the private bucket`).toBe(true);
      expect(rawUrl, `${file} names no public bucket`).not.toContain("primary-app-storage");
      expect(
        decodeURIComponent(url.pathname),
        `${file} is the exact bucket key path`,
      ).toBe(`/${BUCKET}/${file}`);
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

  it("signs the song video, the phone video, both posters, a slow book audio, and a phoneme clip", async () => {
    expect(existsSync(SIGN_MODULE), MISSING).toBe(true);
    const sign = await loadSign();
    const storage = await realStorage();
    const week = cloneWeek();
    const paths = mediaPathsOf(week);
    const targets: Array<[string, string]> = [
      ["song video", "song.video"],
      ["phone video", "song.videoPhone"],
      ["poster", "song.poster"],
      ["phone poster", "song.posterPhone"],
      ["slow book audio", "books.0.audio.slowFile"],
      ["phoneme clip", "focus.element.audio"],
    ];
    const map = await sign.signWeekMedia(week, { storage, mediaBase: MEDIA_BASE });
    for (const [label, path] of targets) {
      const file = paths.find((entry) => entry.path === path)?.file;
      expect(file, `${label} names a media path`).toBeTruthy();
      console.log(`${label.replace(/ /g, "_")}_signed=${file && map[file] ? 1 : 0}`);
      expect(file && map[file], `${label} gets a signed URL`).toBeTruthy();
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
