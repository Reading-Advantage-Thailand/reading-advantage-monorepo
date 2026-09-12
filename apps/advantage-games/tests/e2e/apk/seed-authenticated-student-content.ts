import { loadEnvConfig } from "@next/env";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

loadEnvConfig(process.cwd());

const STUDENT_USERNAME = process.env.HOST_PROOF_TEST_USERNAME ?? "host-proof-reading-student";
const REQUIRED_FLASHCARDS = [
  { vocabulary: "bridge", definition: { en: "bridge", th: "สะพาน" } },
  { vocabulary: "forest", definition: { en: "forest", th: "ป่า" } },
  { vocabulary: "lantern", definition: { en: "lantern", th: "โคมไฟ" } },
  { vocabulary: "river", definition: { en: "river", th: "แม่น้ำ" } },
] as const;
const REQUIRED_SENTENCES = [
  { sentence: "The dragon crosses the bridge", translation: { en: "The dragon crosses the bridge", th: "มังกรข้ามสะพาน" } },
  { sentence: "A lantern glows in the forest", translation: { en: "A lantern glows in the forest", th: "โคมไฟส่องแสงในป่า" } },
] as const;

/**
 * Seeds only missing APK flashcards for an existing local host-proof student.
 * @param studentUsername Existing local fixture username that owns the content.
 * @returns A promise resolved after required vocabulary and sentences exist.
 */
export async function seedAuthenticatedStudentContent(
  studentUsername = STUDENT_USERNAME,
): Promise<void> {
  const { db, eq } = await import("@reading-advantage/db");
  const { users, userSentenceRecords, userWordRecords } = await import("@reading-advantage/db/schema");
  const [student] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, studentUsername))
    .limit(1);
  if (!student) {
    throw new Error(`Host-proof student ${studentUsername} does not exist`);
  }

  const existing = await db
    .select({ id: userWordRecords.id, word: userWordRecords.word })
    .from(userWordRecords)
    .where(eq(userWordRecords.userId, student.id));
  const existingByVocabulary = new Map(existing.flatMap(({ id, word }) => {
    if (typeof word !== "object" || word === null || !("vocabulary" in word)) return [];
    return typeof word.vocabulary === "string" ? [[word.vocabulary, { id, word }] as const] : [];
  }));
  const missing = REQUIRED_FLASHCARDS.filter(
    ({ vocabulary }) => !existingByVocabulary.has(vocabulary),
  );
  if (missing.length > 0) {
    await db.insert(userWordRecords).values(missing.map((word) => ({
      userId: student.id,
      word,
      saveToFlashcard: true,
    })));
  }
  for (const required of REQUIRED_FLASHCARDS) {
    const current = existingByVocabulary.get(required.vocabulary);
    if (!current) continue;
    const currentDefinition = "definition" in current.word
      && typeof current.word.definition === "object"
      && current.word.definition !== null
      ? current.word.definition
      : {};
    await db.update(userWordRecords).set({
      word: { ...current.word, definition: { ...currentDefinition, ...required.definition } },
    }).where(eq(userWordRecords.id, current.id));
  }

  const existingSentences = await db
    .select({ id: userSentenceRecords.id, sentence: userSentenceRecords.sentence })
    .from(userSentenceRecords)
    .where(eq(userSentenceRecords.userId, student.id));
  const existingSentenceText = new Set(existingSentences.map(({ sentence }) => sentence));
  const missingSentences = REQUIRED_SENTENCES.filter(
    ({ sentence }) => !existingSentenceText.has(sentence),
  );
  if (missingSentences.length > 0) {
    await db.insert(userSentenceRecords).values(missingSentences.map((record, index) => ({
      userId: student.id,
      sentence: record.sentence,
      translation: record.translation,
      sn: index + 1,
      timepoint: index * 10,
      endTimepoint: index * 10 + 5,
      saveToFlashcard: true,
    })));
  }
  for (const required of REQUIRED_SENTENCES) {
    const current = existingSentences.find(({ sentence }) => sentence === required.sentence);
    if (!current) continue;
    await db.update(userSentenceRecords)
      .set({ translation: required.translation })
      .where(eq(userSentenceRecords.id, current.id));
  }

  console.log(`APK host-proof flashcards ready for ${studentUsername}`);
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (executedPath === import.meta.url) {
  seedAuthenticatedStudentContent()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error("Failed to seed APK host-proof flashcards:", error);
      process.exit(1);
    });
}
