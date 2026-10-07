import { describe, expect, it } from "vitest";
import { snapshotSentenceEntries } from "./flashcard-snapshot";

describe("snapshotSentenceEntries", () => {
  it("reads the snapshot keys `sentence` and `translation`, so a lesson saves its sentences", () => {
    const entries = snapshotSentenceEntries(
      [
        { sentence: "Pip sees a big shadow.", timeSeconds: 0, translation: { th: "ปิ๊ปเห็นเงาใหญ่", cn: "皮普看到一个大影子。" } },
        { sentence: "This is a scary sound.", timeSeconds: 3.318 },
      ],
      "/audio/sentences.mp3",
    );
    expect(entries).toEqual([
      {
        cardSentence: "Pip sees a big shadow.",
        cardTranslation: { th: "ปิ๊ปเห็นเงาใหญ่", cn: "皮普看到一个大影子。", tw: "", vi: "" },
        cardStartTime: 0,
        cardEndTime: 3.318,
        cardAudioUrl: "/audio/sentences.mp3",
      },
      {
        cardSentence: "This is a scary sound.",
        cardTranslation: { th: "", cn: "", tw: "", vi: "" },
        cardStartTime: 3.318,
        cardEndTime: 13.318,
        cardAudioUrl: "/audio/sentences.mp3",
      },
    ]);
  });
});
