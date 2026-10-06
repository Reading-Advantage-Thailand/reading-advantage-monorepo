import { describe, expect, it } from "vitest";
import { BOOKS, estimateWordTimes, legacyArticleIdOf, splitKey, toArticleRow, toFlashcardRow, toLessonPackageJson, toQuestionRows, toTagRows } from "../mapping.js";
import { parseLessonPackage } from "../package-schema.js";
import { isAppStepUnlocked, WORKBOOK_STEPS, workbookStepOf } from "../step-map.js";
import { samplePackage } from "./fixtures.js";

const ID = "11111111-1111-4111-8111-111111111111";

describe("lesson package mapping", () => {
  it("knows every Workbooks book key, origins-1 included", () => {
    expect(Object.keys(BOOKS).sort()).toEqual(["o1", "o2", "o3-1", "o3-2", "q4"]);
    expect(BOOKS.o1).toEqual({ seriesKey: "origins", seriesName: "Primary Advantage Origins", name: "Primary Advantage Origins 1" });
  });

  it("parses the sample package and splits its key", () => {
    const pkg = parseLessonPackage(samplePackage());
    expect(splitKey(pkg.meta.key)).toEqual({ bookKey: "o3-2", number: 1 });
    expect(() => splitKey("bad")).toThrow();
  });

  it("finds the legacy article from the injected id, the printed source, or the replaced article", () => {
    expect(legacyArticleIdOf(samplePackage())).toBeNull();
    expect(legacyArticleIdOf(samplePackage({ replaces: "cmold" }))).toBe("cmold");
    expect(legacyArticleIdOf(samplePackage({ printed: { articleId: "cmprint" } }))).toBe("cmprint");
    expect(legacyArticleIdOf(samplePackage({}, { db: { legacy: { articleId: "cminjected" } } }))).toBe("cminjected");
  });

  it("maps the article row by the field map: passage, levels, media paths, sentences, and Thai per sentence", () => {
    const row = toArticleRow(samplePackage(), ID);
    expect(row.passage).toBe('"Good morning, class!" says Teacher Kim. May is new.\n\nMay lives next to the school.');
    expect(row.content).toBe(row.passage);
    expect(row).toMatchObject({ type: "nonfiction", cefrLevel: "A0+", raLevel: 3, level: 3, rating: 5, isPublished: true, isApproved: true, isDraft: false });
    expect(row.audioUrl).toBe(`/audios/articles/${ID}.mp3`);
    expect(row.audioWordUrl).toBe(`/audios/words/${ID}.mp3`);
    expect(row.sentences).toHaveLength(3);
    expect(row.sentences[1]).toMatchObject({ sentence: "May is new.", startTime: 3, endTime: 4 });
    expect(row.sentences[1].words.map((word) => word.word)).toEqual(["May", "is", "new."]);
    expect(row.translatedPassage.th).toEqual(['"สวัสดีตอนเช้า นักเรียน" ครูคิมพูด', "เมย์เป็นนักเรียนใหม่", "เมย์อาศัยอยู่ข้างโรงเรียน"]);
    // Other locales fall back to English; never an empty string.
    expect(row.translatedPassage.vi).toEqual(row.sentences.map((sentence) => sentence.sentence));
    expect(row.translatedSummary).toEqual({ th: "เมย์เข้าชั้นเรียน", cn: "May joins a class.", tw: "May joins a class.", vi: "May joins a class." });
  });

  it("spreads sentence time over the words by word length", () => {
    const words = estimateWordTimes("May is new.", 3, 4);
    expect(words[0].start).toBe(3);
    expect(words[2].end).toBe(4);
    expect(words[0].end).toBe(words[1].start);
    expect(words[2].end - words[2].start).toBeGreaterThan(words[1].end - words[1].start);
  });

  it("maps the question bank with the answer index and the evidence", () => {
    const rows = toQuestionRows(samplePackage(), ID);
    expect(rows.mcq[1]).toEqual({ id: expect.any(String), articleId: ID, question: "Where does May live?", options: ["By the sea", "Next to the school", "In a city", "On a farm"], correctAnswer: 1, answer: "Next to the school", textualEvidence: "May lives next to the school.", order: 1 });
    expect(rows.saq[0]).toMatchObject({ answer: "Teacher Kim.", sampleAnswer: "Teacher Kim.", order: 0 });
    expect(rows.laq).toEqual([{ id: expect.any(String), articleId: ID, question: "Write about your class." }]);
  });

  it("refuses an MCQ whose answer is not an option", () => {
    const pkg = samplePackage();
    pkg.bank.mcq[0].answer = "Nobody";
    expect(() => toQuestionRows(pkg, ID)).toThrow(/not one of the options/);
  });

  it("maps the flashcard row in the shape Tutor reads", () => {
    const row = toFlashcardRow(samplePackage(), ID);
    expect(row.sentence).toEqual([{ sentence: "May lives next to the school.", translation: { th: "เมย์อาศัยอยู่ข้างโรงเรียน", cn: "May lives next to the school.", tw: "May lives next to the school.", vi: "May lives next to the school." }, timeSeconds: 0 }]);
    expect(row.words[0]).toEqual({ vocabulary: "hi", definition: { en: "A word you say when you meet a friend.", th: "สวัสดี", cn: "A word you say when you meet a friend.", tw: "A word you say when you meet a friend.", vi: "A word you say when you meet a friend." }, timeSeconds: 0 });
    expect(row.words[1].timeSeconds).toBe(1);
    expect(row.audioSentencesUrl).toBe(`audios/sentences/${ID}.mp3`);
    expect(row.wordsUrl).toBe(`audios/words/${ID}.mp3`);
  });

  it("keeps the teacher parts of the package and drops media and approvals", () => {
    const json = toLessonPackageJson(samplePackage());
    expect(Object.keys(json).sort()).toEqual(["activities", "bank", "glossary", "images", "print", "summary", "tags", "thaiSummary"]);
    expect(json.images).toEqual([{ position: "hero", caption: "May is new in the class." }]);
  });
});

describe("step map", () => {
  it("has 13 printed steps that cover app steps 1 to 14 except the writing step", () => {
    expect(WORKBOOK_STEPS).toHaveLength(13);
    const covered = WORKBOOK_STEPS.flatMap((step) => step.appSteps).sort((a, b) => a - b);
    expect(covered).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(workbookStepOf(10)?.step).toBe(9);
    expect(workbookStepOf(14)?.title).toBe("Lesson Reflection");
    expect(WORKBOOK_STEPS.find((step) => step.step === 11)?.appSteps).toEqual([]);
  });

  it("locks an app step until the teacher marks its printed step done", () => {
    expect(isAppStepUnlocked(7, [])).toBe(false);
    expect(isAppStepUnlocked(7, [7])).toBe(true);
    expect(isAppStepUnlocked(10, [9])).toBe(true);
    expect(isAppStepUnlocked(99, [])).toBe(true);
  });

  it("gives every question row an id so the objective links can name it", () => {
    let n = 0;
    const rows = toQuestionRows(samplePackage(), ID, () => `q-${++n}`);
    expect(rows.mcq.map((row) => row.id)).toEqual(["q-1", "q-2"]);
    expect(rows.saq[0].id).toBe("q-3");
    expect(rows.laq[0].id).toBe("q-4");
  });

  it("maps the package tags to article objective, question objective, and word node rows", () => {
    const rows = toQuestionRows(samplePackage(), ID, (() => { let n = 0; return () => `q-${++n}`; })());
    const tags = toTagRows(samplePackage(), ID, rows, { gse: "7344a27", vocabulary: "2daf568" });
    expect(tags.articleObjectives).toEqual([
      { articleId: ID, shortId: "R12.1", nodeId: "english.gse.skill.young.reading.12.can-read-cardinal-numbers-up-to-ten-writ", role: "target", graphRelease: "7344a27" },
      { articleId: ID, shortId: "L19.2", nodeId: "english.gse.skill.young.listening.19.can-identify-everyday-objects-people-or", role: "supporting", graphRelease: "7344a27" },
    ]);
    expect(tags.questionObjectives).toEqual([
      { articleId: ID, questionId: "q-1", questionType: "mcq", shortId: "L19.2", nodeId: "english.gse.skill.young.listening.19.can-identify-everyday-objects-people-or", graphRelease: "7344a27" },
      { articleId: ID, questionId: "q-3", questionType: "saq", shortId: "R12.1", nodeId: "english.gse.skill.young.reading.12.can-read-cardinal-numbers-up-to-ten-writ", graphRelease: "7344a27" },
      { articleId: ID, questionId: "q-3", questionType: "saq", shortId: "R10.2", nodeId: "english.gse.skill.young.reading.10.can-recognise-the-use-of-a-question-mark", graphRelease: "7344a27" },
    ]);
    expect(tags.wordNodes).toEqual([
      { articleId: ID, word: "hi", pos: "exclamation", nodeId: "english.vocabulary.skill.hi.exclamation", role: "glossed", graphRelease: "2daf568" },
      { articleId: ID, word: "new", pos: "adjective", nodeId: "english.vocabulary.skill.new.adjective", role: "glossed", graphRelease: "2daf568" },
    ]);
  });

  it("maps article-level tags without question rows for a linked legacy article", () => {
    const tags = toTagRows(samplePackage(), ID, null, { gse: "7344a27", vocabulary: "2daf568" });
    expect(tags.questionObjectives).toEqual([]);
    expect(tags.articleObjectives).toHaveLength(2);
  });

  it("reads the word and the part of speech from a vocabulary node id, including multi-segment forms", () => {
    const pkg = samplePackage({}, { tags: { targetObjectives: [], supportingObjectives: [], glossedNodes: ["english.vocabulary.skill.look-for.phrasal-verb", "english.vocabulary.skill.bat-as-sports-equipment.noun"], recycledNodes: ["english.vocabulary.skill.run.verb"] } });
    const tags = toTagRows(pkg, ID, null, { gse: "7344a27", vocabulary: "2daf568" });
    expect(tags.wordNodes.map((row) => [row.word, row.pos, row.role])).toEqual([
      ["look-for", "phrasal-verb", "glossed"],
      ["bat-as-sports-equipment", "noun", "glossed"],
      ["run", "verb", "recycled"],
    ]);
  });

  it("throws on a tag short id the key does not have, naming the package", () => {
    const pkg = samplePackage({}, { tags: { targetObjectives: ["R99.9"], supportingObjectives: [], glossedNodes: [], recycledNodes: [] } });
    expect(() => toTagRows(pkg, ID, null, { gse: "7344a27", vocabulary: "2daf568" })).toThrow(/o3-2\/1.*R99\.9/);
  });
});
