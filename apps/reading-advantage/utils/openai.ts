import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiModel = "gpt-4o-mini";
const openaiModel4o = "gpt-4o";
const openaiModel5 = "gpt-5";
const openaiImages = "dall-e-3";

export { openai, openaiModel, openaiImages, openaiModel4o, openaiModel5 };