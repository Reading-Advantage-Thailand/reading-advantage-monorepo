/**
 * The saved flashcards the QC page plays: the same 12 words and 8 sentences that
 * `apps/primary-advantage/scripts/seed-demo-queue.ts` gives the local demo student, plus one long
 * sentence as an article gives it (the games skip sentences outside their word window).
 */
import type { PracticeInput } from "@reading-advantage/advantage-play-kit-3d/contracts";

const WORDS: ReadonlyArray<readonly [string, string]> = [
  ["bridge", "สะพาน"], ["forest", "ป่า"], ["lantern", "โคมไฟ"], ["river", "แม่น้ำ"],
  ["dragon", "มังกร"], ["castle", "ปราสาท"], ["sword", "ดาบ"], ["shield", "โล่"],
  ["potion", "ยาวิเศษ"], ["treasure", "สมบัติ"], ["wizard", "พ่อมด"], ["mountain", "ภูเขา"],
];

const SENTENCES: ReadonlyArray<readonly [string, string]> = [
  ["The dragon crosses the bridge", "มังกรข้ามสะพาน"],
  ["A lantern glows in the forest", "โคมไฟส่องแสงในป่า"],
  ["The wizard drinks a magic potion", "พ่อมดดื่มยาวิเศษ"],
  ["The knight lifts his heavy shield", "อัศวินยกโล่หนักของเขา"],
  ["We find the treasure near the river", "เราพบสมบัติใกล้แม่น้ำ"],
  ["The castle stands on a high mountain", "ปราสาทตั้งอยู่บนภูเขาสูง"],
  ["She holds a bright silver sword", "เธอถือดาบเงินที่สว่างไสว"],
  [
    "After the long rain stopped, the children walked slowly back to the old village by the river.",
    "หลังจากฝนที่ตกนานหยุดลง เด็กๆ ก็เดินกลับไปที่หมู่บ้านเก่าริมแม่น้ำอย่างช้าๆ",
  ],
];

/** A record-style id (the server uses the flashcard record uuid). */
const recordId = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** The practice input of the seeded demo student, in the shape `/api/v1/apk/practice` returns. */
export const savedItems: PracticeInput = {
  schemaVersion: 1,
  id: "saved",
  level: "A1",
  vocabulary: WORDS.slice(0, 10).map(([term, translation], i) => ({ id: recordId(i + 1), term, translation })),
  sentences: SENTENCES.map(([text, translation], i) => ({
    id: recordId(100 + i),
    text,
    words: text.split(" "),
    translation,
  })),
};
