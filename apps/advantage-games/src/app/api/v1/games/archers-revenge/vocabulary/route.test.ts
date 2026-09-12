import { SAMPLE_VOCABULARY } from "@/lib/games/sampleVocabulary";

import { GET, dynamic } from "./route";

describe("archers-revenge vocabulary route", () => {
  it("serves the shared sample vocabulary for the game", async () => {
    expect(dynamic).toBe("force-static");

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe(200);
    expect(data.message).toBe("Vocabulary retrieved successfully");
    expect(data.vocabulary).toEqual(SAMPLE_VOCABULARY);
    expect(data.vocabulary).toHaveLength(25);
    expect(data.vocabulary.length).toBeGreaterThanOrEqual(15);
  });
});
