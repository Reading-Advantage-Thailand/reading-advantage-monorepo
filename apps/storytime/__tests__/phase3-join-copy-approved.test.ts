/**
 * The approved "How to join" copy (Phase 3, task 3.0; PM order 2026-11-16).
 *
 * The expected blocks below are copied byte for byte from table (a) of the hand-off
 * `app-join-page-copy.md` version 0.3 (PR source commit 93662024; Daniel's Thai approval
 * 2026-11-16 07:36 ICT for TH-171 to TH-176). The test reads no file outside the repository and
 * holds no hash, so the CI job needs only the repository.
 *
 * At the base `lib/join-copy.ts` holds `status: "draft"` and `version: "0.1"`, so the status, the
 * version, and the draft-marker rows fail. The text rows already match v0.3: the English and the
 * Thai did not change since v0.1. They hold that match.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getTranslations: async (arg?: { locale?: string }) => (key: string) =>
    `${arg?.locale ?? "th"}:${key}`,
}));

const APP = resolve(import.meta.dirname, "..");
const COPY_FILE = resolve(APP, "lib/join-copy.ts");
const JOIN_PAGE = resolve(APP, "app/[locale]/join/page.tsx");

/** The keys of the copy, in the order of table (a). */
const KEYS = [
  "title",
  "heading",
  "whoItIsFor",
  "howToGetSignIn",
  "contact",
  "signInLink",
] as const;
type Key = (typeof KEYS)[number];
type Copy = Record<Key, string>;

/** Table (a), English column, byte for byte. */
const EXPECTED_EN: Copy = {
  title: "How to Join Storytime Advantage",
  heading: "How to Join Storytime Advantage",
  whoItIsFor:
    "Storytime Advantage is an English program for Anuban 2 to P2 (ages 4 to 8). Each week has one sound, one song, and two books. The songs and the books on this site are for the children in the program.",
  howToGetSignIn:
    "The child's school or tutor gives the family its sign-in details. A parent, or the teacher for the class, signs in on the first visit. The device then stays signed in.",
  contact:
    "A family without sign-in details can contact us.<br>LINE Official: ReadingAdvantage<br>https://line.me/ti/p/Pf7_EF98Pv<br>Phone: +66 099-005-8038<br>Email: support@reading-advantage.com<br>Contact page: https://www.reading-advantage.com/contact",
  signInLink: "I have my sign-in details: Sign in",
};

/** Table (a), Thai column, byte for byte (Daniel's check, 2026-11-16 07:36 ICT). */
const EXPECTED_TH: Copy = {
  title: "วิธีเข้าร่วม Storytime Advantage",
  heading: "วิธีเข้าร่วม Storytime Advantage",
  whoItIsFor:
    "Storytime Advantage คือหลักสูตรภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 (อายุประมาณ 4 ถึง 8 ปี) ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม เพลงและหนังสือในเว็บไซต์นี้มีไว้สำหรับเด็กในโครงการ",
  howToGetSignIn:
    "โรงเรียนหรือครูสอนพิเศษของเด็กมอบข้อมูลเข้าสู่ระบบให้ครอบครัว ผู้ปกครอง หรือครูประจำชั้น เข้าสู่ระบบครั้งแรก แล้วอุปกรณ์นั้นก็ยังเข้าสู่ระบบอยู่",
  contact:
    "ครอบครัวที่ยังไม่มีข้อมูลเข้าสู่ระบบติดต่อเราได้<br>LINE Official: ReadingAdvantage<br>https://line.me/ti/p/Pf7_EF98Pv<br>โทร: +66 099-005-8038<br>อีเมล: support@reading-advantage.com<br>หน้าติดต่อ: https://www.reading-advantage.com/contact",
  signInLink: "มีข้อมูลเข้าสู่ระบบแล้ว: เข้าสู่ระบบ",
};

/** The shape of the copy module that the test reads. */
interface CopyModule {
  /** The copy object of the page. */
  JOIN_COPY: Record<string, unknown> & {
    status: string;
    version: string;
    en: Copy;
    th: Copy;
  };
  /** Gives the copy of one locale. */
  joinCopy: (locale: string) => Copy;
}

/** Loads the copy module. */
async function copyModule(): Promise<CopyModule> {
  expect(existsSync(COPY_FILE), "Missing apps/storytime/lib/join-copy.ts").toBe(
    true,
  );
  return (await import("../lib/join-copy.js")) as CopyModule;
}

/** Renders the join page for one locale. */
async function renderJoin(locale: string): Promise<string> {
  expect(
    existsSync(JOIN_PAGE),
    "Missing apps/storytime/app/[locale]/join/page.tsx",
  ).toBe(true);
  const mod = (await import("../app/[locale]/join/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  const element = await mod.default({
    params: Promise.resolve({ locale }),
  } as never);
  return renderToStaticMarkup(element as ReactElement);
}

describe("approved how-to-join copy (red)", () => {
  it("holds the English of table (a) byte for byte", async () => {
    expect(Object.keys(EXPECTED_EN), "the six English blocks").toEqual([
      ...KEYS,
    ]);
    const { JOIN_COPY } = await copyModule();
    for (const key of KEYS) {
      expect(EXPECTED_EN[key].length, `${key} holds English`).toBeGreaterThan(
        0,
      );
      expect(JOIN_COPY.en[key], `en ${key}`).toBe(EXPECTED_EN[key]);
    }
  });

  it("holds the Thai of table (a) byte for byte", async () => {
    expect(Object.keys(EXPECTED_TH), "the six Thai blocks").toEqual([...KEYS]);
    const { JOIN_COPY } = await copyModule();
    for (const key of KEYS) {
      expect(EXPECTED_TH[key].length, `${key} holds Thai`).toBeGreaterThan(0);
      expect(JOIN_COPY.th[key], `th ${key}`).toBe(EXPECTED_TH[key]);
    }
  });

  it("keeps the block order of table (a)", async () => {
    const { JOIN_COPY } = await copyModule();
    expect(Object.keys(JOIN_COPY.en), "the English order").toEqual([...KEYS]);
    expect(Object.keys(JOIN_COPY.th), "the Thai order").toEqual([...KEYS]);
  });

  it("marks the copy approved", async () => {
    const { JOIN_COPY } = await copyModule();
    expect(JOIN_COPY.status, "the copy status").toBe("approved");
  });

  it("names hand-off 0.3 and drops 0.1", async () => {
    const { JOIN_COPY } = await copyModule();
    expect(JOIN_COPY.version, "the version names 0.3").toMatch(/0\.3/);
    expect(JOIN_COPY.version, "the version drops 0.1").not.toMatch(/0\.1/);
  });

  it("holds no zh copy, and a zh locale shows the English", async () => {
    const { JOIN_COPY, joinCopy } = await copyModule();
    expect(Object.keys(JOIN_COPY), "no zh key").not.toContain("zh");
    expect(joinCopy("zh"), "the zh locale shows the English").toEqual(
      JOIN_COPY.en,
    );
    expect(joinCopy("en"), "the en locale shows the English").toEqual(
      JOIN_COPY.en,
    );
    expect(joinCopy("th"), "the th locale shows the Thai").toEqual(
      JOIN_COPY.th,
    );
  });

  it("shows no draft marker when the status is approved", async () => {
    const { JOIN_COPY } = await copyModule();
    for (const locale of ["th", "en"] as const) {
      const html = await renderJoin(locale);
      const heading =
        locale === "th" ? JOIN_COPY.th.heading : JOIN_COPY.en.heading;
      expect(html, `${locale} renders the heading`).toContain(heading);
      expect(html, `${locale} shows no draft marker`).not.toContain(
        "data-draft",
      );
      expect(html, `${locale} writes no draft marker text`).not.toContain(
        "joinDraftMarker",
      );
    }
  });
});
