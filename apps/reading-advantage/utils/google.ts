import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";

// const google = createGoogleGenerativeAI({
//   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
// });

const google = createVertex({
  project: process.env.FIREBASE_PROJECT_ID,
  location: "us-central1",
  googleAuthOptions: {
    credentials: {
      client_email: process.env.VERTEX_CLIENT_EMAIL,
      private_key: process.env.VERTEX_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    },
  },
});

const googleModelAudio = "gemini-2.0-flash-lite";
const googleModel = "gemini-2.0-flash-001";
const googleFlashThinking = "gemini-2.0-flash-thinking-exp-01-21";
const googleImages = "imagen-4.0-generate-001";
const googleProPrewiew = "gemini-2.5-pro";

export {
  google,
  googleModel,
  googleImages,
  googleFlashThinking,
  googleModelAudio,
  googleProPrewiew,
};
