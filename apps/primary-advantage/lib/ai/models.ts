import { z } from "zod";
import { createAIClient, type AIClient, type AIProvider } from "@reading-advantage/ai";
import { logger } from "@/lib/observability/logger";

/** The AI tasks of Primary Advantage. The keys match the legacy `ai_task_configs.task_key` rows. */
export type PrimaryAiTask = "qa.feedback" | "chatbot.stream";

/** The settings of one AI task. */
export interface PrimaryAiTaskSetting {
  /** The task key, as the legacy `ai_task_configs` row. */
  task: PrimaryAiTask;
  /** The adapter provider. */
  provider: Extract<AIProvider, "vertex" | "openai">;
  /** The default model id. The `envVar` override replaces it. */
  defaultModel: string;
  /** The environment variable that overrides the model id. */
  envVar: string;
  /** The Vertex location (Vertex tasks only). */
  location?: string;
  /** The sampling temperature; undefined when the legacy row has none. */
  temperature?: number;
}

/**
 * The task settings. The values are the live legacy rows of the backup of 2026-10-11, except the
 * `qa.feedback` model: Vertex `gemini-3.5-flash-lite` (owner, manual test C3, 2026-10-14; the legacy
 * `gemini-3-flash-preview` took 29 s per answer). `chatbot.stream` is OpenAI `gpt-4o-mini`, and both
 * rows have no temperature.
 */
export const PRIMARY_AI_TASKS: Record<PrimaryAiTask, PrimaryAiTaskSetting> = {
  "qa.feedback": {
    task: "qa.feedback",
    provider: "vertex",
    defaultModel: "gemini-3.5-flash-lite",
    envVar: "PRIMARY_AI_FEEDBACK_MODEL",
    location: "global",
  },
  "chatbot.stream": {
    task: "chatbot.stream",
    provider: "openai",
    defaultModel: "gpt-4o-mini",
    envVar: "PRIMARY_AI_CHATBOT_MODEL",
  },
};

const modelIdSchema = z.string().regex(/^[A-Za-z0-9._:/-]+$/);

/**
 * Resolves the model id of a task: the override variable when set, else the default.
 * @param setting The task setting.
 * @returns The model id.
 * @throws When the override has a character that is not a letter, digit, `.`, `_`, `:`, `/`, or `-`.
 */
export function resolveModelId(setting: PrimaryAiTaskSetting): string {
  const override = process.env[setting.envVar];
  if (override === undefined || override === "") return setting.defaultModel;
  const parsed = modelIdSchema.safeParse(override);
  if (!parsed.success) {
    throw new Error(`${setting.envVar} is not a valid model id`);
  }
  return parsed.data;
}

const clients = new Map<string, AIClient>();

/**
 * Makes (or reuses) the adapter client of a task.
 * @param setting The task setting.
 * @returns The adapter client with the resolved model as its default model.
 */
function clientFor(setting: PrimaryAiTaskSetting): AIClient {
  const model = resolveModelId(setting);
  const key = `${setting.task}:${model}`;
  let client = clients.get(key);
  if (!client) {
    client =
      setting.provider === "vertex"
        ? createAIClient({
            provider: "vertex",
            model,
            location: setting.location,
            project: process.env.PROJECT_ID,
          })
        : createAIClient({ provider: setting.provider, model });
    clients.set(key, client);
  }
  return client;
}

/**
 * Gives the client for the answer feedback task (`qa.feedback`).
 * @returns The Vertex adapter client.
 */
export function feedbackClient(): AIClient {
  return clientFor(PRIMARY_AI_TASKS["qa.feedback"]);
}

/**
 * Gives the client for the lesson chatbot task (`chatbot.stream`).
 * @returns The OpenAI adapter client.
 */
export function chatbotClient(): AIClient {
  return clientFor(PRIMARY_AI_TASKS["chatbot.stream"]);
}

/**
 * Runs an AI call and logs `ai_call` with the task, the provider, the model, and the duration.
 * @param task The task key.
 * @param run The function that makes the call.
 * @returns The result of `run`.
 */
export async function loggedAiCall<T>(task: PrimaryAiTask, run: () => Promise<T>): Promise<T> {
  const setting = PRIMARY_AI_TASKS[task];
  const startedAt = Date.now();
  try {
    return await run();
  } catch (error) {
    logger.error("ai_call_failed", { task, provider: setting.provider, error });
    throw error;
  } finally {
    logger.info("ai_call", {
      task,
      provider: setting.provider,
      model: resolveModelId(setting),
      durationMs: Date.now() - startedAt,
    });
  }
}

/** Resets the client cache. Tests use it. */
export function resetPrimaryAiClients(): void {
  clients.clear();
}
