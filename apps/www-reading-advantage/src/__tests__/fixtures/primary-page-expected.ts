/**
 * Literal EN and TH strings of the www Primary Advantage page.
 * Copied from the page brief v0.2 and the image list v0.2 (PR session, 2026-10-29).
 * The drift guard in `primary-page-images.test.ts` checks every string against both files.
 */

export type PageLocale = "en" | "th";

export interface ExpectedText {
  readonly kind: string;
  readonly en: string;
  readonly th: string;
}

export interface ExpectedLink {
  readonly href: "/pricing" | "/contact" | "/products/tutor-advantage";
  readonly en: string;
  readonly th: string;
}

export interface ExpectedContainer {
  readonly testId: string;
  readonly texts: readonly ExpectedText[];
  readonly links: readonly ExpectedLink[];
}

export interface ExpectedImage {
  readonly section: number;
  readonly name: string;
  readonly altEn: string;
  readonly altTh: string;
}

/** The ten page containers in page order: hero, sections 1 to 8, closing. */
export const CONTAINERS: readonly ExpectedContainer[] = [
  {
    testId: "pa-hero",
    texts: [
      { kind: "headline", en: "Primary Advantage: English reading for grades 3 to 6", th: "Primary Advantage: การอ่านภาษาอังกฤษสำหรับ ป.3 ถึง ป.6" },
      { kind: "body", en: "A printed workbook and an app, with the same 14 lessons in each. Thai teachers teach from a scripted lesson plan, and students read, listen, play, and write.", th: "แบบฝึกหัดฉบับพิมพ์และแอปที่มี 14 บทเรียนเหมือนกัน ครูไทยสอนจากแผนการสอนที่เตรียมไว้ให้ ส่วนนักเรียนอ่าน ฟัง เล่นเกม และเขียน" },
    ],
    links: [
      { href: "/pricing", en: "See pricing", th: "ดูราคา" },
      { href: "/contact", en: "Contact us", th: "ติดต่อเรา" },
    ],
  },
  {
    testId: "pa-section-1",
    texts: [
      { kind: "headline", en: "One book. One app. The same lessons.", th: "หนึ่งเล่ม หนึ่งแอป บทเรียนเดียวกัน" },
      { kind: "body", en: "Each Primary Advantage workbook has 14 lessons, and the app has the same 14. A QR code in the workbook opens the lesson on a phone or a tablet. Students sign in with the class code.", th: "แบบฝึกหัด Primary Advantage แต่ละเล่มมี 14 บทเรียน และแอปมี 14 บทเรียนเดียวกัน คิวอาร์โค้ดในแบบฝึกหัดเปิดบทเรียนนั้นบนโทรศัพท์หรือแท็บเล็ต นักเรียนเข้าสู่ระบบด้วยรหัสชั้นเรียน" },
    ],
    links: [],
  },
  {
    testId: "pa-section-2",
    texts: [
      { kind: "headline", en: "Blended Learning: workbooks and the app in one classroom", th: "Blended Learning: แบบฝึกหัดและแอปในห้องเรียนเดียวกัน" },
      { kind: "body", en: "In Blended Learning, the class works in the printed workbook and in the app. The teacher assigns a book to the class and opens each lesson as the class reaches it. Students see the class book on their home page.", th: "ใน Blended Learning ห้องเรียนใช้ทั้งแบบฝึกหัดฉบับพิมพ์และแอป ครูมอบหมายหนังสือให้ชั้นเรียนและเปิดแต่ละบทเรียนเมื่อชั้นเรียนเรียนถึง นักเรียนเห็นหนังสือเรียนของชั้นบนหน้าแรกของตนเอง" },
    ],
    links: [
      { href: "/pricing", en: "See pricing", th: "ดูราคา" },
    ],
  },
  {
    testId: "pa-section-3",
    texts: [
      { kind: "headline", en: "Books that follow the CEFR levels", th: "หนังสือที่เรียงตามระดับ CEFR" },
      { kind: "body", en: "Three series lead students from Pre-A1 to A2: Origins, Quest, and Adventure. Primary Advantage is CEFR-aligned. Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027.", th: "หนังสือสามชุด ได้แก่ Origins, Quest และ Adventure พานักเรียนจากระดับ Pre-A1 ถึง A2 Primary Advantage สอดคล้องกับ CEFR Primary Advantage Origins 3.2 และ Primary Advantage Quest 4 จะถึงโรงเรียนในเดือนพฤษภาคม 2027" },
    ],
    links: [],
  },
  {
    testId: "pa-section-4",
    texts: [
      { kind: "headline", en: "Students read, listen, ask, and write", th: "นักเรียนอ่าน ฟัง ถาม และเขียน" },
      { kind: "body", en: "Each lesson follows the workbook. Students read a story with pictures, and they can listen and read along.", th: "แต่ละบทเรียนเดินตามแบบฝึกหัด นักเรียนอ่านเรื่องที่มีภาพประกอบ และฟังเสียงพร้อมอ่านตามได้" },
      { kind: "features", en: "Students can ask the Primary Advantage lesson chatbot questions about their passage. They also get AI feedback on their short and long written answers. The app interface is available in English, Thai, Vietnamese, Simplified Chinese, and Traditional Chinese.", th: "นักเรียนสามารถถามคำถามเกี่ยวกับเนื้อเรื่องที่กำลังอ่านกับแชตบอตประจำบทเรียนของ Primary Advantage ได้ นักเรียนยังได้รับคำติชมจาก AI สำหรับคำตอบเขียนแบบสั้นและแบบยาว ส่วนหน้าจอของแอปรองรับภาษาอังกฤษ ไทย เวียดนาม จีนตัวย่อ และจีนตัวเต็ม" },
    ],
    links: [],
  },
  {
    testId: "pa-section-5",
    texts: [
      { kind: "headline", en: "Games that practise the words of the lesson", th: "เกมที่ฝึกคำศัพท์ของบทเรียน" },
      { kind: "body", en: "Each lesson has vocabulary games: RPG Battle, Rune Match, Dragon Rider, and Enchanted Library. Students play with the words of the lesson. The teacher can show a game on the projector for the whole class.", th: "แต่ละบทเรียนมีเกมคำศัพท์ ได้แก่ RPG Battle, Rune Match, Dragon Rider และ Enchanted Library นักเรียนเล่นกับคำศัพท์ของบทเรียน ครูแสดงเกมบนโปรเจกเตอร์ให้ทั้งห้องดูได้" },
    ],
    links: [],
  },
  {
    testId: "pa-section-6",
    texts: [
      { kind: "headline", en: "Reedy Preview: a voice coach for speaking", th: "Reedy Preview: โค้ชฝึกพูด" },
      { kind: "badge", en: "Preview", th: "ทดลอง" },
      { kind: "body", en: "Reedy is a voice coach. A student talks about the story in English or in Thai, and Reedy answers. We keep no recording. The voice goes to an AI service only so that Reedy can answer.", th: "รีดี้เป็นโค้ชฝึกพูด นักเรียนเล่าเรื่องที่อ่านเป็นภาษาอังกฤษหรือภาษาไทย แล้วรีดี้ตอบกลับ เราไม่เก็บเสียงบันทึก เสียงถูกส่งไปยังบริการ AI เพียงเพื่อให้รีดี้ตอบได้เท่านั้น" },
    ],
    links: [],
  },
  {
    testId: "pa-section-7",
    texts: [
      { kind: "headline", en: "Tools for the teacher", th: "เครื่องมือสำหรับครู" },
      { kind: "body", en: "The live guide takes the teacher through each step of the lesson, with the words to say. The teacher can show the lesson and the games on the projector, rehearse before class, and print a lesson from the class book. The teacher sees the progress of each student in each lesson.", th: "คู่มือสอนสดพาครูผ่านแต่ละขั้นตอนของบทเรียน พร้อมคำพูดที่ใช้สอน ครูแสดงบทเรียนและเกมบนโปรเจกเตอร์ ซ้อมสอนก่อนเข้าชั้นเรียน และพิมพ์บทเรียนจากหนังสือเรียนของชั้นได้ ครูดูความก้าวหน้าของนักเรียนแต่ละคนในแต่ละบทเรียนได้" },
    ],
    links: [],
  },
  {
    testId: "pa-section-8",
    texts: [
      { kind: "headline", en: "Bring Primary Advantage to your school", th: "นำ Primary Advantage ไปใช้ในโรงเรียนของคุณ" },
      { kind: "body", en: "Tell us about your classes. We will talk with you about the books, the app, and how a Thai teacher teaches the lessons.", th: "บอกเราเกี่ยวกับชั้นเรียนของคุณ เราจะคุยกับคุณเรื่องหนังสือ แอป และวิธีที่ครูไทยสอนบทเรียน" },
    ],
    links: [
      { href: "/contact", en: "Contact us", th: "ติดต่อเรา" },
      { href: "/pricing", en: "See pricing", th: "ดูราคา" },
    ],
  },
  {
    testId: "pa-closing",
    texts: [
      { kind: "headline", en: "Start with a conversation", th: "เริ่มต้นด้วยการพูดคุยกับเรา" },
      { kind: "body", en: "Schools use the books in Blended Learning. Families can reach the same books through Tutor Advantage.", th: "โรงเรียนใช้หนังสือผ่าน Blended Learning ครอบครัวเข้าถึงหนังสือเล่มเดียวกันได้ผ่าน Tutor Advantage" },
    ],
    links: [
      { href: "/contact", en: "Contact us", th: "ติดต่อเรา" },
      { href: "/pricing", en: "See pricing", th: "ดูราคา" },
      { href: "/products/tutor-advantage", en: "Tutor Advantage for families", th: "Tutor Advantage สำหรับครอบครัว" },
    ],
  },
];

/** The 16 images in page order. Each `name` is a file under `public/images/primary-advantage/` with the `.webp` extension. */
export const IMAGES: readonly ExpectedImage[] = [
  { section: 1, name: "workbook-and-app-series", altEn: "The Primary Advantage Origins 3.2 workbook next to the text that says each book has 14 lessons and the app has the same lessons.", altTh: "แบบฝึกหัด Primary Advantage Origins 3.2 พร้อมข้อความที่บอกว่าแต่ละเล่มมี 14 บทเรียน และแอปมีบทเรียนชุดเดียวกัน" },
  { section: 1, name: "workbook-qr-link-landing", altEn: "The page that opens when a student scans the QR code in the workbook: the book name, Lesson 1, and a button to sign in with the class code.", altTh: "หน้าที่เปิดขึ้นเมื่อนักเรียนสแกนคิวอาร์โค้ดในแบบฝึกหัด แสดงชื่อหนังสือ บทที่ 1 และปุ่มเข้าสู่ระบบด้วยรหัสชั้นเรียน" },
  { section: 2, name: "blended-student-class-book", altEn: "The student home shows the class book, Primary Advantage Origins 3.2, Lesson 1, and the story to keep reading.", altTh: "หน้าแรกของนักเรียนแสดงหนังสือเรียนของชั้น Primary Advantage Origins 3.2 บทที่ 1 และเรื่องที่อ่านต่อ" },
  { section: 2, name: "blended-teacher-class-book", altEn: "The teacher's class book page for Primary Advantage Origins 3.2 lists the 13 steps of Lesson 1 and the next step to teach.", altTh: "หน้าหนังสือเรียนของชั้นสำหรับครู Primary Advantage Origins 3.2 แสดง 13 ขั้นตอนของบทที่ 1 และขั้นตอนถัดไปที่ต้องสอน" },
  { section: 3, name: "cefr-book-series", altEn: "The three book series follow the CEFR levels: Origins at Pre-A1 (A0), Quest at A1, and Adventure at A2.", altTh: "หนังสือสามชุดตามระดับ CEFR: Origins ระดับ Pre-A1 (A0), Quest ระดับ A1 และ Adventure ระดับ A2" },
  { section: 4, name: "student-story-listen", altEn: "A reading page in the app shows the story \"Pip is Happy\" with its picture and a button to listen and read along.", altTh: "หน้าอ่านในแอปแสดงเรื่อง Pip is Happy พร้อมภาพประกอบ และปุ่มฟังเสียงพร้อมอ่านตาม" },
  { section: 4, name: "student-language-questions-ai", altEn: "The Language Questions step of a lesson, marked AI Powered, Interactive, and Ask Questions.", altTh: "ขั้นตอนคำถามด้านภาษาในบทเรียน มีป้าย AI Powered, Interactive และ Ask Questions" },
  { section: 4, name: "student-long-answer-feedback", altEn: "The questions of a story chapter: a short answer marked done and a long-answer box with the Get feedback and Submit answer buttons.", altTh: "คำถามท้ายตอนของเรื่อง: คำตอบสั้นที่ทำเสร็จแล้ว และช่องคำตอบยาวพร้อมปุ่มขอคำติชมและปุ่มส่งคำตอบ" },
  { section: 4, name: "student-home-thai", altEn: "The student home in Thai shows the class book, the story to continue, the games, and Reedy with a trial label.", altTh: "หน้าแรกของนักเรียนเป็นภาษาไทย แสดงหนังสือเรียนของชั้น เรื่องที่อ่านต่อ เกม และรีดี้ที่มีป้ายทดลอง" },
  { section: 5, name: "games-vocabulary-picker", altEn: "A lesson step offers four vocabulary games: RPG Battle, Rune Match, Dragon Rider, and Enchanted Library.", altTh: "ขั้นตอนของบทเรียนให้เลือกเกมคำศัพท์สี่เกม ได้แก่ RPG Battle, Rune Match, Dragon Rider และ Enchanted Library" },
  { section: 5, name: "game-enchanted-library", altEn: "In the Enchanted Library game, a student walks a hero between word books and picks the book that matches the Thai prompt.", altTh: "ในเกม Enchanted Library นักเรียนบังคับฮีโร่ไปยังหนังสือคำศัพท์ และเลือกเล่มที่ตรงกับคำภาษาไทย" },
  { section: 6, name: "reedy-preview", altEn: "Reedy, the speaking coach, is marked Preview. A wizard avatar stands in a forest next to a Start talking button.", altTh: "รีดี้ โค้ชฝึกพูด มีป้ายทดลอง ตัวละครพ่อมดยืนอยู่ในป่าข้างปุ่มเริ่มพูดคุย" },
  { section: 7, name: "teacher-live-guide", altEn: "The teacher's live guide for Lesson 1, Step 1, with the buttons Projector, Rehearsal, and Print this lesson.", altTh: "คู่มือสอนสดของครูสำหรับบทที่ 1 ขั้นตอนที่ 1 พร้อมปุ่มโปรเจกเตอร์ ซ้อมสอน และพิมพ์บทเรียน" },
  { section: 7, name: "teacher-projector-games", altEn: "The teacher chooses a vocabulary game to show on the projector for the whole class.", altTh: "ครูเลือกเกมคำศัพท์เพื่อแสดงบนโปรเจกเตอร์ให้ทั้งห้อง" },
  { section: 7, name: "teacher-print-lesson", altEn: "The print view of Lesson 5, At the Market, in Primary Advantage Origins 3.2, with the first two steps of the lesson.", altTh: "หน้าพิมพ์บทเรียนที่ 5 At the Market ของ Primary Advantage Origins 3.2 พร้อมสองขั้นตอนแรกของบทเรียน" },
  { section: 8, name: "contact-channels", altEn: "The ways to contact Reading Advantage (Thailand): LINE Official Account, Facebook, phone, and e-mail, with the LINE QR code.", altTh: "ช่องทางติดต่อ: LINE Official Account, Facebook, โทรศัพท์ และอีเมล พร้อมคิวอาร์โค้ด LINE" },
];

/** Image count for each section 1 to 8. */
export const IMAGE_SECTION_COUNTS: readonly number[] = [2, 2, 1, 4, 2, 1, 3, 1];

/** The page title and description (meta). */
export const META = {
  title: { en: "Primary Advantage | Reading Advantage", th: "Primary Advantage | Reading Advantage" },
  description: { en: "Primary Advantage is a printed English workbook for grades 3 to 6 and an app with the same lessons. Schools use it in Blended Learning.", th: "Primary Advantage คือแบบฝึกหัดภาษาอังกฤษฉบับพิมพ์สำหรับ ป.3 ถึง ป.6 และแอปที่มีบทเรียนเดียวกัน โรงเรียนใช้ผ่าน Blended Learning" },
} as const;

/** The one approved date sentence of section 3, in English and in Thai. */
export const APPROVED_DATE_SENTENCE = {
  en: "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027.",
  th: "Primary Advantage Origins 3.2 และ Primary Advantage Quest 4 จะถึงโรงเรียนในเดือนพฤษภาคม 2027",
} as const;

/** The four game names. They stay in English in the Thai copy. */
export const GAME_NAMES = ["RPG Battle", "Rune Match", "Dragon Rider", "Enchanted Library"] as const;

/**
 * The games demo section (spec section 7a, task 1.10).
 * The strings are the old live strings, word for word, from the key `experience` of
 * `git show fc78b9dee:apps/www-reading-advantage/src/locales/pages/products/primary-advantage.ts`.
 * The page in zh shows the English strings.
 */
export const DEMO = {
  testId: "pa-demo",
  href: "/experience/index.html",
  frameSrc: "/experience/index.html",
  strings: {
    eyebrow: { en: "Try it now", th: "ลองเล่นเลย" },
    heading: { en: "Experience Primary Advantage", th: "สัมผัสประสบการณ์ Primary Advantage" },
    description: { en: "Read a short story, tap a word to see its Thai meaning, listen to the story read aloud, then play a game that uses the words. This demo has four sample stories, one for each level.", th: "อ่านเรื่องสั้น แตะคำเพื่อดูความหมายภาษาไทย ฟังเรื่องที่อ่านออกเสียงให้ แล้วเล่นเกมที่ใช้คำศัพท์จากเรื่อง เดโมนี้มีเรื่องตัวอย่าง 4 เรื่อง ระดับละ 1 เรื่อง" },
    play: { en: "Play the demo", th: "เล่นเดโม" },
    fullscreen: { en: "Open full screen", th: "เปิดเต็มหน้าจอ" },
    hint: { en: "Works best on a computer, tablet, or phone with sound on.", th: "เล่นได้ดีที่สุดบนคอมพิวเตอร์ แท็บเล็ต หรือโทรศัพท์ โดยเปิดเสียง" },
    frameTitle: { en: "Primary Advantage game demo", th: "เดโมเกม Primary Advantage" },
    posterAlt: { en: "Two children in a story picture from the Primary Advantage demo", th: "เด็กสองคนในภาพประกอบเรื่องจากเดโม Primary Advantage" },
  },
} as const;

/** The eleven page containers in page order (spec section 7a): the demo follows section 5. */
export const PAGE_CONTAINER_IDS: readonly string[] = [
  "pa-hero",
  "pa-section-1",
  "pa-section-2",
  "pa-section-3",
  "pa-section-4",
  "pa-section-5",
  "pa-demo",
  "pa-section-6",
  "pa-section-7",
  "pa-section-8",
  "pa-closing",
];
