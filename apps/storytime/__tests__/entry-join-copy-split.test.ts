/**
 * The split of the approved join copy into page pieces (Phase 4, task 4.1, spec FR-A71,
 * AC-A71.9 and AC-A71.10).
 *
 * The five tiles, the hero line, the two steps, the contact lead, and the four button labels
 * are exact substrings of the approved C3 blocks, so the page adds no new claim. The four
 * approved blocks and `signInLink` stay byte for byte. The five new message keys wait for
 * Daniel's Thai check: their Thai value equals the English text until he gives the Thai.
 *
 * At the base the first assertion of the C1, C3, and C4 cases fails, because `JOIN_PIECES`
 * and `ENTRY_PENDING_THAI_KEYS` do not exist in `lib/join-copy.ts` and the message files hold
 * none of the five keys. The copy module is loaded only after the existsSync assertion, so no
 * case fails with a load error.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const APP = resolve(import.meta.dirname, "..");
const COPY_FILE = resolve(APP, "lib/join-copy.ts");
const EN_MESSAGES = resolve(APP, "messages/en.json");
const TH_MESSAGES = resolve(APP, "messages/th.json");
const MISSING_COPY = "Missing apps/storytime/lib/join-copy.ts";

/** The five new message keys, in the order of the pending list. */
const NEW_KEYS = [
  "signInGreeting",
  "signInShowPassword",
  "signInHidePassword",
  "signInNoLogin",
  "joinHowToTitle",
] as const;

/** The PM-approved English values of the five new message keys (2026-11-20). */
const EXPECTED_NEW_EN: Record<string, string> = {
  signInGreeting: "Welcome to Storytime Advantage",
  signInShowPassword: "Show password",
  signInHidePassword: "Hide password",
  signInNoLogin: "No login yet? See how to join",
  joinHowToTitle: "How to get your login",
};

/** The PM-approved Thai drafts of the five new message keys (2026-11-20). */
const EXPECTED_NEW_TH: Record<string, string> = {
  signInGreeting: "ยินดีต้อนรับสู่ Storytime Advantage",
  signInShowPassword: "แสดงรหัสผ่าน",
  signInHidePassword: "ซ่อนรหัสผ่าน",
  signInNoLogin: "ยังไม่มีข้อมูลเข้าสู่ระบบ? ดูวิธีเข้าร่วม",
  joinHowToTitle: "วิธีรับข้อมูลเข้าสู่ระบบ",
};

/** Loads the copy module after the existsSync assertion. */
async function copyModule(): Promise<Record<string, unknown>> {
  expect(existsSync(COPY_FILE), MISSING_COPY).toBe(true);
  return (await import("../lib/join-copy.js")) as Record<string, unknown>;
}

/** Reads one message file as a string map. */
function messages(path: string): Record<string, string> {
  expect(existsSync(path), `Missing ${path}`).toBe(true);
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
}

/** Strips the URL lines of the contact block, which the buttons carry as targets. */
function contactWithoutUrls(block: string): string[] {
  return block.split("<br>").filter((line) => !/https?:\/\//.test(line));
}

describe("entry join copy split (red)", () => {
  it("C1 keeps every piece inside the approved blocks", async () => {
    const mod = await copyModule();
    expect(
      mod.JOIN_PIECES,
      "Missing JOIN_PIECES in apps/storytime/lib/join-copy.ts",
    ).toBeDefined();
    const pieces = mod.JOIN_PIECES as {
      en: {
        hero: string;
        tiles: Record<string, string>;
        steps: string[];
        contactLead: string;
        buttons: Record<string, string>;
      };
      th: {
        hero: string;
        tiles: Record<string, string>;
        steps: string[];
        contactLead: string;
        buttons: Record<string, string>;
      };
    };
    const copy = mod.JOIN_COPY as {
      en: Record<string, string>;
      th: Record<string, string>;
    };
    for (const locale of ["en", "th"] as const) {
      const blocks = [copy[locale].whoItIsFor, copy[locale].howToGetSignIn];
      const contactLines = contactWithoutUrls(copy[locale].contact);
      const group = pieces[locale];
      expect(group.hero.length, `${locale} hero is not empty`).toBeGreaterThan(0);
      expect(
        blocks.some((block) => block.includes(group.hero)),
        `${locale} hero is a substring of an approved block`,
      ).toBe(true);
      const tileNames = Object.keys(group.tiles);
      expect(tileNames.length, `${locale} holds five tile pieces`).toBe(5);
      for (const [name, line] of Object.entries(group.tiles)) {
        expect(line.length, `${locale} tile ${name} is not empty`).toBeGreaterThan(0);
        expect(
          blocks.some((block) => block.includes(line)),
          `${locale} tile ${name} is a substring of an approved block`,
        ).toBe(true);
      }
      expect(group.steps.length, `${locale} holds two step pieces`).toBe(2);
      for (const [index, line] of group.steps.entries()) {
        expect(
          copy[locale].howToGetSignIn.includes(line),
          `${locale} step ${index + 1} is a substring of the approved steps block`,
        ).toBe(true);
      }
      expect(
        copy[locale].contact.includes(group.contactLead) ||
          contactLines.some((line) => line.includes(group.contactLead)),
        `${locale} contact lead comes from the approved contact block`,
      ).toBe(true);
      for (const [name, label] of Object.entries(group.buttons)) {
        expect(
          contactLines.some((line) => line.includes(label)) ||
            copy[locale].contact.includes(label) ||
            copy[locale].signInLink.includes(label),
          `${locale} button ${name} comes from the approved contact lines`,
        ).toBe(true);
      }
    }
    console.log("join_pieces_locales=2");
  });

  it("C2 keeps the four approved blocks and the sign-in link byte for byte", async () => {
    const mod = await copyModule();
    const copy = mod.JOIN_COPY as {
      en: Record<string, string>;
      th: Record<string, string>;
    };
    const expectedEn: Record<string, string> = {
      whoItIsFor:
        "Storytime Advantage is a full English program for children from Anuban 2 to P2 (ages 4 to 8): a 30-minute scripted class day with letter formation, phonics with recognition, blending, and segmenting, and a timed step across 100 sight words; across the weeks, songs, read-along books, and decodable books build up, and children can hear pages and tap words in the app on a phone at home. The songs and the books on this site are for the children in the program.",
      howToGetSignIn:
        "The child's school or tutor gives the family its sign-in details. A parent, or the teacher for the class, signs in on the first visit. The device then stays signed in.",
      contact:
        "A family without sign-in details can contact us.<br>LINE Official: ReadingAdvantage<br>https://line.me/ti/p/Pf7_EF98Pv<br>Phone: +66 099-005-8038<br>Email: support@reading-advantage.com<br>Contact page: https://www.reading-advantage.com/contact",
      signInLink: "I have my sign-in details: Sign in",
    };
    const expectedTh: Record<string, string> = {
      whoItIsFor:
        "Storytime Advantage เป็นหลักสูตรภาษาอังกฤษเต็มรูปแบบสำหรับเด็กอนุบาล 2 ถึง ป.2 (อายุประมาณ 4 ถึง 8 ปี) คือวันเรียน 30 นาทีที่มีสคริปต์ พร้อมการเขียนตัวอักษร โฟนิกส์พร้อมการจดจำ การผสมเสียง และการแยกเสียง และขั้น sight words ที่ทำเร็วและมีการตรวจแบบจับเวลา ครอบคลุมคำที่เห็นบ่อย 100 คำ ตลอดหลายสัปดาห์ เพลง หนังสืออ่านตาม และหนังสือฝึกอ่านเพิ่มขึ้นมาเรื่อย ๆ เด็กฟังเสียงอ่านทีละหน้าและแตะคำเพื่อฟังเสียงอ่านได้ในแอปบนโทรศัพท์ที่บ้าน เพลงและหนังสือในเว็บไซต์นี้มีไว้สำหรับเด็กในโครงการ",
      howToGetSignIn:
        "โรงเรียนหรือครูสอนพิเศษของเด็กมอบข้อมูลเข้าสู่ระบบให้ครอบครัว ผู้ปกครอง หรือครูประจำชั้น เข้าสู่ระบบครั้งแรก แล้วอุปกรณ์นั้นก็ยังเข้าสู่ระบบอยู่",
      contact:
        "ครอบครัวที่ยังไม่มีข้อมูลเข้าสู่ระบบติดต่อเราได้<br>LINE Official: ReadingAdvantage<br>https://line.me/ti/p/Pf7_EF98Pv<br>โทร: +66 099-005-8038<br>อีเมล: support@reading-advantage.com<br>หน้าติดต่อ: https://www.reading-advantage.com/contact",
      signInLink: "มีข้อมูลเข้าสู่ระบบแล้ว: เข้าสู่ระบบ",
    };
    for (const key of ["whoItIsFor", "howToGetSignIn", "contact", "signInLink"]) {
      expect(expectedEn[key]?.length ?? 0, `the expected en ${key} is not empty`).toBeGreaterThan(0);
      expect(copy.en[key], `en ${key} stays byte for byte`).toBe(expectedEn[key]);
      expect(copy.th[key], `th ${key} stays byte for byte`).toBe(expectedTh[key]);
    }
    console.log("approved_blocks_checked=8");
  });

  it("C3 holds the five new keys with the exact Thai drafts", async () => {
    const mod = await copyModule();
    expect(
      mod.ENTRY_PENDING_THAI_KEYS,
      "Missing ENTRY_PENDING_THAI_KEYS in apps/storytime/lib/join-copy.ts",
    ).toBeDefined();
    const en = messages(EN_MESSAGES);
    const th = messages(TH_MESSAGES);
    for (const key of NEW_KEYS) {
      expect(en[key], `en.json holds the exact ${key}`).toBe(EXPECTED_NEW_EN[key]);
      expect(th[key], `th.json holds the exact ${key}`).toBe(EXPECTED_NEW_TH[key]);
      expect(th[key] ?? "", `${key} holds a Thai letter`).toMatch(/[\u0E00-\u0E7F]/);
    }
    console.log("new_keys_checked=5");
  });

  it("C4 names exactly the five pending Thai keys", async () => {
    const mod = await copyModule();
    expect(
      mod.ENTRY_PENDING_THAI_KEYS,
      "Missing ENTRY_PENDING_THAI_KEYS in apps/storytime/lib/join-copy.ts",
    ).toBeDefined();
    expect(mod.ENTRY_PENDING_THAI_KEYS, "the pending list names the five keys").toEqual([
      ...NEW_KEYS,
    ]);
  });

  it("C5 ships no Chinese copy", async () => {
    const mod = await copyModule();
    const copy = mod.JOIN_COPY as Record<string, unknown>;
    expect(Object.keys(copy), "the copy holds locales").not.toContain("zh");
    expect(existsSync(resolve(APP, "messages/zh.json")), "no zh message file").toBe(
      false,
    );
    const joinCopy = mod.joinCopy as (locale: string) => unknown;
    expect(joinCopy("zh"), "a zh locale shows the English").toEqual(copy.en);
  });
});
