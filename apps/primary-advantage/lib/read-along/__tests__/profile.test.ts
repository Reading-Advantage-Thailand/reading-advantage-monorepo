import { describe, expect, it } from "vitest";
import { classifySentence, profileArticles, tokenizeWords } from "../profile";

const sent = (sentence: string, words: string[]) => ({
  sentence,
  startTime: 0,
  endTime: 1,
  words: words.map((word, i) => ({ word, start: i, end: i + 1 })),
});

describe("tokenizeWords", () => {
  it("drops edge punctuation and keeps inner apostrophes and hyphens", () => {
    expect(tokenizeWords("“Don’t go,” she said — twice-a-day.")).toEqual(["Don’t", "go", "she", "said", "twice-a-day"]);
  });
});

describe("classifySentence", () => {
  it("flags an empty words array", () => {
    expect(classifySentence(sent("Hi there.", [])).tags).toContain("no-words");
  });
  it("flags a dropped audio word and an extra audio word", () => {
    expect(classifySentence(sent("A big red dog.", ["A", "big", "dog."])).tags).toContain("audio-dropped");
    expect(classifySentence(sent("A dog.", ["A", "big", "dog."])).tags).toContain("audio-extra");
  });
  it("flags curly quotes, contractions, digits, hyphens, and a same-count mismatch", () => {
    const tags = classifySentence(sent("“It’s 5-6 pm,” ok.", ["It", "is", "5", "6", "pm", "ok"])).tags;
    expect(tags).toEqual(expect.arrayContaining(["curly-quote", "contraction", "digit", "hyphen"]));
    expect(classifySentence(sent("It's me.", ["it's", "me."])).tags).toEqual(["contraction"]);
    expect(classifySentence(sent("Mia ran.", ["Mia", "run."])).tags).toContain("word-mismatch");
  });
});

describe("profileArticles", () => {
  it("counts articles, sentences, and tags", () => {
    const p = profileArticles([
      { id: "a", sentences: [sent("Hi.", ["Hi."]), sent("Yo.", [])] },
      { id: "b", sentences: null },
    ]);
    expect(p.articles).toBe(2);
    expect(p.withSentences).toBe(1);
    expect(p.sentences).toBe(2);
    expect(p.tagCounts["no-words"]).toBe(1);
    expect(p.articlesWithTag["no-words"]).toBe(1);
  });
});
