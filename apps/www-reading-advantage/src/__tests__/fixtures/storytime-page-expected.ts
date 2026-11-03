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
  { name: "level-2-unit-1-cover-art", alt: "images.level2Unit1CoverArt", width: 960, height: 720, crop: [520, 840, 2880, 2160] },
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

export const EXPECTED_AUX_COPY = {
  en: {
    heroAlt: "Pip in a Storytime Advantage week 1 story picture",
    "adaptiveEngine.alt": "The cover picture of Storytime Advantage Level 2.",
  },
  th: {
    heroAlt: "Pip ในภาพประกอบเรื่องประจำสัปดาห์ที่ 1 ของ Storytime Advantage",
    "adaptiveEngine.alt": "ภาพปกของ Storytime Advantage Level 2",
  },
} as const;

export const LABEL_COPY = {
  en: {
    badge: "First unit being prepared",
    gradeRange: "English program for Anuban 2 to P2",
    features: [
      "One sound, one song, and two books each week",
      "Every lesson printed in full for the class teacher",
      "A Storytime Advantage student book with small readers inside",
      "QR links open the song and books",
    ],
    navigation: "English for Anuban 2 to P2; the first unit is being prepared",
    home: "Primary Advantage, Reading Advantage, and CodeCamp Advantage are live. Mastery Advantage runs in CodeCamp Advantage and is entering Primary Advantage through tagged content. Science, Math, Zhongwen, and STEM Advantage are on our roadmap, with no dates. The first Storytime Advantage unit is being prepared.",
  },
  th: {
    badge: "กำลังจัดเตรียมหน่วยแรก",
    gradeRange: "หลักสูตรภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2",
    features: [
      "หนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่มต่อสัปดาห์",
      "ทุกคาบมีแผนการสอนครบ",
      "หนังสือนักเรียน Storytime Advantage พร้อมหนังสือฝึกอ่านเล่มเล็กอยู่ด้านใน",
      "คิวอาร์โค้ดเปิดเพลงและหนังสือ",
    ],
    navigation: "ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 กำลังจัดเตรียมหน่วยการเรียนรู้แรก",
    home: "Primary Advantage, Reading Advantage และ CodeCamp Advantage เปิดใช้งานแล้ว Mastery Advantage ทำงานอยู่ใน CodeCamp Advantage และกำลังเข้าสู่ Primary Advantage ผ่านเนื้อหาที่ติดแท็ก Science, Math, Zhongwen และ STEM Advantage อยู่ในแผนงาน ยังไม่มีกำหนดวันเปิดตัว กำลังจัดเตรียมหน่วยการเรียนรู้แรกของ Storytime Advantage",
  },
  zh: {
    badge: "首个单元准备中",
    gradeRange: "面向 Anuban 2 至 P2 的英语课程",
    features: [
      "每周一个发音、一首歌和两本书",
      "每节课均有完整教学脚本",
      "Storytime Advantage 学生用书内含小读本",
      "二维码可打开歌曲和书籍",
    ],
    navigation: "面向 Anuban 2 至 P2 的英语课程，正在准备第一个单元",
    home: "Primary Advantage、Reading Advantage 和 CodeCamp Advantage 已上线。Mastery Advantage 在 CodeCamp Advantage 中运行，并通过带标签的内容进入 Primary Advantage。Science、Math、Zhongwen 和 STEM Advantage 在路线图中，暂无日期。Storytime Advantage 的第一个单元正在准备中。",
  },
} as const;

/** One rendered page string: its locale key, its English and Thai text, and the link target of a button. */
export interface ExpectedCopy {
  readonly key: string;
  readonly en: string;
  readonly th: string;
  readonly href?: "/contact";
}

/**
 * Every rendered page string, word for word, by container in page order.
 * Copied from copy v0.4 (advantage-pr 9b5e1743) and Thai copy v0.1 (advantage-pr 4f8fcbde), as spec section 5 quotes them.
 * The zh page shows the English strings.
 */
export const PAGE_COPY: Readonly<Record<(typeof CONTAINER_IDS)[number], readonly ExpectedCopy[]>> = {
  "st-hero": [
    { key: "hero.comingSoon", en: "In Preparation", th: "กำลังจัดเตรียม" },
    { key: "hero.title", en: "Stories, Songs, and First Sounds", th: "นิทาน เพลง และเสียงแรกของภาษาอังกฤษ" },
    { key: "hero.subtitle", en: "English for Anuban 2 to P2 (ages 4 to 8)", th: "ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 (อายุประมาณ 4 ถึง 8 ปี)" },
    { key: "hero.description", en: "Storytime Advantage is an English program for kindergarten and early primary. Each week has one sound, one song, and two books, and every lesson is printed in full for the class teacher. The first unit is being prepared.", th: "Storytime Advantage เป็นหลักสูตรภาษาอังกฤษสำหรับชั้นอนุบาลและประถมต้น ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม ทุกคาบมีแผนการสอนครบ กำลังจัดเตรียมหน่วยการเรียนรู้แรก พร้อมหนังสือนักเรียนฉบับพิมพ์และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด" },
  ],
  "st-section-1": [
    { key: "adaptiveEngine.eyebrow", en: "Mastery Advantage", th: "Mastery Advantage" },
    { key: "adaptiveEngine.heading", en: "Every Item on One Skill Map", th: "ทุกรายการอยู่บนแผนผังทักษะเดียวกัน" },
    { key: "adaptiveEngine.description", en: "Every sound, word, and sentence frame is tagged to the Mastery Advantage skill map, in the same English map as the Primary Advantage books. The printed review strips bring each item back on a fixed schedule.", th: "ทุกเสียง ทุกคำ และทุกรูปประโยค ผูกกับแผนผังทักษะ Mastery Advantage ในแผนผังภาษาอังกฤษเดียวกับหนังสือ Primary Advantage แถบทบทวนที่พิมพ์ไว้นำแต่ละรายการกลับมาทบทวนตามตารางที่กำหนด" },
  ],
  "st-section-2": [
    { key: "eyebrows.keyFeatures", en: "WHAT IS IN THE PROGRAM", th: "สิ่งที่มีในหลักสูตร" },
    { key: "keyFeatures.heading", en: "What Is in the First Unit", th: "สิ่งที่มีในหน่วยแรก" },
    { key: "keyFeatures.features.0.title", en: "In Print", th: "ฉบับพิมพ์" },
    { key: "keyFeatures.features.0.points.0", en: "One A4 Storytime Advantage, Level 2, Unit 1, Student Book for weeks 1 to 8. Small reader books sit inside it. Children tear them out, fold them, and staple them. No scissors are needed.", th: "หนังสือนักเรียน Storytime Advantage, Level 2, Unit 1, Student Book ขนาด A4 หนึ่งเล่ม สำหรับสัปดาห์ที่ 1 ถึง 8 มีหนังสือฝึกอ่านเล่มเล็กอยู่ด้านใน เด็กฉีกออก พับ และเย็บเล่มย่อยแต่ละเล่มได้โดยไม่ต้องใช้กรรไกร" },
    { key: "keyFeatures.features.0.points.1", en: "A Thai-only teacher book, with five lesson scripts a week", th: "คู่มือครูภาษาไทย พร้อมแผนการสอนสัปดาห์ละ 5 คาบ" },
    { key: "keyFeatures.features.0.points.2", en: "Color reader files for the teacher to print on A3 and lead the class", th: "ไฟล์หนังสือฝึกอ่านสีสำหรับครูพิมพ์ลงกระดาษ A3 เพื่อใช้สอนในชั้นเรียน" },
    { key: "keyFeatures.features.0.points.3", en: "A review strip for each day", th: "แถบทบทวนประจำวัน" },
    { key: "keyFeatures.features.1.title", en: "By QR Code, With No Login", th: "ผ่านคิวอาร์โค้ด ไม่ต้องเข้าสู่ระบบ" },
    { key: "keyFeatures.features.1.points.0", en: "The song of the week, with a video", th: "เพลงประจำสัปดาห์พร้อมวิดีโอ" },
    { key: "keyFeatures.features.1.points.1", en: "The read-along book, with \"read to me\" and \"I read\"", th: "หนังสืออ่านตามพร้อมโหมด \"อ่านให้ฟัง\" และ \"ฉันอ่านเอง\"" },
    { key: "keyFeatures.features.1.points.2", en: "The decodable book, with words to tap and hear", th: "หนังสือฝึกอ่านที่แตะคำเพื่อฟังเสียงได้" },
    { key: "keyFeatures.features.1.points.3", en: "A 5-minute home activity in Thai", th: "กิจกรรมที่บ้านภาษาไทย ใช้เวลาห้านาที" },
  ],
  "st-section-3": [
    { key: "eyebrows.k3Curriculum", en: "ANUBAN 2 TO P2", th: "อนุบาล 2 ถึง ป.2" },
    { key: "coreValue.heading", en: "One Sound, One Song, Two Books a Week", th: "หนึ่งเสียง หนึ่งเพลง หนังสือสองเล่ม ทุกสัปดาห์" },
    { key: "coreValue.features.0.title", en: "Lessons Printed in Full", th: "แผนการสอนครบทุกขั้นตอน" },
    { key: "coreValue.features.0.description", en: "Five 30-minute lessons a week in Anuban. Each step gives what the teacher does and the English the teacher says, with the Thai beside it.", th: "หนังสือนักเรียนและคู่มือครูจัดเนื้อหาสำหรับการสอนแต่ละสัปดาห์" },
    { key: "coreValue.features.1.title", en: "One Sound a Week", th: "ฝึกอ่านจากหนังสือ" },
    { key: "coreValue.features.1.description", en: "Each week teaches one letter sound, with a recorded pure sound, a hand action, and words that start with the sound.", th: "หนังสือหนึ่งเล่มมีเรื่องอ่านตามและหนังสือฝึกอ่านที่ใช้เสียงและคำตามบทเรียน" },
    { key: "coreValue.features.2.title", en: "A Link to Home", th: "เชื่อมต่อกับบ้านด้วยคิวอาร์โค้ด" },
    { key: "coreValue.features.2.description", en: "A Thai home card each week, with QR codes that open the song and the books on a phone.", th: "บัตรกิจกรรมที่บ้านภาษาไทยมีคิวอาร์โค้ดที่เปิดเพลงและหนังสือบนโทรศัพท์ได้" },
  ],
  "st-section-4": [
    { key: "eyebrows.teacherResources", en: "FOR THE TEACHER", th: "สำหรับครู" },
    { key: "teacherTools.heading", en: "For the Teacher", th: "สำหรับครู" },
    { key: "teacherTools.tools.0.title", en: "Printed Scripts", th: "คู่มือครูฉบับพิมพ์" },
    { key: "teacherTools.tools.0.description", en: "The teacher reads the script. There is no lesson planning.", th: "ครูอ่านตามแผนการสอนที่จัดเตรียมไว้" },
    { key: "teacherTools.tools.1.title", en: "Review Strips", th: "แถบทบทวน" },
    { key: "teacherTools.tools.1.description", en: "Each sound and word comes back on a fixed schedule, in 4 minutes or less a day.", th: "แถบทบทวนช่วยให้ครูนำเสียงและคำกลับมาทบทวนตามแผน" },
    { key: "teacherTools.tools.2.title", en: "Friday Check", th: "การตรวจประจำสัปดาห์" },
    { key: "teacherTools.tools.2.description", en: "A 3-minute picture check tells the teacher which sounds and words to bring back.", th: "การตรวจด้วยภาพช่วยให้ครูเห็นเสียงและคำที่ควรนำมาทบทวน" },
  ],
  "st-section-5": [
    { key: "eyebrows.frequentlyAskedQuestions", en: "FREQUENTLY ASKED QUESTIONS", th: "คำถามที่พบบ่อย" },
    { key: "faq.heading", en: "Frequently Asked Questions", th: "คำถามที่พบบ่อย" },
    { key: "faq.questions.0.question", en: "What is in the first unit?", th: "ในหน่วยแรกมีอะไรบ้าง" },
    { key: "faq.questions.0.answer", en: "One A4 student book for weeks 1 to 8, with small reader books inside it; a teacher book in Thai; color reader files the teacher prints on A3; and the song and books by QR code. Contact us to discuss the first unit.", th: "หนังสือนักเรียน A4 หนึ่งเล่มสำหรับสัปดาห์ที่ 1 ถึง 8 พร้อมหนังสือฝึกอ่านเล่มเล็กอยู่ด้านใน คู่มือครูภาษาไทย ไฟล์หนังสือฝึกอ่านสีที่ครูพิมพ์ลงกระดาษ A3 และเพลงกับหนังสือที่เปิดด้วยคิวอาร์โค้ด ติดต่อเราเพื่อพูดคุยเกี่ยวกับหน่วยแรก" },
    { key: "faq.questions.1.question", en: "Do we need computers or an app?", th: "ต้องใช้คอมพิวเตอร์หรือแอปไหม" },
    { key: "faq.questions.1.answer", en: "No. The program is printed. The songs and the books open on a phone or a classroom screen by QR code, with no app and no login.", th: "ไม่ต้องใช้ โปรแกรมเป็นสื่อสิ่งพิมพ์ เพลงและหนังสือเปิดได้บนโทรศัพท์หรือจอในห้องเรียนด้วยคิวอาร์โค้ด โดยไม่ต้องใช้แอปและไม่ต้องเข้าสู่ระบบ" },
    { key: "faq.questions.2.question", en: "Our kindergarten teachers are not English teachers. Can they teach it?", th: "ครูอนุบาลที่ไม่ใช่ครูภาษาอังกฤษสอนได้ไหม" },
    { key: "faq.questions.2.answer", en: "Yes. Every lesson is printed in full: what the teacher does, the English the teacher says with the Thai beside it, what the children do, and what to watch.", th: "ได้ คู่มือครูมีแผนการสอนและข้อความภาษาอังกฤษที่ใช้สอน พร้อมความหมายภาษาไทยและสิ่งที่เด็กทำในแต่ละขั้นตอน" },
    { key: "faq.questions.3.question", en: "Who is Storytime Advantage for?", th: "Storytime Advantage เหมาะกับใคร" },
    { key: "faq.questions.3.answer", en: "Children from Anuban 2 to P2, about ages 4 to 8, and their class teachers. Parents join through the weekly home card.", th: "เด็กอนุบาล 2 ถึง ป.2 อายุประมาณ 4 ถึง 8 ปี และครูประจำชั้น ผู้ปกครองร่วมกิจกรรมที่บ้านได้ผ่านบัตรประจำสัปดาห์" },
    { key: "faq.questions.4.question", en: "What happens after P2?", th: "หลังจาก ป.2 แล้วเรียนอะไรต่อ" },
    { key: "faq.questions.4.answer", en: "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module.", th: "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module." },
  ],
  "st-cta": [
    { key: "cta.heading", en: "Interested in Storytime Advantage?", th: "สนใจ Storytime Advantage ไหม" },
    { key: "cta.description", en: "The first unit is being prepared. Contact us to discuss Storytime Advantage.", th: "กำลังจัดเตรียมหน่วยการเรียนรู้แรก ติดต่อเราเพื่อพูดคุยเกี่ยวกับ Storytime Advantage" },
    { key: "cta.buttons.joinWaitlist", en: "Contact Us", th: "ติดต่อเรา", href: "/contact" },
    { key: "cta.buttons.learnMore", en: "Learn More", th: "ดูข้อมูลเพิ่มเติม", href: "/contact" },
  ],
};

/** The alt text of each image, word for word from the image list v0.2 (advantage-pr 84b07643), spec section 6. */
export const IMAGE_ALT: Readonly<Record<(typeof STORYTIME_IMAGES)[number]["name"], { readonly en: string; readonly th: string }>> = {
  "week-01-hello-pip": { en: "Pip appears in the week 1 story page, “Hello, I Am Pip.”", th: "Pip ปรากฏในหน้าหนังสือเรื่องประจำสัปดาห์ที่ 1 “Hello, I Am Pip”" },
  "level-2-unit-1-cover-art": { en: "The cover picture of Storytime Advantage Level 2.", th: "ภาพปกของ Storytime Advantage Level 2" },
  "week-01-reader-hello-cover": { en: "The cover of the week 1 reader, “Hello!”", th: "ปกหนังสือฝึกอ่านประจำสัปดาห์ที่ 1 “Hello!”" },
  "week-01-reader-nan-can-nod-cover": { en: "The cover of the week 1 reader, “Nan Can Nod.”", th: "ปกหนังสือฝึกอ่านประจำสัปดาห์ที่ 1 “Nan Can Nod”" },
  "week-02-how-many-cakes": { en: "The week 2 story page shows seven cakes.", th: "หน้าหนังสือเรื่องประจำสัปดาห์ที่ 2 แสดงเค้กเจ็ดชิ้น" },
  "week-03-it-is-red": { en: "A week 3 story page shows an object that is red.", th: "หน้าหนังสือเรื่องประจำสัปดาห์ที่ 3 แสดงสิ่งของสีแดง" },
  "week-04-nan-and-pam-nap": { en: "Nan and Pam appear in a week 4 story page.", th: "Nan และ Pam ปรากฏในหน้าหนังสือเรื่องประจำสัปดาห์ที่ 4" },
  "week-05-two-ears": { en: "A week 5 story page shows two ears.", th: "หน้าหนังสือเรื่องประจำสัปดาห์ที่ 5 แสดงหูสองข้าง" },
  "week-06-i-see-a-cat": { en: "A cat appears in a week 6 story page.", th: "แมวปรากฏในหน้าหนังสือเรื่องประจำสัปดาห์ที่ 6" },
  "week-07-top-on-a-pot": { en: "A top sits on a pot in a week 7 story page.", th: "ลูกข่างวางอยู่บนหม้อในหน้าหนังสือเรื่องประจำสัปดาห์ที่ 7" },
};

/**
 * The old roadmap values of the spec section 5 keys, word for word from
 * `git show eae9f4ed7:apps/www-reading-advantage/src/locales/pages/products/storytime-advantage.ts`.
 * No locale page and no locale file holds any of them.
 */
export const OLD_ROADMAP_COPY: readonly { readonly key: string; readonly en: string; readonly th: string; readonly zh: string }[] = [
  { key: "metadata.title", en: "Storytime Advantage - On Our Roadmap | Reading Advantage Thailand", th: "Storytime Advantage - อยู่ในแผนงาน | Reading Advantage Thailand", zh: "Storytime Advantage - 我们路线图中 | 阅读优势泰国" },
  { key: "metadata.description", en: "Storytime Advantage is on the Reading Advantage product roadmap — planned K-3 early literacy book line with a printed workbook and a digital twin. No launch date.", th: "Storytime Advantage อยู่ในแผนงานผลิตภัณฑ์ของ Reading Advantage — ชุดหนังสือการรู้หนังสือ K-3 ที่วางแผนไว้ มีแบบฝึกหัดเล่มพิมพ์และเวอร์ชันดิจิทัล ยังไม่มีกำหนดวันเปิดตัว", zh: "Storytime Advantage 在 Reading Advantage 产品路线图中 — 计划中的 K-3 早期识字图书系列，包含纸质练习册和数字版本。暂无发布日期。" },
  { key: "hero.title", en: "Early Literacy, Planned", th: "การรู้หนังสือขั้นต้น ในแผนงาน", zh: "规划中的早期识字" },
  { key: "hero.subtitle", en: "A Planned K-3 Literacy Book Line", th: "ชุดหนังสือการรู้หนังสือ K-3 ที่วางแผนไว้", zh: "计划中的 K-3 识字图书系列" },
  { key: "hero.description", en: "Storytime Advantage is a K-3 literacy book line on our roadmap. It has no release date. It is planned to pair printed books with a digital twin.", th: "Storytime Advantage เป็นชุดหนังสือการรู้หนังสือ K-3 ในแผนงานของเรา ยังไม่มีกำหนดวันเปิดตัว วางแผนให้หนังสือเล่มพิมพ์ทำงานคู่กับเวอร์ชันดิจิทัล", zh: "Storytime Advantage 是我们路线图上的 K-3 识字图书系列，暂无发布日期。计划让纸质书与数字版本配合使用。" },
  { key: "hero.comingSoon", en: "On Our Roadmap", th: "อยู่ในแผนงาน", zh: "我们路线图中" },
  { key: "coreValue.heading", en: "A Literacy Line in Print and Digital", th: "ชุดการรู้หนังสือทั้งแบบพิมพ์และดิจิทัล", zh: "纸质与数字并行的识字系列" },
  { key: "keyFeatures.heading", en: "Planned Features", th: "คุณสมบัติที่วางแผนไว้", zh: "计划中的功能" },
  { key: "teacherTools.heading", en: "Planned Teacher Tools", th: "เครื่องมือสำหรับครูที่วางแผนไว้", zh: "计划中的教师工具" },
  { key: "adaptiveEngine.eyebrow", en: "Adaptive Engine", th: "เครื่องยนต์ปรับตัว", zh: "自适应引擎" },
  { key: "adaptiveEngine.heading", en: "Early literacy paths built on mastery data", th: "เส้นทางการรู้หนังสือตอนต้นที่สร้างจากข้อมูลความเชี่ยวชาญ", zh: "基于掌握度数据的早期读写路径" },
  { key: "adaptiveEngine.description", en: "Built on Mastery Advantage, the engine that uses Knowledge Space Theory and FSRS spaced repetition to map skills and schedule practice.", th: "สร้างบน Mastery Advantage เครื่องยนต์ที่ใช้ทฤษฎีปริภูมิความรู้และการทบทวนแบบ FSRS เพื่อจัดทำแผนที่ทักษะและกำหนดเวลาฝึกฝน", zh: "基于 Mastery Advantage，该引擎使用知识空间理论和 FSRS 间隔重复来映射技能并安排练习。" },
  { key: "faq.questions.0.question", en: "When will Storytime Advantage launch?", th: "Storytime Advantage จะเปิดตัวเมื่อใด?", zh: "Storytime Advantage 什么时候推出？" },
  { key: "faq.questions.0.answer", en: "Storytime Advantage is on our product roadmap. It has no release date. Tell us what you need.", th: "Storytime Advantage อยู่ในแผนงานผลิตภัณฑ์ของเรา ยังไม่มีกำหนดวันเปิดตัว บอกเราว่าคุณต้องการอะไร", zh: "Storytime Advantage 在我们的产品路线图中。暂无发布日期，欢迎告诉我们您的需求。" },
  { key: "faq.questions.1.question", en: "What are the technical requirements?", th: "ข้อกำหนดทางเทคนิคคืออะไร?", zh: "技术要求是什么？" },
  { key: "faq.questions.1.answer", en: "Storytime Advantage is planned as printed books with a digital twin that runs in a web browser. Technical details will come when the product is closer to release.", th: "Storytime Advantage วางแผนเป็นหนังสือเล่มพิมพ์พร้อมเวอร์ชันดิจิทัลที่ใช้ผ่านเว็บเบราว์เซอร์ เราจะแจ้งรายละเอียดทางเทคนิคเมื่อใกล้เปิดตัว", zh: "Storytime Advantage 计划做成纸质书加可在网页浏览器中使用的数字版本。技术细节将在临近发布时说明。" },
  { key: "faq.questions.2.question", en: "What will the Storytime Advantage curriculum include?", th: "หลักสูตร Storytime Advantage จะประกอบด้วยอะไรบ้าง?", zh: "Storytime Advantage 课程包括哪些内容？" },
  { key: "faq.questions.2.answer", en: "The planned curriculum will combine digital phonics lessons, decodable texts, printable activities, and classroom resources.", th: "หลักสูตรที่วางแผนไว้จะผสานบทเรียนโฟนิกส์ดิจิทัล ข้อความที่ถอดรหัสได้ กิจกรรมที่พิมพ์ได้ และทรัพยากรสำหรับห้องเรียน", zh: "计划中的课程将结合数字语音课程、可解码文本、可打印活动和课堂资源。" },
  { key: "faq.questions.3.question", en: "Who is Storytime Advantage designed for?", th: "Storytime Advantage ออกแบบมาสำหรับใคร?", zh: "Storytime Advantage 面向哪些人？" },
  { key: "faq.questions.3.answer", en: "The planned K-3 program is designed for young learners, teachers, and schools that want a balanced literacy approach.", th: "โปรแกรม K-3 ที่วางแผนไว้ออกแบบสำหรับผู้เรียนรุ่นเยาว์ ครู และโรงเรียนที่ต้องการแนวทางการรู้หนังสือที่สมดุล", zh: "计划中的 K-3 课程面向儿童、教师以及希望采用平衡识字方法的学校。" },
  { key: "faq.questions.4.question", en: "How can I receive Storytime Advantage updates?", th: "ฉันจะรับข่าวสารอัปเดตของ Storytime Advantage ได้อย่างไร?", zh: "如何获取 Storytime Advantage 的最新消息？" },
  { key: "faq.questions.4.answer", en: "Tell us you are interested and we will share news when we have it.", th: "บอกเราว่าคุณสนใจ แล้วเราจะแบ่งปันข่าวเมื่อมี", zh: "告诉我们您感兴趣，有消息时我们会与您分享。" },
  { key: "cta.description", en: "Storytime Advantage is on our roadmap. It has no release date. Tell us what you need.", th: "Storytime Advantage อยู่ในแผนงานของเรา ยังไม่มีกำหนดวันเปิดตัว บอกเราว่าคุณต้องการอะไร", zh: "Storytime Advantage 在我们的路线图中。暂无发布日期，欢迎告诉我们您的需求。" },
];

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

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * The term classes of the claims scanner, in the order of spec section 7.
 * No class flags "date", "no public date", "30-minute", "5-minute", "3-minute", or "4 minutes".
 */
export const CLAIM_TERMS = [
  { name: "year", pattern: /20\d\d/ },
  { name: "English month", pattern: new RegExp(`\\b(?:${[...MONTHS_EN, ...MONTHS_EN.map((month) => month.toUpperCase())].join("|")})\\b`) },
  { name: "พ.ศ.", pattern: /พ\.ศ\./ },
  { name: "฿", pattern: /฿/ },
  { name: "THB", pattern: /(?<![a-z])thb(?![a-z])/i },
  { name: "baht", pattern: /baht/i },
  { name: "บาท", pattern: /บาท/ },
  { name: "$", pattern: /\$/ },
  { name: "USD", pattern: /(?<![a-z])usd(?![a-z])/i },
  { name: "price", pattern: /price/i },
  { name: "ราคา", pattern: /ราคา/ },
  { name: "free", pattern: /\bfree\b/i },
  { name: "ฟรี", pattern: /ฟรี/ },
  { name: "ทดลองใช้", pattern: /ทดลองใช้/ },
  { name: "discount", pattern: /discount/i },
  { name: "ส่วนลด", pattern: /ส่วนลด/ },
  { name: "results", pattern: /results/i },
  { name: "score", pattern: /score/i },
  { name: "guarantee", pattern: /guarantee/i },
  { name: "guaranteed", pattern: /guaranteed/i },
  { name: "fluent", pattern: /fluent/i },
  { name: "fluency", pattern: /fluency/i },
  { name: "grade level", pattern: /grade\s+level/i },
  { name: "ผลลัพธ์", pattern: /ผลลัพธ์/ },
  { name: "รับประกัน", pattern: /รับประกัน/ },
] as const;

/** The name of one claims scanner term class. */
export type ClaimTermName = (typeof CLAIM_TERMS)[number]["name"];

/**
 * Finds the claim terms of spec section 7 in a text.
 * @param text The text to scan.
 * @returns The names of the term classes that the text holds, in scanner order.
 */
export function findClaimTerms(text: string): ClaimTermName[] {
  return CLAIM_TERMS.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
}
