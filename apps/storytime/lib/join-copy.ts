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

/** The title and the one sentence of one program tile. */
interface JoinTile {
  /** The short title shown in the display face. */
  title: string;
  /** The one complete sentence under the title. */
  sentence: string;
}

/** The short pieces of one locale. */
export interface JoinPieces {
  /** The hero line, taken from the "who it is for" block. */
  hero: string;
  /** The five tiles of the program, in the designed order. */
  tiles: {
    /** The daily 30-minute lesson tile. */
    "daily-lessons": JoinTile;
    /** The letters and phonics tile. */
    "letters-phonics": JoinTile;
    /** The sight words tile. */
    "sight-words": JoinTile;
    /** The songs and readers tile. */
    "songs-readers": JoinTile;
    /** The home app tile. */
    "home-app": JoinTile;
  };
  /** The two numbered steps that tell a family how to get its login. */
  steps: [string, string];
  /** The lead line above the contact channels. */
  contactLead: string;
  /** The labels of the contact buttons. */
  buttons: {
    /** The LINE button label. */
    line: string;
    /** The phone button label. */
    phone: string;
    /** The email button label. */
    email: string;
    /** The small contact-page link label. */
    site: string;
  };
}

/**
 * The pieces of the redesigned page, in the two shipped locales.
 *
 * The hero, step 2, the contact lead, and the button labels stay exact substrings of the
 * approved blocks. The five tile titles and sentences and step 1 are PM microcopy of
 * 2026-11-20; they state approved facts in new words. Daniel approved their Thai on
 * 2026-11-21, so their text stays as written.
 */
export const JOIN_PIECES: { en: JoinPieces; th: JoinPieces } = {
  en: {
    hero: "Storytime Advantage is a full English program for children from Anuban 2 to P2 (ages 4 to 8)",
    tiles: {
      "daily-lessons": {
        title: "Daily Class Lesson",
        sentence: "Your child follows a 30-minute scripted lesson on every class day.",
      },
      "letters-phonics": {
        title: "Letters and Sounds",
        sentence:
          "Your child practices letter formation, then phonics through recognition, blending, and segmenting.",
      },
      "sight-words": {
        title: "Sight Words",
        sentence: "Your child takes a timed step through 100 sight words.",
      },
      "songs-readers": {
        title: "Songs and Readers",
        sentence:
          "Songs, read-along books, and decodable books build up as the weeks pass.",
      },
      "home-app": {
        title: "Home Phone App",
        sentence:
          "On a phone at home, your child hears each page and taps words to hear them.",
      },
    },
    steps: [
      "Your child's school or tutor gives your family the sign-in details.",
      "A parent, or the teacher for the class, signs in on the first visit. The device then stays signed in.",
    ],
    contactLead: "A family without sign-in details can contact us.",
    buttons: {
      line: "LINE Official: ReadingAdvantage",
      phone: "Phone: +66 099-005-8038",
      email: "Email: support@reading-advantage.com",
      site: "Contact page",
    },
  },
  th: {
    hero: "Storytime Advantage เป็นหลักสูตรภาษาอังกฤษเต็มรูปแบบสำหรับเด็กอนุบาล 2 ถึง ป.2 (อายุประมาณ 4 ถึง 8 ปี)",
    tiles: {
      "daily-lessons": {
        title: "บทเรียนในวันเรียน",
        sentence: "ลูกเรียนตามบทเรียนที่มีสคริปต์นาน 30 นาทีในทุกวันเรียน",
      },
      "letters-phonics": {
        title: "ตัวอักษรและเสียง",
        sentence:
          "ลูกฝึกเขียนตัวอักษร แล้วฝึกโฟนิกส์ด้วยการจดจำ การผสมเสียง และการแยกเสียง",
      },
      "sight-words": {
        title: "Sight words",
        sentence:
          "ลูกฝึกขั้น sight words แบบจับเวลา ครอบคลุมคำที่เห็นบ่อย 100 คำ",
      },
      "songs-readers": {
        title: "เพลงและหนังสืออ่าน",
        sentence:
          "เพลง หนังสืออ่านตาม และหนังสือฝึกอ่านจะเพิ่มขึ้นเรื่อย ๆ ตลอดหลายสัปดาห์",
      },
      "home-app": {
        title: "แอปบนโทรศัพท์ที่บ้าน",
        sentence:
          "ที่บ้าน ลูกฟังเสียงอ่านทีละหน้าและแตะคำเพื่อฟังเสียงอ่านได้ในแอปบนโทรศัพท์",
      },
    },
    steps: [
      "โรงเรียนหรือครูสอนพิเศษของเด็กมอบข้อมูลเข้าสู่ระบบให้ครอบครัว",
      "ผู้ปกครอง หรือครูประจำชั้น เข้าสู่ระบบครั้งแรก แล้วอุปกรณ์นั้นก็ยังเข้าสู่ระบบอยู่",
    ],
    contactLead: "ครอบครัวที่ยังไม่มีข้อมูลเข้าสู่ระบบติดต่อเราได้",
    buttons: {
      line: "LINE Official: ReadingAdvantage",
      phone: "โทร: +66 099-005-8038",
      email: "อีเมล: support@reading-advantage.com",
      site: "หน้าติดต่อ",
    },
  },
};

/** The five message keys that wait for the Thai check of Daniel (spec AC-A71.10). */
export const ENTRY_PENDING_THAI_KEYS = [
  "signInGreeting",
  "signInShowPassword",
  "signInHidePassword",
  "signInNoLogin",
  "joinHowToTitle",
] as const;

/**
 * The join tile and step lines that still wait for Daniel's Thai check.
 *
 * Daniel approved the Thai of the six tile and step lines on 2026-11-21 (PM hand-off
 * Tasks c0tiaDJpUlMxZWFfak9Ycg, "Ok": "Use them as written"), so the list is empty.
 * The current Thai text stays as written (spec AC-A71.9).
 */
export const JOIN_PENDING_THAI_PIECES = [] as const;
