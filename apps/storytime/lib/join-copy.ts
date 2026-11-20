/**
 * The copy of the "How to join" page (design section 2, AC-4.5).
 *
 * The copy comes from the PR hand-off `app-join-page-copy.md` version 0.3, table (a)
 * (source commit 93662024). The English and the Thai words are byte for byte the words
 * of that table, and the blocks keep the order of the table. A `<br>` in a block is the
 * line break of the table, and the page renders one line per part.
 *
 * Daniel approved the Thai TH-171 to TH-176 on 2026-11-16 07:36 ICT. The status is
 * `approved`, so the page shows no draft marker. Storytime ships Thai and English only
 * (Daniel, 2026-11-16 07:34 ICT, "We are not doing Chinese support for Storytime"). A
 * locale without its own copy shows the English.
 *
 * Row C3 of the PR hand-off `11-content/www-change-list.md` (source commit e6e8ad12;
 * Daniel's Thai check 2026-11-20) replaced the `whoItIsFor` block only: the first
 * sentence and the "each week" sentence changed, and the last sentence stays word for
 * word. The hand-off version stays `0.3`.
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
  /** The Thai copy, approved by Daniel. */
  th: JoinCopy;
} = {
  status: "approved",
  version: "0.3",
  en: {
    title: "How to Join Storytime Advantage",
    heading: "How to Join Storytime Advantage",
    whoItIsFor:
      "Storytime Advantage is a full English program for children from Anuban 2 to P2 (ages 4 to 8): a 30-minute scripted class day with letter formation, phonics with recognition, blending, and segmenting, and a timed step across 100 sight words; across the weeks, songs, read-along books, and decodable books build up, and children can hear pages and tap words in the app on a phone at home. The songs and the books on this site are for the children in the program.",
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
      "Storytime Advantage เป็นหลักสูตรภาษาอังกฤษเต็มรูปแบบสำหรับเด็กอนุบาล 2 ถึง ป.2 (อายุประมาณ 4 ถึง 8 ปี) คือวันเรียน 30 นาทีที่มีสคริปต์ พร้อมการเขียนตัวอักษร โฟนิกส์พร้อมการจดจำ การผสมเสียง และการแยกเสียง และขั้น sight words ที่ทำเร็วและมีการตรวจแบบจับเวลา ครอบคลุมคำที่เห็นบ่อย 100 คำ ตลอดหลายสัปดาห์ เพลง หนังสืออ่านตาม และหนังสือฝึกอ่านเพิ่มขึ้นมาเรื่อย ๆ เด็กฟังเสียงอ่านทีละหน้าและแตะคำเพื่อฟังเสียงอ่านได้ในแอปบนโทรศัพท์ที่บ้าน เพลงและหนังสือในเว็บไซต์นี้มีไว้สำหรับเด็กในโครงการ",
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
