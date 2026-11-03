export const CONTAINER_IDS = [
  "st-hero",
  "st-section-1",
  "st-section-2",
  "st-section-3",
  "st-section-4",
  "st-section-5",
  "st-cta",
] as const;

export const STORYTIME_IMAGES = [
  { name: "week-01-hello-pip", alt: "images.week01HelloPip", width: 1200, height: 900 },
  { name: "level-2-unit-1-cover-art", alt: "images.level2Unit1CoverArt", width: 960, height: 720 },
  { name: "week-01-reader-hello-cover", alt: "images.week01ReaderHelloCover", width: 480, height: 360 },
  { name: "week-01-reader-nan-can-nod-cover", alt: "images.week01ReaderNanCanNodCover", width: 480, height: 360 },
  { name: "week-02-how-many-cakes", alt: "images.week02HowManyCakes", width: 900, height: 675 },
  { name: "week-03-it-is-red", alt: "images.week03ItIsRed", width: 900, height: 675 },
  { name: "week-04-nan-and-pam-nap", alt: "images.week04NanAndPamNap", width: 900, height: 675 },
  { name: "week-05-two-ears", alt: "images.week05TwoEars", width: 900, height: 675 },
  { name: "week-06-i-see-a-cat", alt: "images.week06ISeeACat", width: 900, height: 675 },
  { name: "week-07-top-on-a-pot", alt: "images.week07TopOnAPot", width: 900, height: 675 },
] as const;

export const EXPECTED_META = {
  en: {
    title: "Storytime Advantage - English for Anuban 2 to P2 | Reading Advantage Thailand",
    description:
      "Storytime Advantage is an English program for Anuban 2 to P2: one sound, one song, and two books each week. The first unit is being prepared, with a printed student book and QR-linked digital parts.",
  },
  th: {
    title: "Storytime Advantage - ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 | Reading Advantage Thailand",
    description:
      "Storytime Advantage คือหลักสูตรภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม กำลังจัดเตรียมหน่วยการเรียนรู้แรก พร้อมหนังสือนักเรียนฉบับพิมพ์และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด",
  },
} as const;

export const REQUIRED_COPY = {
  en: [
    "Stories, Songs, and First Sounds",
    "What Is in the First Unit",
    "One Sound, One Song, Two Books a Week",
    "For the Teacher",
    "Frequently Asked Questions",
    "Interested in Storytime Advantage?",
    "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module.",
  ],
  th: [
    "นิทาน เพลง และเสียงแรกของภาษาอังกฤษ",
    "สิ่งที่มีในหน่วยแรก",
    "หนึ่งเสียง หนึ่งเพลง หนังสือสองเล่ม ทุกสัปดาห์",
    "สำหรับครู",
    "คำถามที่พบบ่อย",
    "สนใจ Storytime Advantage ไหม",
    "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module.",
  ],
} as const;

export const OLD_STOCK_REFERENCES = [
  "/images/hero-storytime-advantage.jpg",
  "/storytime-advantage.png",
  "/images/storytime-advantage-hero.jpg",
  "ra-marketing-storytime-advantage",
] as const;

export const BANNED_COPY = [
  "app is live",
  "app is available",
  "now available",
  "scheduler",
  "in production",
  "Raz-Kids",
  "Khan Academy Kids",
] as const;
