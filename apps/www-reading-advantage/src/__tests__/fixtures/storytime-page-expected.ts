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
      "Storytime Advantage is an English app for Anuban 2 to P2. It launches on 30 November 2026 with one sound, one song, and two books each week.",
  },
  th: {
    title: "Storytime Advantage - ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 | Reading Advantage Thailand",
    description:
      "Storytime Advantage เป็นแอปภาษาอังกฤษสำหรับเด็กอนุบาล 2 ถึง ป.2 เปิดตัววันที่ 30 พฤศจิกายน 2569 พร้อมหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่มในแต่ละสัปดาห์",
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
    badge: "Launches 30 November 2026",
    gradeRange: "English program for Anuban 2 to P2",
    features: [
      "One sound, one song, and two books each week",
      "QR links open the song and books",
    ],
    navigation: "English for Anuban 2 to P2; the first unit launches on 30 November 2026",
    home: "Primary Advantage, Reading Advantage, and CodeCamp Advantage are live. Mastery Advantage runs in CodeCamp Advantage and is entering Primary Advantage through tagged content. Science, Math, Zhongwen, and STEM Advantage are on our roadmap. The first Storytime Advantage unit launches on 30 November 2026.",
  },
  th: {
    badge: "เปิดตัววันที่ 30 พฤศจิกายน 2569",
    gradeRange: "หลักสูตรภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2",
    features: [
      "หนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่มต่อสัปดาห์",
      "คิวอาร์โค้ดเปิดเพลงและหนังสือ",
    ],
    navigation: "ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 หน่วยการเรียนรู้แรกเปิดตัววันที่ 30 พฤศจิกายน 2569",
    home: "Primary Advantage, Reading Advantage และ CodeCamp Advantage เปิดใช้งานแล้ว Mastery Advantage ทำงานอยู่ใน CodeCamp Advantage และกำลังเข้าสู่ Primary Advantage ผ่านเนื้อหาที่ติดแท็ก Science, Math, Zhongwen และ STEM Advantage อยู่ในแผนงาน หน่วยการเรียนรู้แรกของ Storytime Advantage เปิดตัววันที่ 30 พฤศจิกายน 2569",
  },
  zh: {
    badge: "Launches 30 November 2026",
    gradeRange: "面向 Anuban 2 至 P2 的英语课程",
    features: [
      "每周一个发音、一首歌和两本书",
      "二维码可打开歌曲和书籍",
    ],
    navigation: "English for Anuban 2 to P2; the first unit launches on 30 November 2026",
    home: "Primary Advantage、Reading Advantage 和 CodeCamp Advantage 已上线。Mastery Advantage 在 CodeCamp Advantage 中运行，并通过带标签的内容进入 Primary Advantage。Science、Math、Zhongwen 和 STEM Advantage 在路线图中，暂无日期。",
  },
} as const;

export const OVERVIEW_LABEL_COPY = {
  en: {
    gradeRange: "English for Anuban 2 to P2",
    description: "Storytime Advantage is an English app for Anuban 2 to P2, ages 4 to 8. Each week brings one sound, one song, and two books to a phone at home or a classroom screen. The app launches on 30 November 2026.",
    ctaLabel: "Explore Storytime",
  },
  th: {
    gradeRange: "ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2",
    description: "Storytime Advantage เป็นแอปภาษาอังกฤษสำหรับเด็กอนุบาล 2 ถึง ป.2 อายุ 4 ถึง 8 ปี แต่ละสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม บนโทรศัพท์ที่บ้านหรือจอในห้องเรียน แอปเปิดตัววันที่ 30 พฤศจิกายน 2569",
    ctaLabel: "สำรวจ Storytime",
  },
  zh: {
    gradeRange: "面向 Anuban 2 至 P2 的英语课程",
    description: "Storytime Advantage 是面向 Anuban 2 至 P2 的英语课程。每周有一个发音、一首歌和两本书。",
    ctaLabel: "了解 Storytime",
  },
} as const;

/**
 * The four song strings, word for word from hand-off v0.2 section (a).
 * The Thai strings are Daniel's draft. The zh strings are the PR draft.
 * The song title "Hello, I am Pip" stays in English in all three locales.
 */
export const SONG_COPY = {
  en: {
    heading: "The Week 1 Song",
    text: "“Hello, I am Pip” is the song of week 1 in the first unit. Each week has its own song with a video, so children can sing along in class or at home.",
    playLabel: "Play the song",
    playerTitle: "Video of the week 1 song “Hello, I am Pip”, Storytime Advantage",
  },
  th: {
    heading: "เพลงของสัปดาห์ที่ 1",
    text: "“Hello, I am Pip” เป็นเพลงของสัปดาห์ที่ 1 ในหน่วยแรก แต่ละสัปดาห์มีเพลงของตัวเองพร้อมวิดีโอ เด็กจึงร้องตามได้ทั้งในห้องเรียนและที่บ้าน",
    playLabel: "เล่นเพลง",
    playerTitle: "วิดีโอเพลงของสัปดาห์ที่ 1 “Hello, I am Pip” ของ Storytime Advantage",
  },
  zh: {
    heading: "第一周歌曲",
    text: "“Hello, I am Pip”是第一单元第一周的歌曲。每周都有自己的歌曲和视频，孩子们可以在课堂上或在家里一起唱。",
    playLabel: "播放歌曲",
    playerTitle: "视频：第一周歌曲“Hello, I am Pip”，Storytime Advantage",
  },
} as const;

/** The local poster files of the song section. */
export const SONG_POSTERS = {
  desktop: "/images/storytime-advantage/song-week-1-desktop-poster.jpg",
  phone: "/images/storytime-advantage/song-week-1-phone-poster.jpg",
} as const;

/** The media rule that picks the phone poster. */
export const SONG_POSTER_MEDIA = "(max-width: 767px)";

/** One rendered page string: its locale key, its English and Thai text, and the link target of a button. */
export interface ExpectedCopy {
  readonly key: string;
  readonly en: string;
  readonly th: string;
  readonly zh?: string;
  readonly href?: "/contact";
}

/**
 * Every rendered page string, word for word, by container in page order.
 * Copied from copy v0.4 (advantage-pr 9b5e1743) and Thai copy v0.1 (advantage-pr 4f8fcbde), as spec section 5 quotes them.
 * The zh page shows the English strings.
 */
export const PAGE_COPY: Readonly<Record<(typeof CONTAINER_IDS)[number], readonly ExpectedCopy[]>> = {
  "st-hero": [
    { key: "hero.comingSoon", en: "Launches 30 November 2026", th: "เปิดตัววันที่ 30 พฤศจิกายน 2569" },
    { key: "hero.title", en: "Stories, Songs, and First Sounds", th: "นิทาน เพลง และเสียงแรกของภาษาอังกฤษ" },
    { key: "hero.subtitle", en: "English for Anuban 2 to P2 (ages 4 to 8)", th: "ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 (อายุประมาณ 4 ถึง 8 ปี)" },
    { key: "hero.description", en: "A child taps a word and hears it. The class joins the song. Storytime Advantage brings one sound, one song, and two books to each week, on a phone at home and a screen in the classroom.", th: "เด็กคนหนึ่งแตะคำแล้วได้ยินเสียงอ่าน ทั้งชั้นร้องเพลงไปด้วยกัน Storytime Advantage นำหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่มมาสู่ทุกสัปดาห์ บนโทรศัพท์ที่บ้านและจอในห้องเรียน" },
  ],
  "st-section-1": [
    { key: "adaptiveEngine.eyebrow", en: "Mastery Advantage", th: "Mastery Advantage" },
    { key: "adaptiveEngine.heading", en: "Every Item on One Skill Map", th: "ทุกรายการอยู่บนแผนผังทักษะเดียวกัน" },
    { key: "adaptiveEngine.description", en: "Every sound, word, and sentence frame is tagged to the Mastery Advantage skill map, the same English map used by the Primary Advantage books.", th: "ทุกเสียง ทุกคำ และทุกรูปประโยค ผูกกับแผนผังทักษะ Mastery Advantage ซึ่งเป็นแผนผังภาษาอังกฤษเดียวกับที่ใช้ในหนังสือ Primary Advantage" },
  ],
  "st-section-2": [
    { key: "eyebrows.keyFeatures", en: "WHAT IS IN THE PROGRAM", th: "สิ่งที่มีในหลักสูตร" },
    { key: "keyFeatures.heading", en: "Inside the Storytime Advantage App", th: "สิ่งที่มีในแอป Storytime Advantage" },
    { key: "keyFeatures.features.0.title", en: "Two Books Every Week", th: "หนังสือสองเล่มทุกสัปดาห์" },
    { key: "keyFeatures.features.0.points.0", en: "The read-along book reads to your child page by page.", th: "หนังสืออ่านตามอ่านให้ลูกฟังทีละหน้า" },
    { key: "keyFeatures.features.0.points.1", en: "Choose “Read to me” or “I read”, and tap any word to hear it.", th: "เลือก “อ่านให้ฟัง” หรือ “ฉันอ่านเอง” แล้วแตะคำใดก็ได้เพื่อฟังเสียงอ่าน" },
    { key: "keyFeatures.features.0.points.2", en: "Choose slow mode when your child wants a slower reading speed.", th: "เลือกโหมดอ่านช้าเมื่อลูกต้องการฟังเสียงอ่านที่ช้าลง" },
    { key: "keyFeatures.features.0.points.3", en: "The decodable book introduces first sounds, with words to tap and hear.", th: "หนังสือฝึกอ่านแบบถอดเสียงแนะนำเสียงแรก ๆ พร้อมคำให้เด็กแตะเพื่อฟังเสียงอ่าน" },
    { key: "keyFeatures.features.1.title", en: "One Sign-In, Then Storytime", th: "เข้าสู่ระบบครั้งเดียว แล้วอ่านนิทานได้เลย" },
    { key: "keyFeatures.features.1.points.0", en: "Open on a phone at home or a screen in the classroom.", th: "เปิดบนโทรศัพท์ที่บ้านหรือจอในห้องเรียน" },
    { key: "keyFeatures.features.1.points.1", en: "A parent, or the teacher for the class, signs in on the first visit.", th: "ผู้ปกครอง หรือครูประจำชั้น เข้าสู่ระบบเมื่อเปิดใช้ครั้งแรก" },
    { key: "keyFeatures.features.1.points.2", en: "The device then stays signed in.", th: "จากนั้นอุปกรณ์จะยังคงเข้าสู่ระบบไว้" },
    { key: "keyFeatures.features.1.points.3", en: "The week’s song comes with a video.", th: "เพลงประจำสัปดาห์มาพร้อมวิดีโอ" },
  ],
  "st-section-3": [
    { key: "eyebrows.k3Curriculum", en: "ANUBAN 2 TO P2", th: "อนุบาล 2 ถึง ป.2" },
    { key: "coreValue.heading", en: "One Sound, One Song, Two Books a Week", th: "หนึ่งเสียง หนึ่งเพลง หนังสือสองเล่ม ทุกสัปดาห์" },
    { key: "coreValue.features.0.title", en: "A Story You Can Hear", th: "นิทานที่ฟังได้" },
    { key: "coreValue.features.0.description", en: "The read-along book reads page by page. Children can choose “Read to me” or “I read”, tap a word, or select slow mode.", th: "หนังสืออ่านตามอ่านให้ฟังทีละหน้า เด็กเลือก “อ่านให้ฟัง” หรือ “ฉันอ่านเอง” แตะคำเพื่อฟังเสียงอ่าน หรือเลือกโหมดอ่านช้าได้" },
    { key: "coreValue.features.1.title", en: "One Sound a Week", th: "หนึ่งเสียงในแต่ละสัปดาห์" },
    { key: "coreValue.features.1.description", en: "The decodable book introduces first sounds and gives children words to tap and hear.", th: "หนังสือฝึกอ่านแบบถอดเสียงแนะนำเสียงแรก ๆ และมีคำให้เด็กแตะเพื่อฟังเสียงอ่าน" },
    { key: "coreValue.features.2.title", en: "A Link to Home", th: "เชื่อมต่อกับบ้าน" },
    { key: "coreValue.features.2.description", en: "Each weekly Thai parent page includes the sound, three words, one sentence, and a 5-minute home activity.", th: "หน้าสำหรับผู้ปกครองภาษาไทยในแต่ละสัปดาห์มีเสียงประจำสัปดาห์ สามคำ หนึ่งประโยค และกิจกรรมที่บ้าน 5 นาที" },
    { key: "song.heading", en: SONG_COPY.en.heading, th: SONG_COPY.th.heading, zh: SONG_COPY.zh.heading },
    { key: "song.text", en: SONG_COPY.en.text, th: SONG_COPY.th.text, zh: SONG_COPY.zh.text },
    { key: "song.playLabel", en: SONG_COPY.en.playLabel, th: SONG_COPY.th.playLabel, zh: SONG_COPY.zh.playLabel },
  ],
  "st-section-4": [
    { key: "eyebrows.teacherResources", en: "FOR THE TEACHER", th: "สำหรับครู" },
    { key: "teacherTools.heading", en: "For the Teacher", th: "สำหรับครู" },
    { key: "teacherTools.tools.0.title", en: "The Classroom Screen", th: "จอในห้องเรียน" },
    { key: "teacherTools.tools.0.description", en: "Open the app on your classroom screen. Share the story and play the week’s song video with the class.", th: "เปิดแอปบนจอในห้องเรียน เพื่อใช้นิทานและเล่นวิดีโอเพลงประจำสัปดาห์ร่วมกับเด็กทั้งชั้น" },
    { key: "teacherTools.tools.1.title", en: "Hear the Page, Hear the Word", th: "ฟังทั้งหน้า ฟังทีละคำ" },
    { key: "teacherTools.tools.1.description", en: "Play the read-aloud page by page. Tap a word to hear it, or choose slow mode.", th: "เปิดเสียงอ่านทีละหน้า แตะคำเพื่อฟังเสียงอ่าน หรือเลือกโหมดอ่านช้า" },
    { key: "teacherTools.tools.2.title", en: "A Clear Weekly Rhythm", th: "จังหวะการเรียนรู้รายสัปดาห์ที่ชัดเจน" },
    { key: "teacherTools.tools.2.description", en: "One sound, one song, and two books give your class a shared focus. Sign in once, and the classroom device stays signed in.", th: "หนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม ช่วยให้ทั้งชั้นมีจุดเน้นร่วมกันในแต่ละสัปดาห์ เข้าสู่ระบบเพียงครั้งเดียว จากนั้นอุปกรณ์ในห้องเรียนจะยังคงเข้าสู่ระบบไว้" },
  ],
  "st-section-5": [
    { key: "eyebrows.frequentlyAskedQuestions", en: "FREQUENTLY ASKED QUESTIONS", th: "คำถามที่พบบ่อย" },
    { key: "faq.heading", en: "Frequently Asked Questions", th: "คำถามที่พบบ่อย" },
    { key: "faq.questions.0.question", en: "What does each week include?", th: "แต่ละสัปดาห์มีอะไรบ้าง" },
    { key: "faq.questions.0.answer", en: "Each week brings one sound, one song with a video, and two books: a read-along book and a decodable book. Children can hear pages and tap words. Parents also receive a short Thai page with a 5-minute home activity.", th: "แต่ละสัปดาห์มีหนึ่งเสียง หนึ่งเพลงพร้อมวิดีโอ และหนังสือสองเล่ม ได้แก่ หนังสืออ่านตามและหนังสือฝึกอ่านแบบถอดเสียง เด็กฟังเสียงอ่านทีละหน้าและแตะคำเพื่อฟังเสียงอ่านได้ ผู้ปกครองยังได้รับหน้าข้อมูลภาษาไทยสั้น ๆ พร้อมกิจกรรมที่บ้าน 5 นาที" },
    { key: "faq.questions.1.question", en: "What do we need to open Storytime Advantage?", th: "ต้องใช้อะไรเพื่อเปิด Storytime Advantage" },
    { key: "faq.questions.1.answer", en: "A phone at home or a screen in the classroom. A parent, or the teacher for the class, signs in on the first visit. The device then stays signed in.", th: "โทรศัพท์ที่บ้านหรือจอในห้องเรียน ผู้ปกครอง หรือครูประจำชั้น เข้าสู่ระบบเมื่อเปิดใช้ครั้งแรก จากนั้นอุปกรณ์จะยังคงเข้าสู่ระบบไว้" },
    { key: "faq.questions.2.question", en: "Our kindergarten teachers are not English teachers. Can they teach it?", th: "ครูอนุบาลที่ไม่ใช่ครูภาษาอังกฤษสอนได้ไหม" },
    { key: "faq.questions.2.answer", en: "Yes. The app supplies the English audio. The read-along book reads page by page, and each word can be heard with a tap. Teachers can also use slow mode and the song video with the class.", th: "ได้ แอปมีเสียงอ่านภาษาอังกฤษให้ หนังสืออ่านตามอ่านให้ฟังทีละหน้า และแตะคำใดก็ได้เพื่อฟังเสียงอ่าน ครูยังใช้โหมดอ่านช้าและวิดีโอเพลงกับเด็กทั้งชั้นได้" },
    { key: "faq.questions.3.question", en: "Who is Storytime Advantage for?", th: "Storytime Advantage เหมาะกับใคร" },
    { key: "faq.questions.3.answer", en: "Storytime Advantage is for children from Anuban 2 to P2, ages 4 to 8. Schools open it on a classroom screen, and families open it on a phone at home. A weekly Thai parent page includes a 5-minute home activity.", th: "Storytime Advantage เหมาะสำหรับเด็กอนุบาล 2 ถึง ป.2 อายุ 4 ถึง 8 ปี โรงเรียนเปิดใช้บนจอในห้องเรียน และครอบครัวเปิดใช้บนโทรศัพท์ที่บ้าน หน้าสำหรับผู้ปกครองภาษาไทยประจำสัปดาห์มีกิจกรรมที่บ้าน 5 นาที" },
    { key: "faq.questions.4.question", en: "What happens after P2?", th: "หลังจาก ป.2 แล้วเรียนอะไรต่อ" },
    { key: "faq.questions.4.answer", en: "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module.", th: "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module." },
  ],
  "st-cta": [
    { key: "cta.heading", en: "Interested in Storytime Advantage?", th: "สนใจ Storytime Advantage ไหม" },
    { key: "cta.description", en: "The app launches on 30 November 2026. Ask us on LINE OA for the steps to join Storytime Advantage with your family or class.", th: "แอปเปิดตัววันที่ 30 พฤศจิกายน 2569 สอบถามขั้นตอนการเข้าร่วม Storytime Advantage สำหรับครอบครัวหรือชั้นเรียนของคุณได้ทาง LINE OA" },
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

/**
 * The one approved public date of the batch of 2026-11-16 (Daniel, Google Tasks, 2026-11-16 05:07 ICT).
 * Every other date stays a claim hit.
 */
export const APPROVED_DATES = {
  en: "30 November 2026",
  th: "30 พฤศจิกายน 2569",
} as const;

/**
 * Finds the claim terms of a text after it clears the approved public date.
 * @param text The text to scan.
 * @returns The names of the term classes that the text still holds, in scanner order.
 */
export function findUnapprovedClaimTerms(text: string): ClaimTermName[] {
  const cleared = text.split(APPROVED_DATES.en).join("").split(APPROVED_DATES.th).join("");
  return findClaimTerms(cleared);
}
