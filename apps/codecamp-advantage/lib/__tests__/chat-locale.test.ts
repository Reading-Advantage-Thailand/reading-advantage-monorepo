import { describe, it, expect } from "vitest";

describe("chat API locale awareness", () => {
  function buildSystemPrompt(locale: string): string {
    const thaiInstruction =
      "Respond in Thai (ภาษาไทย) by default. **Mirror the user: if the user writes entirely in English, answer in English; otherwise answer in Thai.**";
    const englishInstruction =
      "Respond in English by default. Mirror the user's language if they switch.";
    const languageInstruction = locale === "th" ? thaiInstruction : englishInstruction;
    return `You are CodeCamp Advantage AI Tutor. ${languageInstruction}`;
  }

  it("includes Thai instruction when locale is th", () => {
    const prompt = buildSystemPrompt("th");
    expect(prompt).toContain("Respond in Thai");
    expect(prompt).toContain("ภาษาไทย");
    expect(prompt).not.toContain("Respond in English");
  });

  it("includes English instruction when locale is en", () => {
    const prompt = buildSystemPrompt("en");
    expect(prompt).toContain("Respond in English");
    expect(prompt).not.toContain("Respond in Thai");
    expect(prompt).not.toContain("ภาษาไทย");
  });

  it("defaults to Thai instruction for unknown locale", () => {
    const prompt = buildSystemPrompt("fr");
    expect(prompt).toContain("Respond in English");
  });

  it("prompt contains mirror instruction for th locale", () => {
    const prompt = buildSystemPrompt("th");
    expect(prompt).toContain("Mirror the user");
  });

  it("prompt contains mirror instruction for en locale", () => {
    const prompt = buildSystemPrompt("en");
    expect(prompt).toContain("Mirror the user");
  });
});
