import type { SentenceEntry } from "@/actions/flashcard";

/** One sentence of an article snapshot (`sentencs_and_words_for_flashcard.sentence`), as all 622 Primary rows store it. */
export type SnapshotSentence = {
  sentence: string;
  translation?: Partial<SentenceEntry["cardTranslation"]>;
  timeSeconds: number;
};

/**
 * Turns the snapshot sentences of an article into the sentence entries that `saveFlashcard` stores.
 * Each audio window ends at the next sentence; the last one is 10 seconds long.
 * @param sentences The snapshot sentences in reading order.
 * @param audioUrl The sentence audio of the article.
 * @returns One entry for each sentence.
 */
export function snapshotSentenceEntries(sentences: SnapshotSentence[], audioUrl: string): SentenceEntry[] {
  return sentences.map((item, index) => ({
    cardSentence: item.sentence,
    cardTranslation: {
      th: item.translation?.th ?? "",
      cn: item.translation?.cn ?? "",
      tw: item.translation?.tw ?? "",
      vi: item.translation?.vi ?? "",
    },
    cardStartTime: item.timeSeconds,
    cardEndTime: index === sentences.length - 1 ? item.timeSeconds + 10 : sentences[index + 1]!.timeSeconds,
    cardAudioUrl: audioUrl,
  }));
}
