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
  /** Service account client email. Optional when Application Default Credentials serve the call. */
  clientEmail?: string;
  /**
   * Service account private key. Escaped "\\n" sequences become new lines.
   * Optional when Application Default Credentials serve the call.
   */
  privateKey?: string;
  /** Default model for text/object generation. */
  model?: string;
}

/**
 * AIClient implementation backed by Gemini on Vertex AI with a service
 * account. It reuses the Google provider methods; only the model factory differs.
 */
export class VertexProvider extends GoogleProvider {
  /**
   * @param config Project, location, optional service account credentials, and default model.
   *   When both credential values are present the client passes them to the
   *   factory. When they are absent the client passes no `credentials` object,
   *   so Application Default Credentials use the runtime service account (PM-3).
   */
  constructor(config: VertexProviderConfig) {
    const hasKeyPair = Boolean(config.clientEmail && config.privateKey);
    const client = createVertex({
      project: config.project,
      location: config.location,
      ...(hasKeyPair
        ? {
            googleAuthOptions: {
              credentials: {
                client_email: config.clientEmail as string,
                private_key: (config.privateKey as string).replace(/\\n/g, "\n"),
              },
            },
          }
        : {}),
    }) as unknown as GoogleModelFactory;
    super({ client, model: config.model, providerId: "vertex" });
  }
}
