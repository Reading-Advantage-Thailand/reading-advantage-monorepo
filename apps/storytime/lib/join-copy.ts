/**
 * The copy of the "How to join" page (design section 2, AC-4.5).
 *
 * The copy comes from the PR hand-off `storytime-join-page-copy/app-join-page-copy.md`, version
 * 0.1, table (a). The English and the Thai words are byte for byte the words of that table, and
 * the blocks keep the order of the table. A `<br>` in a block is the line break of the table, and
 * the page renders one line per part.
 *
 * The status stays `draft` until the PR copy and the Thai check of Daniel are recorded. The page
 * shows a draft marker while the status is `draft`. A locale without its own copy shows the
 * English, so the Chinese page shows the English until the Chinese speaker checks the lines.
 */

/** The status of the copy. */
export type JoinCopyStatus = "draft" | "approved";

/** The copy of one locale. */
export interface JoinCopy {
  /** The title of the browser tab. */
  title: string;
  /** The heading of the page. */
  heading: string;
  /** The block that names who the program is for. */
  whoItIsFor: string;
  /** The block that names how a family gets its sign-in details. */
  howToGetSignIn: string;
  /** The block that holds the official contact channels. */
  contact: string;
  /** The text of the link to the sign-in page. */
  signInLink: string;
}

/** The copy of the page, in the locales that hold their own words. */
export const JOIN_COPY: {
  /** The status of the copy. */
  status: JoinCopyStatus;
  /** The version of the hand-off the copy comes from. */
  version: string;
  /** The English copy. */
  en: JoinCopy;
  /** The Thai copy, a draft until Daniel checks it. */
  th: JoinCopy;
} = {
  status: "draft",
  version: "0.1",
  en: {
    title: "How to Join Storytime Advantage",
    heading: "How to Join Storytime Advantage",
    whoItIsFor:
      "Storytime Advantage is an English program for Anuban 2 to P2 (ages 4 to 8). Each week has one sound, one song, and two books. The songs and the books on this site are for the children in the program.",
    howToGetSignIn:
      "The child's school or tutor gives the family its sign-in details. A parent, or the teacher for the class, signs in on the first visit. The device then stays signed in.",
    contact:
      "A family without sign-in details can contact us.<br>LINE Official: ReadingAdvantage<br>https://line.me/ti/p/Pf7_EF98Pv<br>Phone: +66 099-005-8038<br>Email: support@reading-advantage.com<br>Contact page: https://www.reading-advantage.com/contact",
    signInLink: "I have my sign-in details: Sign in",
  },
  th: {
    title: "วิธีเข้าร่วม Storytime Advantage",
    heading: "วิธีเข้าร่วม Storytime Advantage",
    whoItIsFor:
      "Storytime Advantage คือหลักสูตรภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 (อายุประมาณ 4 ถึง 8 ปี) ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม เพลงและหนังสือในเว็บไซต์นี้มีไว้สำหรับเด็กในโครงการ",
    howToGetSignIn:
      "โรงเรียนหรือครูสอนพิเศษของเด็กมอบข้อมูลเข้าสู่ระบบให้ครอบครัว ผู้ปกครอง หรือครูประจำชั้น เข้าสู่ระบบครั้งแรก แล้วอุปกรณ์นั้นก็ยังเข้าสู่ระบบอยู่",
    contact:
      "ครอบครัวที่ยังไม่มีข้อมูลเข้าสู่ระบบติดต่อเราได้<br>LINE Official: ReadingAdvantage<br>https://line.me/ti/p/Pf7_EF98Pv<br>โทร: +66 099-005-8038<br>อีเมล: support@reading-advantage.com<br>หน้าติดต่อ: https://www.reading-advantage.com/contact",
    signInLink: "มีข้อมูลเข้าสู่ระบบแล้ว: เข้าสู่ระบบ",
  },
};

/**
 * Gives the copy of one locale.
 * @param locale The locale of the page.
 * @returns The copy of the locale, or the English copy for a locale without its own words.
 */
export function joinCopy(locale: string): JoinCopy {
  return locale === "th" ? JOIN_COPY.th : JOIN_COPY.en;
}

/**
 * Splits one block into its lines.
 * @param block The block of the copy.
 * @returns The lines of the block.
 */
export function joinLines(block: string): string[] {
  return block.split("<br>");
}
