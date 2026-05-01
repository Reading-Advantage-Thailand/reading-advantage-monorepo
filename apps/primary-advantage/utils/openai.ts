import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiModel = "gpt-4o-mini";
const openaiModel4o = "gpt-4o";
const openaiImages = "dall-e-3";
const newModel = "gpt-5";

export { openai, openaiModel, openaiImages, openaiModel4o, newModel };
