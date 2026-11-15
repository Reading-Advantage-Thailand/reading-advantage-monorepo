/**
 * Document extraction adapter of the track
 * `accounting_drive_intake_20261109` (plan task 4.4, spec section 5.3).
 *
 * The adapter implements the model-reader port of the backend accounting
 * module (`AccountingDocumentExtractionPort`) and the router that decides
 * between the local read and the model read. The Vertex route is the only
 * provider route of this file: the client comes from `createAIClient` of
 * `@reading-advantage/ai` with `provider: "vertex"`, and the credentials ride
 * the Application Default Credentials path of plan task 4.2 (PM-3). No
 * document bytes leave through another route.
 *
 * Routing (spec section 6, PM-4):
 * - A text PDF stays on the local reader and carries `extraction =
 *   "local-text"`.
 * - A non-text PDF goes to the model after the local read reports
 *   `needs-model`.
 * - A JPEG and a PNG go straight to the model.
 * - A workbook and a native sheet export never reach the model; the router
 *   refuses them with a `review:` reason.
 *
 * The model id comes from `ACCOUNTING_EXTRACTION_MODEL`. A reviewer-typed
 * value overrides a model value and carries `extraction = "human"`.
 */
import { z } from "zod";

import {
  createAIClient,
  type GenerateObjectFromMediaInput,
} from "@reading-advantage/ai";
import type {
  AccountingDocumentExtractionResult,
  AccountingDocumentLocalReaderPort,
  AccountingIntakeDraft,
} from "@reading-advantage/backend/accounting";

/**
 * Client configuration the adapter builds for the model reader. The project
 * comes from `PROJECT_ID` and the location from `VERTEX_LOCATION`.
 */
export interface DocumentExtractionClientConfig {
  /** Fixed provider route of this adapter. */
  readonly provider: "vertex";
  /** Project id of the Vertex route. */
  readonly project: string;
  /** Location of the Vertex route. */
  readonly location: string;
}

/**
 * Media-generation surface the adapter needs from a model client. The full
 * client of `@reading-advantage/ai` satisfies it; tests may inject a fake.
 */
export interface AccountingModelMediaClient {
  /**
   * Generates one structured object from a media payload.
   * @param input Structured media request of the adapter.
   * @returns The parsed object.
   */
  generateObjectFromMedia<T>(input: GenerateObjectFromMediaInput<T>): Promise<T>;
}

/** Options of the extraction adapter factory. Both members are optional. */
export interface DocumentExtractionOptions {
  /**
   * Builds the model client. It defaults to `createAIClient` with the Vertex
   * route of this file.
   */
  readonly createClient?: (
    config: DocumentExtractionClientConfig,
  ) => AccountingModelMediaClient;
  /** Local text and workbook reader port of the backend module. */
  readonly localReader?: AccountingDocumentLocalReaderPort;
}

/** One routed document read with its extraction marker. */
export interface DocumentExtractionReadResult {
  /** Draft the winning read produced. */
  readonly draft: AccountingIntakeDraft;
  /** Marker of the read: `local-text` or `model`. */
  readonly extraction: "local-text" | "model";
}

/** One document read request of the adapter. */
export interface DocumentExtractionReadRequest {
  /** Company scope of the read. */
  readonly companyId: string;
  /** MIME type of the document. */
  readonly mimeType: string;
  /** Bytes of the document. */
  readonly body: Uint8Array;
}

/** Adapter the factory returns: the router and the model-reader port. */
export interface DocumentExtractionAdapter {
  /** Routes one document and returns the draft with its marker. */
  readonly readDocument: (
    input: DocumentExtractionReadRequest,
  ) => Promise<DocumentExtractionReadResult>;
  /** Model-reader port of the backend module (model route only). */
  readonly extract: (
    input: DocumentExtractionReadRequest,
  ) => Promise<AccountingDocumentExtractionResult>;
}

/**
 * Draft schema of one model read. The draft shape is a passthrough object
 * here: the parsers of Phase 6 own the per-type validation.
 */
const extractionDraftSchema = z
  .object({})
  .passthrough() as z.ZodType<AccountingIntakeDraft>;

/** Prompt of one model read. The model returns the fields it can read. */
const EXTRACTION_PROMPT =
  "Read the document image or PDF and return the expense or payment fields " +
  "you can read. Return an empty string for every field you cannot read.";

/**
 * Reads the model id of one model read from the environment.
 * @returns The trimmed model id.
 * @throws When `ACCOUNTING_EXTRACTION_MODEL` is absent or blank.
 */
function readExtractionModelId(): string {
  const model = process.env.ACCOUNTING_EXTRACTION_MODEL?.trim() ?? "";
  if (model === "") {
    throw new Error("The extraction model id is not configured");
  }
  return model;
}

/**
 * Builds the model client from the injected builder or from `createAIClient`.
 * @param options Options of the adapter factory.
 * @returns The model client.
 */
function resolveModelClient(
  options: DocumentExtractionOptions,
): AccountingModelMediaClient {
  const config: DocumentExtractionClientConfig = {
    provider: "vertex",
    project: process.env.PROJECT_ID ?? "",
    location: process.env.VERTEX_LOCATION ?? "global",
  };
  return options.createClient
    ? options.createClient(config)
    : createAIClient(config);
}

/**
 * Copies one byte payload into a `Buffer` for the media call.
 * @param body Document bytes of the read.
 * @returns A `Buffer` with the same bytes.
 */
function toMediaBuffer(body: Uint8Array): Buffer {
  const buffer = Buffer.alloc(body.byteLength);
  buffer.set(body);
  return buffer;
}

/**
 * Creates the document extraction adapter. The model client is built lazily,
 * so a local-only read builds no client.
 * @param options Optional client builder and local reader.
 * @returns The adapter with `readDocument` and the `extract` port.
 */
export function createDocumentExtraction(
  options: DocumentExtractionOptions = {},
): DocumentExtractionAdapter {
  let client: AccountingModelMediaClient | null = null;

  /**
   * Reads one document through the model route.
   * @param input Company scope, MIME type, and file bytes.
   * @returns The model draft.
   * @throws When the model id is not configured or the client build fails.
   */
  async function readThroughModel(
    input: DocumentExtractionReadRequest,
  ): Promise<{ readonly draft: AccountingIntakeDraft }> {
    if (client === null) {
      client = resolveModelClient(options);
    }
    const draft = await client.generateObjectFromMedia({
      schema: extractionDraftSchema,
      prompt: EXTRACTION_PROMPT,
      media: { buffer: toMediaBuffer(input.body), mimeType: input.mimeType },
      model: readExtractionModelId(),
    });
    return { draft };
  }

  return {
    /**
     * Routes one document (spec section 6, PM-4). A non-image file reads
     * locally first; only a PDF with a `needs-model` result goes on, and a
     * workbook or sheet export is refused with a `review:` reason.
     * @param input Company scope, MIME type, and file bytes.
     * @returns The draft and its extraction marker.
     * @throws When the local reader is absent, the file type may not reach
     *   the model, or the local read returns no draft.
     */
    readDocument: async (input) => {
      const mimeType = input.mimeType;
      const lowerMimeType = mimeType.toLowerCase();
      if (!lowerMimeType.startsWith("image/")) {
        if (options.localReader === undefined) {
          throw new Error("The local document reader is not configured");
        }
        const local = await options.localReader.read({
          companyId: input.companyId,
          mimeType,
          body: input.body,
        });
        if (local.kind === "text") {
          if (local.draft === undefined) {
            throw new Error("review: the local read returned no draft");
          }
          return { draft: local.draft, extraction: "local-text" };
        }
        if (lowerMimeType !== "application/pdf") {
          throw new Error("review: the workbook needs a manual read");
        }
      }
      const model = await readThroughModel(input);
      return { draft: model.draft, extraction: "model" };
    },

    /**
     * Implements the model-reader port of the backend accounting module: one
     * model read of the document bytes, with no local attempt.
     * @param input Company scope, MIME type, and file bytes.
     * @returns The model read result.
     */
    extract: (input) => readThroughModel(input),
  };
}

/**
 * Overrides the model values of one draft with the values a reviewer typed.
 * The result carries the `human` extraction marker; a value the reviewer did
 * not type keeps its model value, including an empty one.
 * @param input The draft of the read and the typed values.
 * @returns The merged draft and the `human` marker.
 */
export function applyReviewerValues(input: {
  readonly draft: Readonly<Record<string, unknown>>;
  readonly values: Readonly<Record<string, string>>;
}): { readonly draft: Record<string, unknown>; readonly extraction: "human" } {
  return {
    draft: { ...input.draft, ...input.values },
    extraction: "human",
  };
}
