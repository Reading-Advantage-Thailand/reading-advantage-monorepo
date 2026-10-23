import { describe, expect, it } from "vitest";
import { loadStorytimeWeek, publishedWeek, storytimePart } from "../week";

const timepoint = (sentence: string, startTime: number, page: number) => ({
  sentence,
  startTime,
  endTime: startTime + 2,
  words: sentence.split(" ").map((word, i) => ({ word, start: startTime + i * 0.4, end: startTime + i * 0.4 + 0.3 })),
  page,
});

/** A published week in the Workbooks `storytime-week` v1 shape, with teacher fields the page must drop. */
const week = (over: Record<string, unknown> = {}) => ({
  version: 1,
  meta: { program: "storytime", shape: "storytime-week", level: 2, week: 1, unit: 1, key: "st2/1", kind: "teach", periodMinutes: 30, openingMinutes: 6, title: "Hello!", status: "published" },
  focus: { element: { id: "n", graphemes: ["n"], sound: "/n/", action: { en: "Nose", th: "" }, audio: "phonemes/daniel/04-n.mp3" }, paSkill: { en: "first sound n", th: "" }, frame: "I can see a ___." },
  books: [
    { kind: "readalong", title: "Hello!", pages: [{ text: "Hello, I am Pat.", image: { prompt: "Pat waves", characters: ["Pat"], caption: "", file: "l2/media/w01/book-1.png" } }, { text: "I am your teacher.", image: { prompt: "x", characters: [], caption: "" } }], audio: { file: "l2/media/w01/book.mp3", sentences: [timepoint("Hello, I am Pat.", 0, 1), timepoint("I am your teacher.", 3, 2)], slowSentences: [] }, backWords: ["hello"] },
    { kind: "decodable", soundBook: true, title: "n", pages: [{ text: "net" }], soundsPage: { element: "n", words: ["net"] }, audio: { sentences: [] } },
  ],
  song: {
    title: "Hello, I Am Pip",
    styleBrief: "teacher only",
    lines: [
      { text: "Hello, hello, I am Pip", part: "verse", gesture: "point to self", image: { prompt: "p", characters: ["Pip"], caption: "", file: "l2/media/w01/line-1.png" } },
      { text: "Hello, hello, I am Pip", part: "chorus", gesture: "wave", imageOf: 0 },
    ],
    audio: "l2/media/w01/song.mp3",
    video: "l2/media/w01/song.mp4",
    poster: "l2/media/w01/song-poster.jpg",
    times: [timepoint("Hello, hello, I am Pip", 11.4, 1)],
  },
  scripts: [{ teacher: "secret plan" }],
  home: { words: ["net", "nut", "nose"], line: { en: "Sing the song with your child.", th: "ร้องเพลงกับบุตรหลาน" }, activity: { en: "Find three things.", th: "หาของสามอย่าง" }, songUrl: "/th/st/2/1?part=song" },
  ...over,
});

const BUCKET = "https://storage.googleapis.com/primary-app-storage/storytime";

describe("publishedWeek (qr-page-spec section 8)", () => {
  it("gives the page fields with public URLs and drops the teacher content", () => {
    const out = publishedWeek(week(), 2, 1);
    expect(out?.title).toBe("Hello!");
    expect(out?.readalong.pages).toEqual([
      { text: "Hello, I am Pat.", picture: `${BUCKET}/l2/media/w01/book-1.png` },
      { text: "I am your teacher.", picture: null },
    ]);
    expect(out?.readalong.audio).toBe(`${BUCKET}/l2/media/w01/book.mp3`);
    expect(out?.readalong.sentences[1]).toMatchObject({ sentence: "I am your teacher.", page: 2 });
    expect(out?.decodable.sounds).toEqual({ element: "n", words: ["net"], tricky: [] });
    expect(out?.decodable.audio).toBeNull();
    expect([out?.readalong.blend, out?.decodable.blend]).toEqual([false, false]);
    expect(out?.mediaBase).toBe(`${BUCKET}/`);
    expect(out?.element).toEqual({ graphemes: ["n"], sound: "/n/", audio: `${BUCKET}/phonemes/daniel/04-n.mp3` });
    expect(out?.song?.lines.map((line) => line.picture)).toEqual([`${BUCKET}/l2/media/w01/line-1.png`, `${BUCKET}/l2/media/w01/line-1.png`]);
    expect(out?.song?.video).toBe(`${BUCKET}/l2/media/w01/song.mp4`);
    expect(out?.home?.line.th).toBe("ร้องเพลงกับบุตรหลาน");
    expect(JSON.stringify(out)).not.toContain("secret plan");
    expect(JSON.stringify(out)).not.toContain("teacher only");
  });

  it("gives null for a draft week, another week than the URL, or a bad package", () => {
    expect(publishedWeek(week({ meta: { ...week().meta, status: "draft" } }), 2, 1)).toBeNull();
    // A review week (Level 2 week 8) has no books and no song: 404, not an error.
    expect(publishedWeek(week({ meta: { ...week().meta, week: 8, kind: "review" }, books: [], song: undefined }), 2, 8)).toBeNull();
    expect(publishedWeek(week(), 2, 2)).toBeNull();
    expect(publishedWeek({ version: 2 }, 2, 1)).toBeNull();
    expect(publishedWeek(week({ song: { title: "x", lines: [] } }), 2, 1)).toBeNull();
  });

  it("needs exactly one book of each kind", () => {
    const [readalong, decodable] = week().books;
    expect(publishedWeek(week({ books: [readalong] }), 2, 1)).toBeNull();
    expect(publishedWeek(week({ books: [readalong, decodable, decodable] }), 2, 1)).toBeNull();
  });

  it("blends the words of a decodable book that is not a sound book", () => {
    const [readalong, decodable] = week().books;
    expect(publishedWeek(week({ books: [readalong, { ...decodable, soundBook: false }] }), 2, 1)?.decodable.blend).toBe(true);
  });

  it("refuses a media path that leaves the content folder", () => {
    expect(publishedWeek(week({ song: { ...week().song, video: "https://evil.example/x.mp4" } }), 2, 1)).toBeNull();
    expect(publishedWeek(week({ song: { ...week().song, video: "l2/../../x.mp4" } }), 2, 1)).toBeNull();
  });
});

describe("storytimePart", () => {
  it("reads book, decodable, and song, and nothing else", () => {
    expect(["book", "decodable", "song", "Song", undefined, ["song"]].map((value) => storytimePart(value as never))).toEqual(["book", "decodable", "song", null, null, null]);
  });
});

describe("loadStorytimeWeek", () => {
  const weeks = { "2/1": async () => week() };

  it("loads a published week by its URL segments", async () => {
    expect((await loadStorytimeWeek("2", "1", weeks))?.title).toBe("Hello!");
  });

  it("gives null for a missing week or a bad segment", async () => {
    expect(await loadStorytimeWeek("2", "99", weeks)).toBeNull();
    expect(await loadStorytimeWeek("5", "1", weeks)).toBeNull();
    expect(await loadStorytimeWeek("2", "1a", weeks)).toBeNull();
    // One address for each week: the QR code prints /st/2/1, so /st/2/01 gives 404.
    expect(await loadStorytimeWeek("2", "01", weeks)).toBeNull();
    expect(await loadStorytimeWeek("../2", "1", weeks)).toBeNull();
  });
});
