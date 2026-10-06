import type { LessonPackage } from "../package-schema.js";

/** A small lesson package in the shape of `origins-3.2/p01.json`. */
export function samplePackage(overrides: Partial<LessonPackage["meta"]> = {}, extra: Partial<LessonPackage> = {}): LessonPackage {
  return {
    version: 1,
    meta: {
      book: "origins-3.2",
      lesson: "P01",
      number: 1,
      key: "o3-2/1",
      title: "Hello! I Am May",
      raLevel: 3,
      cefrLevel: "A0+",
      genre: "School",
      appType: "nonfiction",
      role: "workbook",
      ...overrides,
    },
    text: { paragraphs: ['"Good morning, class!" says Teacher Kim. May is new.', "May lives next to the school."], summary: "May joins a class." },
    glossary: [
      { word: "hi", pos: "exclamation", definition: "A word you say when you meet a friend.", thai: "สวัสดี", example: '"Hi, class!" says May.' },
      { word: "new", pos: "adjective", definition: "Not here before.", thai: "ใหม่", example: "May is new." },
    ],
    bank: {
      mcq: [
        { id: "m1", question: "Who is new?", options: ["May", "Kim", "Pat", "Lily"], answer: "May", evidence: "May is new.", objectives: [] },
        { id: "m2", question: "Where does May live?", options: ["By the sea", "Next to the school", "In a city", "On a farm"], answer: "Next to the school", evidence: "May lives next to the school.", objectives: [] },
      ],
      saq: [{ id: "s1", question: "Who says good morning?", answer: "Teacher Kim.", objectives: [] }],
      laq: [{ id: "l1", question: "Write about your class.", objectives: [] }],
    },
    print: { mcq: ["m1"], saq: "s1", mcqOptions: 3 },
    activities: { vocabFill: [{ sentence: "May is ___.", answer: "new" }] },
    thai: {
      paragraphs: [
        [
          { en: '"Good morning, class!" says Teacher Kim.', th: '"สวัสดีตอนเช้า นักเรียน" ครูคิมพูด' },
          { en: "May is new.", th: "เมย์เป็นนักเรียนใหม่" },
        ],
        [{ en: "May lives next to the school.", th: "เมย์อาศัยอยู่ข้างโรงเรียน" }],
      ],
      summary: "เมย์เข้าชั้นเรียน",
    },
    images: [{ position: "hero", prompt: "A girl waves at a class.", caption: "May is new in the class." }],
    audio: {
      sentences: [
        { text: '"Good morning, class!" says Teacher Kim.', startTime: 0, endTime: 3 },
        { text: "May is new.", startTime: 3, endTime: 4 },
        { text: "May lives next to the school.", startTime: 4, endTime: 6 },
      ],
      wordTimes: [
        { text: "hi", startTime: 0, endTime: 0.7 },
        { text: "new", startTime: 1, endTime: 1.6 },
      ],
      flashcardTimes: [{ text: "May lives next to the school.", startTime: 0, endTime: 2 }],
    },
    tags: { targetObjectives: ["GSE-1"] },
    approval: { lesson: { status: "approved" } },
    db: {},
    ...extra,
  } as LessonPackage;
}
