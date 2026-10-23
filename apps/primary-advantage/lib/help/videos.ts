import { z } from "zod";

/** One help video in the registry (track primary_in_app_help_20261023, spec FR-5). */
export const helpVideoSchema = z.object({
  /** The PR What's New id (A2, B5, C1, ...): the stable key of the video files and the YouTube row. */
  id: z.string().regex(/^[A-J][0-9]{1,2}$/),
  audience: z.enum(["teacher", "student", "parent"]),
  format: z.enum(["9x16", "16x9"]),
  /** App route patterns in folder form, without the locale and the route groups. */
  routes: z.array(z.string().regex(/^\/[A-Za-z0-9\-/[\].]*$/)),
  /** Shows on every page of its audience, after the page's own videos (spec FR-4). */
  general: z.boolean(),
  title: z.object({ th: z.string().min(1), en: z.string().min(1) }),
  durationSec: z.number().int().positive(),
  /** False while the screen in the video differs from the app (spec section 7). */
  enabled: z.boolean(),
});

/** A help video: a PR What's New tutorial and the app pages that it shows. */
export type HelpVideo = z.infer<typeof helpVideoSchema>;

/** The audience of a help panel. */
export type HelpAudience = HelpVideo["audience"];

const ROSTER = "/teacher/class-roster/[classroomId]";
const BOOK = `${ROSTER}/books/[classBookId]`;
const LESSON = `${BOOK}/lessons/[number]`;

/** Every help video. Videos that match a page equally show in this order. */
export const HELP_VIDEOS: readonly HelpVideo[] = [
  { id: "A2", audience: "teacher", format: "16x9", routes: [], general: true, title: { th: "อะไรเปลี่ยนไปสำหรับครู", en: "What changed for teachers" }, durationSec: 57, enabled: true },
  { id: "E7", audience: "teacher", format: "16x9", routes: ["/teacher/manual"], general: true, title: { th: "คู่มือครูในแอป", en: "The teacher manual in the app" }, durationSec: 46, enabled: true },
  { id: "E1", audience: "teacher", format: "16x9", routes: ["/teacher/dashboard"], general: false, title: { th: "หน้าหลักของครู", en: "Your teacher home page" }, durationSec: 46, enabled: true },
  { id: "J5", audience: "teacher", format: "16x9", routes: ["/teacher/dashboard"], general: false, title: { th: "ดูแบบที่นักเรียนเห็น", en: "See what your students see" }, durationSec: 35, enabled: true },
  { id: "B5", audience: "teacher", format: "16x9", routes: ["/auth/signin"], general: false, title: { th: "ครูเข้าสู่ระบบแบบใหม่", en: "The new teacher sign-in" }, durationSec: 61, enabled: true },
  { id: "E2", audience: "teacher", format: "16x9", routes: ["/teacher/my-classes", ROSTER, "/teacher/class-roster"], general: false, title: { th: "ชั้นเรียนของฉันและหน้าชั้นเรียน", en: "My classes and the class page" }, durationSec: 44, enabled: true },
  { id: "B3", audience: "teacher", format: "16x9", routes: [ROSTER], general: false, title: { th: "เปิดชั้นเรียนให้นักเรียนเข้าสู่ระบบ", en: "Start the class so students can sign in" }, durationSec: 66, enabled: true },
  { id: "B4", audience: "teacher", format: "16x9", routes: [`${ROSTER}/class-sheet`, `${ROSTER}/qr-cards`, ROSTER], general: false, title: { th: "พิมพ์ใบรายชื่อชั้นเรียนและบัตร QR", en: "Print the class sheet and QR cards" }, durationSec: 62, enabled: true },
  { id: "E3", audience: "teacher", format: "16x9", routes: [`${ROSTER}/enrollment`, ROSTER], general: false, title: { th: "เพิ่มและนำนักเรียนออกจากชั้นเรียน", en: "Add and remove students" }, durationSec: 40, enabled: true },
  { id: "G3", audience: "teacher", format: "16x9", routes: [`${ROSTER}/reedy`], general: false, title: { th: "รีดี้สำหรับครู: เวลาที่ใช้และความเป็นส่วนตัว", en: "Reedy for teachers: time used and privacy" }, durationSec: 41, enabled: true },
  { id: "D2", audience: "teacher", format: "16x9", routes: [ROSTER, BOOK], general: false, title: { th: "กำหนดหนังสือให้ชั้นเรียน", en: "Assign a book to the class" }, durationSec: 44, enabled: true },
  { id: "D3", audience: "teacher", format: "16x9", routes: [LESSON], general: false, title: { th: "แผนการสอนและเฉลย", en: "The lesson plan and answer key" }, durationSec: 64, enabled: true },
  { id: "D5", audience: "teacher", format: "16x9", routes: [`${LESSON}/rehearsal`], general: false, title: { th: "ซ้อมสอนก่อนเข้าชั้นเรียน", en: "Rehearse a lesson before class" }, durationSec: 38, enabled: true },
  { id: "D4", audience: "teacher", format: "16x9", routes: [`${LESSON}/projector`], general: false, title: { th: "มุมมองโปรเจกเตอร์", en: "The projector view" }, durationSec: 53, enabled: true },
  { id: "J4", audience: "teacher", format: "16x9", routes: [`${LESSON}/print`, LESSON], general: false, title: { th: "พิมพ์บทเรียนหนึ่งบท", en: "Print one lesson" }, durationSec: 33, enabled: true },
  { id: "D6", audience: "teacher", format: "16x9", routes: [`${BOOK}/progress`, `${BOOK}/progress/[studentId]`], general: false, title: { th: "ความก้าวหน้าของชั้นเรียนและไฟล์ CSV", en: "Class progress and the CSV file" }, durationSec: 60, enabled: true },
  { id: "J3", audience: "teacher", format: "16x9", routes: [BOOK], general: false, title: { th: "สอนบทเรียนอีกครั้ง", en: "Teach a lesson again" }, durationSec: 39, enabled: true },
  { id: "E4", audience: "teacher", format: "16x9", routes: ["/teacher/assignments", "/teacher/assignments/[id]"], general: false, title: { th: "งานที่กำหนดสำหรับครู", en: "Assignments for teachers" }, durationSec: 37, enabled: true },
  { id: "E5", audience: "teacher", format: "16x9", routes: ["/teacher/reports", "/teacher/student-progress/[id]", ROSTER], general: false, title: { th: "รายงานของชั้นเรียนและนักเรียน", en: "Class reports and student reports" }, durationSec: 45, enabled: true },
  { id: "E6", audience: "teacher", format: "16x9", routes: ["/teacher/game-challenges"], general: false, title: { th: "สร้างชาเลนจ์เกมของชั้นเรียน", en: "Set a class game challenge" }, durationSec: 41, enabled: true },
  { id: "F5", audience: "teacher", format: "16x9", routes: [`${ROSTER}/avatars`], general: false, title: { th: "อวตารของห้อง และการรีเซ็ต", en: "Class avatars and reset" }, durationSec: 35, enabled: true },
  { id: "H1", audience: "teacher", format: "16x9", routes: ["/teacher/quest"], general: false, title: { th: "เลือกภารกิจของสัปดาห์", en: "Choose this week's class quest" }, durationSec: 50, enabled: true },
  { id: "H3", audience: "teacher", format: "16x9", routes: ["/teacher/quest/[questId]/live", "/teacher/quest"], general: false, title: { th: "ต่อสู้บอสบนจอโปรเจกเตอร์", en: "Run the battle on the projector" }, durationSec: 73, enabled: true },
  { id: "A1", audience: "student", format: "9x16", routes: [], general: false, title: { th: "Primary Advantage โฉมใหม่", en: "Welcome to the new Primary Advantage" }, durationSec: 45, enabled: true },
  { id: "B1", audience: "student", format: "9x16", routes: ["/auth/signin"], general: false, title: { th: "เข้าสู่ระบบด้วยรหัสห้องเรียนและรูป 3 รูป", en: "Sign in with the class code and 3 pictures" }, durationSec: 37, enabled: true },
  { id: "B2", audience: "student", format: "9x16", routes: ["/auth/card"], general: false, title: { th: "เข้าสู่ระบบด้วยบัตร QR", en: "Sign in with a QR card" }, durationSec: 38, enabled: true },
  { id: "C1", audience: "student", format: "9x16", routes: ["/student/home"], general: true, title: { th: "หน้าหลักใหม่ของหนู", en: "My new home page" }, durationSec: 37, enabled: true },
  { id: "C2", audience: "student", format: "9x16", routes: [], general: true, title: { th: "ปุ่มต่าง ๆ อยู่ที่ไหน", en: "Where is everything?" }, durationSec: 41, enabled: true },
  { id: "J1", audience: "student", format: "9x16", routes: ["/student/home"], general: false, title: { th: "ติดตั้ง Primary Advantage บนโทรศัพท์", en: "Put Primary Advantage on your phone" }, durationSec: 37, enabled: true },
  { id: "C3", audience: "student", format: "9x16", routes: ["/student/read", "/student/read/stories"], general: false, title: { th: "หาเรื่องอ่านในห้องสมุด", en: "Find a story in the library" }, durationSec: 29, enabled: true },
  { id: "C4", audience: "student", format: "9x16", routes: ["/student/read/[articleId]"], general: false, title: { th: "อ่าน ฟัง และตอบคำถาม", en: "Read, listen, and answer" }, durationSec: 48, enabled: true },
  { id: "J7", audience: "student", format: "9x16", routes: ["/student/read/stories/[storyId]", "/student/read/stories", "/student/read/stories/[storyId]/[chapterNumber]"], general: false, title: { th: "เรื่องราวหลายตอน", en: "Read stories with chapters" }, durationSec: 34, enabled: true },
  { id: "C12", audience: "student", format: "9x16", routes: ["/student/read/stories", "/student/quest/battle"], general: false, title: { th: "เรื่องราวอยู่ที่ไหน และภารกิจห้องเรียน", en: "Find Stories and the Class Quest" }, durationSec: 47, enabled: true },
  { id: "C5", audience: "student", format: "9x16", routes: ["/student/lesson/[id]"], general: false, title: { th: "เดินตามเส้นทางบทเรียน", en: "Follow the lesson path" }, durationSec: 38, enabled: true },
  { id: "J2", audience: "student", format: "9x16", routes: ["/student/lesson/[id]"], general: false, title: { th: "เริ่มบทเรียนใหม่", en: "Start a lesson again" }, durationSec: 38, enabled: true },
  { id: "J6", audience: "student", format: "9x16", routes: ["/student/lesson/[id]"], general: false, title: { th: "เกมในบทเรียน", en: "Play games inside the lesson" }, durationSec: 44, enabled: true },
  { id: "D1", audience: "student", format: "9x16", routes: ["/student/books/[classBookId]"], general: false, title: { th: "หนังสือเรียนของชั้น: บทเรียนเปิดพร้อมชั้นเรียน", en: "Open your class book lessons" }, durationSec: 41, enabled: true },
  { id: "D7", audience: "student", format: "9x16", routes: [], general: false, title: { th: "สแกนคิวอาร์โค้ดในหนังสือแบบฝึกหัด", en: "Scan the QR code in your workbook" }, durationSec: 34, enabled: true },
  { id: "C6", audience: "student", format: "9x16", routes: ["/student/assignments"], general: false, title: { th: "งานของฉัน", en: "See your assignments" }, durationSec: 29, enabled: true },
  { id: "C7", audience: "student", format: "9x16", routes: ["/student/vocabulary"], general: false, title: { th: "คำศัพท์ของฉัน", en: "Practice your saved vocabulary" }, durationSec: 30, enabled: true },
  { id: "C8", audience: "student", format: "9x16", routes: ["/student/sentences"], general: false, title: { th: "ประโยคของฉัน", en: "Practice your saved sentences" }, durationSec: 34, enabled: true },
  { id: "C9", audience: "student", format: "9x16", routes: ["/student/history"], general: false, title: { th: "ประวัติการอ่านของหนู", en: "Look back at your reading history" }, durationSec: 30, enabled: true },
  { id: "C10", audience: "student", format: "9x16", routes: ["/student/reports"], general: false, title: { th: "รายงานของหนู", en: "See your reports" }, durationSec: 34, enabled: true },
  { id: "C11", audience: "student", format: "9x16", routes: ["/settings/user-profile"], general: false, title: { th: "หน้าฉัน โหมดกลางคืน และโหมด 2 มิติ", en: "Set up your profile, night mode, and 2D mode" }, durationSec: 44, enabled: true },
  { id: "F1", audience: "student", format: "9x16", routes: ["/student/avatar"], general: false, title: { th: "เลือกฮีโร่ของหนู", en: "Choose your hero" }, durationSec: 36, enabled: true },
  { id: "F2", audience: "student", format: "9x16", routes: ["/student/avatar"], general: false, title: { th: "แต่งตัวฮีโร่", en: "Dress your hero" }, durationSec: 33, enabled: true },
  { id: "F3", audience: "student", format: "9x16", routes: ["/student/home", "/student/avatar/shop"], general: false, title: { th: "หนูได้ GP อย่างไร", en: "How you earn GP" }, durationSec: 33, enabled: true },
  { id: "F4", audience: "student", format: "9x16", routes: ["/student/avatar/shop"], general: false, title: { th: "ร้านค้าอวตาร", en: "Try on and buy in the shop" }, durationSec: 43, enabled: true },
  { id: "F6", audience: "student", format: "9x16", routes: ["/student/avatar"], general: false, title: { th: "รู้จักฮีโร่", en: "Meet the heroes" }, durationSec: 42, enabled: true },
  { id: "G2", audience: "student", format: "9x16", routes: ["/student/home", "/student/reedy"], general: false, title: { th: "นาทีของรีดี้: 8 นาทีต่อเดือน", en: "Your 8 Reedy minutes a month" }, durationSec: 31, enabled: true },
  { id: "H2", audience: "student", format: "9x16", routes: ["/student/quest/battle"], general: false, title: { th: "รับพาวเวอร์อัประหว่างสัปดาห์", en: "Earn power-ups during the week" }, durationSec: 39, enabled: true },
  { id: "H4", audience: "student", format: "9x16", routes: ["/student/quest/battle"], general: false, title: { th: "ต่อสู้บอสในโทรศัพท์", en: "The battle on your phone" }, durationSec: 54, enabled: true },
  { id: "H5", audience: "student", format: "9x16", routes: ["/student/quest/battle"], general: false, title: { th: "ผลการต่อสู้และรางวัล", en: "The battle result and rewards" }, durationSec: 30, enabled: true },
  { id: "H6", audience: "student", format: "9x16", routes: [], general: false, title: { th: "การบุกของราชาก๊อบลิน", en: "Boss short: The Goblin King" }, durationSec: 18, enabled: true },
  { id: "H7", audience: "student", format: "9x16", routes: [], general: false, title: { th: "ลิชแห่งห้องโถงกระดูก", en: "Boss short: The Lich" }, durationSec: 18, enabled: true },
  { id: "H8", audience: "student", format: "9x16", routes: [], general: false, title: { th: "เอมเบอร์ มังกรไฟ", en: "Boss short: Ember, the Fire Dragon" }, durationSec: 19, enabled: true },
  { id: "H9", audience: "student", format: "9x16", routes: [], general: false, title: { th: "โกเลมเหล็กตื่นขึ้น", en: "Boss short: The Iron Golem" }, durationSec: 18, enabled: true },
  { id: "A3", audience: "student", format: "9x16", routes: ["/student/games"], general: false, title: { th: "เกมใหม่มาแล้ว!", en: "The games trailer" }, durationSec: 52, enabled: true },
  { id: "I0", audience: "student", format: "9x16", routes: ["/student/games", "/student/games/story"], general: false, title: { th: "เปิดลานเกม: หาเกมและเริ่มเล่น", en: "Open the arena and start a game" }, durationSec: 40, enabled: true },
  { id: "I1", audience: "student", format: "9x16", routes: ["/student/games/apk/potion-rush"], general: false, title: { th: "Potion Rush", en: "Play Potion Rush: build the sentence" }, durationSec: 30, enabled: true },
  { id: "I2", audience: "student", format: "9x16", routes: ["/student/games/apk/dragon-flight"], general: false, title: { th: "Dragon Flight", en: "Play Dragon Flight: match the word meaning" }, durationSec: 27, enabled: true },
  { id: "I3", audience: "student", format: "9x16", routes: ["/student/games/apk/dungeon-liberator"], general: false, title: { th: "Dungeon Liberator", en: "Play Dungeon Liberator: build the sentence" }, durationSec: 28, enabled: true },
  { id: "I4", audience: "student", format: "9x16", routes: ["/student/games/apk/devourer-slime"], general: false, title: { th: "Devourer Slime", en: "Play Devourer Slime: build the sentence" }, durationSec: 28, enabled: true },
  { id: "I5", audience: "student", format: "9x16", routes: ["/student/games/apk/hero-vs-zombie"], general: false, title: { th: "Hero vs. Zombie", en: "Play Hero vs. Zombie: match the word meaning" }, durationSec: 28, enabled: true },
  { id: "I6", audience: "student", format: "9x16", routes: ["/student/games/apk/rune-match"], general: false, title: { th: "Rune Match", en: "Play Rune Match: match the word meaning" }, durationSec: 33, enabled: true },
  { id: "I7", audience: "student", format: "9x16", routes: ["/student/games/apk/rpg-battle"], general: false, title: { th: "RPG Battle", en: "Play RPG Battle: match the word meaning" }, durationSec: 32, enabled: true },
  { id: "I8", audience: "student", format: "9x16", routes: ["/student/games/apk/paladins-twin-soul"], general: false, title: { th: "Paladin’s Twin Soul", en: "Play Paladin's Twin Soul: match the word meaning" }, durationSec: 29, enabled: true },
  { id: "I9", audience: "student", format: "9x16", routes: ["/student/games/apk/labyrinth"], general: false, title: { th: "Labyrinth of the Goblin King", en: "Play Labyrinth of the Goblin King: build the sentence" }, durationSec: 31, enabled: true },
  { id: "I10", audience: "student", format: "9x16", routes: ["/student/games/apk/astral-mage"], general: false, title: { th: "Astral Mage", en: "Play Astral Mage: build the sentence" }, durationSec: 29, enabled: true },
  { id: "I11", audience: "student", format: "9x16", routes: ["/student/games/apk/village-guardian"], general: false, title: { th: "Village Guardian", en: "Play Village Guardian: build the sentence" }, durationSec: 28, enabled: true },
  { id: "I12", audience: "student", format: "9x16", routes: ["/student/games/apk/haunted-library"], general: false, title: { th: "Haunted Library", en: "Play Haunted Library: build the sentence" }, durationSec: 29, enabled: true },
  { id: "I13", audience: "student", format: "9x16", routes: ["/student/games/apk/realm-carver"], general: false, title: { th: "Realm Carver", en: "Play Realm Carver: build the sentence" }, durationSec: 29, enabled: true },
  { id: "I14", audience: "student", format: "9x16", routes: ["/student/games/apk/shadow-gate-dungeon"], general: false, title: { th: "Shadow Gate Dungeon", en: "Play Shadow Gate Dungeon: build the sentence" }, durationSec: 28, enabled: true },
  { id: "I15", audience: "student", format: "9x16", routes: ["/student/games/apk/spellweavers-run"], general: false, title: { th: "Spellweaver's Run", en: "Play Spellweaver's Run: build the sentence" }, durationSec: 32, enabled: true },
  { id: "I16", audience: "student", format: "9x16", routes: ["/student/games/apk/griffin-sky-joust"], general: false, title: { th: "Griffin Sky-Joust", en: "Play Griffin Sky-Joust: build the sentence" }, durationSec: 30, enabled: true },
  { id: "I17", audience: "student", format: "9x16", routes: ["/student/games/apk/gryphon-patrol"], general: false, title: { th: "Gryphon Patrol", en: "Play Gryphon Patrol: build the sentence" }, durationSec: 34, enabled: true },
  { id: "I18", audience: "student", format: "9x16", routes: ["/student/games/apk/dragon-rider"], general: false, title: { th: "Dragon Rider", en: "Play Dragon Rider: match the word meaning" }, durationSec: 35, enabled: true },
  { id: "I19", audience: "student", format: "9x16", routes: ["/student/games/apk/griffin-riders-escape"], general: false, title: { th: "Griffin Riders Escape", en: "Play Griffin Riders Escape: build the sentence" }, durationSec: 30, enabled: true },
  { id: "I20", audience: "student", format: "9x16", routes: ["/student/games/apk/magic-defense"], general: false, title: { th: "Magic Defense", en: "Play Magic Defense: match the word meaning" }, durationSec: 32, enabled: true },
  { id: "I21", audience: "student", format: "9x16", routes: ["/student/games/apk/abyssal-well"], general: false, title: { th: "Abyssal Well", en: "Play Abyssal Well: build the sentence" }, durationSec: 32, enabled: true },
  { id: "I22", audience: "student", format: "9x16", routes: ["/student/games/apk/archers-revenge"], general: false, title: { th: "Archer’s Revenge", en: "Play Archer's Revenge: match the word meaning" }, durationSec: 32, enabled: true },
  { id: "I23", audience: "student", format: "9x16", routes: ["/student/games/apk/castle-defense"], general: false, title: { th: "Castle Defense", en: "Play Castle Defense: build the sentence" }, durationSec: 28, enabled: true },
  { id: "I24", audience: "student", format: "9x16", routes: ["/student/games/apk/alchemists-synthesis"], general: false, title: { th: "Alchemist's Synthesis", en: "Play Alchemist's Synthesis: match the word meaning" }, durationSec: 32, enabled: true },
  { id: "I25", audience: "student", format: "9x16", routes: ["/student/games/apk/enchanted-library"], general: false, title: { th: "Enchanted Library", en: "Play Enchanted Library: match the word meaning" }, durationSec: 34, enabled: true },
  { id: "I26", audience: "student", format: "9x16", routes: ["/student/games/apk/rune-forge-chamber"], general: false, title: { th: "Rune Forge Chamber", en: "Play Rune Forge Chamber: build the sentence" }, durationSec: 30, enabled: true },
  { id: "I27", audience: "student", format: "9x16", routes: ["/student/games/apk/sorcerer-ziggurat"], general: false, title: { th: "Sorcerer's Ziggurat", en: "Play Sorcerer's Ziggurat: build the sentence" }, durationSec: 32, enabled: true },
  { id: "I28", audience: "student", format: "9x16", routes: ["/student/games/apk/storm-castle-tower"], general: false, title: { th: "Storm Castle Tower", en: "Play Storm Castle Tower: build the sentence" }, durationSec: 32, enabled: true },
  { id: "A4", audience: "parent", format: "16x9", routes: [], general: false, title: { th: "สำหรับผู้ปกครอง: ฮีโร่ GP และรีดี้", en: "For parents: heroes, GP, and Reedy" }, durationSec: 54, enabled: true },
];
