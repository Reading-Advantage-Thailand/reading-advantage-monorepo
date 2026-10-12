import { createVertex } from "@ai-sdk/google-vertex";
import { GoogleProvider, type GoogleModelFactory } from "./google.js";

/**
 * Configuration for the Vertex AI (Gemini) provider.
 */
export interface VertexProviderConfig {
  /** Google Cloud project id. */
  project: string;
  /** Vertex AI location, for example "global". */
  location: string;
  /** Service account client email. */
  clientEmail: string;
  /** Service account private key. Escaped "\\n" sequences become new lines. */
  privateKey: string;
  /** Default model for text/object generation. */
  model?: string;
}

/**
 * AIClient implementation backed by Gemini on Vertex AI with a service
 * account. It reuses the Google provider methods; only the model factory differs.
 */
export class VertexProvider extends GoogleProvider {
  /**
   * @param config Project, location, service account credentials, and default model.
   */
  constructor(config: VertexProviderConfig) {
    const client = createVertex({
      project: config.project,
      location: config.location,
      googleAuthOptions: {
        credentials: {
          client_email: config.clientEmail,
          private_key: config.privateKey.replace(/\\n/g, "\n"),
        },
      },
    }) as unknown as GoogleModelFactory;
    super({ client, model: config.model, providerId: "vertex" });
  }
}
