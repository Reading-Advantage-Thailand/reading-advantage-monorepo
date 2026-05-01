import { generateObject } from "ai";
import { openai, openaiModel4o } from "@/utils/openai";
import { z } from "zod";

const StoryBibleSchema = z.object({
  mainPlot: z.object({
    premise: z.string(),
    exposition: z.string(),
    risingAction: z.string(),
    climax: z.string(),
    fallingAction: z.string(),
    resolution: z.string(),
  }),
  characters: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      background: z.string(),
      speechPatterns: z.string(),
      arc: z
        .object({
          startingState: z.string(),
          development: z.string(),
          endState: z.string(),
        })
        .optional()
        .default({
          startingState: "No major change",
          development: "No significant development",
          endState: "Character remains largely the same",
        }),
      relationships: z
        .array(
          z.object({
            withCharacter: z.string(),
            nature: z.string(),
            evolution: z.string(),
          })
        )
        .optional()
        .default([]),
    })
  ),
  setting: z.object({
    time: z.string(),
    places: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        significance: z.string(),
      })
    ),
    worldRules: z.array(z.string()),
  }),
  themes: z.array(
    z.object({
      theme: z.string(),
      development: z.string(),
    })
  ),
  summary: z.string(),
  "image-description": z.string(),
});

export async function generateStoryBible({
  topic,
  genre,
  subgenre,
}: {
  topic: string;
  genre: string;
  subgenre: string;
}) {
  //console.log("Generating StoryBible using AI for:", {
  //  topic,
  //  genre,
  //  subgenre,
  //});

  try {
    const prompt = `
      Generate a structured Story Bible for a ${genre} story in the ${subgenre} subgenre. The story is about "${topic}".
      The output should include:
      - A complete main plot structure with premise, exposition, rising action, climax, falling action, and resolution.
      - A detailed list of characters with full descriptions, backgrounds, speech patterns, character arcs, and well-defined relationships with at least one other character in the story.
      - The setting, including time period, significant locations with descriptions, and world rules.
      - The themes explored in the story and how they develop.
      - A concise one-sentence summary of the story.
      - A detailed image description related to the story summary.
      Ensure the output is structured correctly based on the provided schema.
    `;

    const response = await generateObject({
      model: openai(openaiModel4o),
      schema: StoryBibleSchema,
      prompt,
      temperature: 1,
    });

    return response.object;
  } catch (error) {
    console.error("Failed to generate StoryBible:", error);
    throw new Error("AI failed to generate StoryBible");
  }
}
