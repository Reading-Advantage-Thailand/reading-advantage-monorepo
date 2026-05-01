import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";

// const google = createGoogleGenerativeAI({
//   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
// });

const google = createVertex({
  project: process.env.PROJECT_ID,
  location: "us-central1",
  googleAuthOptions: {
    credentials: {
      client_email: process.env.VERTEX_CLIENT_EMAIL,
      private_key: process.env.VERTEX_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    },
  },
});

const googleModelLite = "gemini-2.5-flash-lite";
const googleModel = "gemini-2.5-flash";
const googleFlashThinking = "gemini-2.0-flash-thinking-exp-01-21";
const googleImages = "imagen-3.0-fast-generate-001";
const googleProPrewiew = "gemini-2.5-pro-preview-03-25";
const googleImage = "gemini-2.5-flash-image";

export {
  google,
  googleModel,
  googleImages,
  googleFlashThinking,
  googleModelLite,
  googleProPrewiew,
  googleImage,
};
