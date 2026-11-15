// @vitest-environment node
/**
 * Red tests for the extraction adapter of the track
 * `accounting_drive_intake_20261109` (plan task 4.3).
 *
 * The adapter module `apps/accounting/app/lib/document-extraction.ts` does not
 * exist yet. Every row loads it through a soft loader. A row fails on the
 * message `The extraction adapter module
 * apps/accounting/app/lib/document-extraction.ts is missing`, or on the
 * missing export of the factory. The test file loads without any other error.
 *
 * This file pins the contract of the adapter.
 *
 * - The module exports `createDocumentExtraction(options)`. The options hold
 *   `createClient` and `localReader`, and both are optional. `createClient`
 *   builds the AI client and defaults to `createAIClient` of
 *   `@reading-advantage/ai`. `localReader` is the local reader port of the
 *   backend module.
 * - The factory returns `{ readDocument, extract }`. `readDocument` routes one
 *   document and returns `{ draft, extraction }`. `extract` is the extraction
 *   port of the backend module.
 * - The model id comes from `ACCOUNTING_EXTRACTION_MODEL`.
 * - The module exports `applyReviewerValues({ draft, values })`. It returns
 *   `{ draft, extraction: "human" }`.
 *
 * Labels of the phase: `model_paths=3`, `local_paths=2`,
 * `provider_route_cases>=6`, and `real_model_calls=0`.
 *
 * Every client is the fake `MockProvider` of `@reading-advantage/ai`. No test
 * calls a real model, opens a network connection, or reads a credential. The
 * project id, the location, the company id, the document bytes, and the
 * amounts are fakes.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  MockProvider,
  type GenerateObjectFromMediaInput,
  type GenerateObjectInput,
} from "@reading-advantage/ai";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/** URL of the adapter module under test. */
const ADAPTER_URL = new URL("../document-extraction.ts", import.meta.url);
/** Path of the adapter module under test. */
const ADAPTER_PATH = fileURLToPath(ADAPTER_URL);
/** Message of the missing adapter module. */
const MISSING_MODULE =
  "The extraction adapter module apps/accounting/app/lib/document-extraction.ts is missing";
/** Message of the missing factory export. */
const MISSING_FACTORY =
  "The extraction adapter module exports no createDocumentExtraction factory";
/** Message of the missing reviewer merge export. */
const MISSING_MERGE =
  "The extraction adapter module exports no applyReviewerValues function";
/** Fake company id of every row. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Fake model id read from `ACCOUNTING_EXTRACTION_MODEL`. */
const FAKE_MODEL_ID = "fake-extraction-model";
/** Fake project id; no real project enters this file. */
const FAKE_PROJECT_ID = "fake-vertex-project";
/** Fake location of the vertex route. */
const FAKE_LOCATION = "fake-location";
/** MIME type of a text PDF. */
const PDF_MIME = "application/pdf";
/** MIME type of a JPEG receipt. */
const JPEG_MIME = "image/jpeg";
/** MIME type of a PNG receipt. */
const PNG_MIME = "image/png";
/** MIME type of a native Google Sheet. */
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
/** Fake bytes of a text PDF, made in the test. */
const TEXT_PDF_BYTES = new TextEncoder().encode(
  "%PDF-1.7\nfake text layer of a payment voucher\n",
);
/** Fake bytes of a JPEG receipt, made in the test. */
const JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
/** Fake bytes of a PNG receipt, made in the test. */
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
/** Fake bytes of a Google Sheet export, made in the test. */
const SHEET_BYTES = new TextEncoder().encode("fake sheet export bytes");
/** Banned provider tokens of the route detector (A7: a fixed token list). */
const BANNED_PROVIDER_TOKENS = ["openrouter", "aliyun", "qwen", "openai"];
/**
 * The six draft keys the backend `toSubmissionInput` needs, named in the
 * schema and in the prompt of every model read (Review A A401).
 */
const INTAKE_DRAFT_KEYS = [
  "payee",
  "amountMinor",
  "currency",
  "kind",
  "category",
  "description",
] as const;
/** Currencies the business settles; the contract enum of the draft. */
const SETTLED_CURRENCIES = ["THB", "USD", "JPY"] as const;
/** Config keys the ADC route must never pass to the client builder. */
const FORBIDDEN_CLIENT_CONFIG_KEYS = [
  "credentials",
  "clientEmail",
  "privateKey",
  "googleAuthOptions",
] as const;

/**
 * Spy of the real `createAIClient` export. It stands in for the default client
 * path of the adapter, which every other row bypasses with `createClient`.
 */
const aiClientBuild = vi.hoisted(() => ({ spy: vi.fn() }));

vi.mock("@reading-advantage/ai", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createAIClient: (config: unknown) => aiClientBuild.spy(config),
  };
});

/** One recorded call of the fake client. */
interface FakeCall {
  /** Method the adapter called. */
  readonly method: "generateObject" | "generateObjectFromMedia";
  /** Model id the adapter passed, when any. */
  readonly model: string | null;
  /** Schema the adapter passed. */
  readonly schema: unknown;
  /** Prompt the adapter passed. */
  readonly prompt: string;
  /** Document bytes of a media call, when any. */
  readonly mediaBuffer: Uint8Array | null;
  /** MIME type of a media call, when any. */
  readonly mediaMimeType: string | null;
}

/** One read request of the adapter. */
interface ReadRequest {
  /** Company scope of the read. */
  readonly companyId: string;
  /** MIME type of the document. */
  readonly mimeType: string;
  /** Bytes of the document. */
  readonly body: Uint8Array;
}

/** Result of one routed read. */
interface ReadResult {
  /** Draft of the read. */
  readonly draft: Readonly<Record<string, unknown>>;
  /** Marker of the read. */
  readonly extraction: string;
}

/** Adapter shape the rows pin. */
interface Adapter {
  /** Routes one document and returns the draft with its marker. */
  readDocument(input: ReadRequest): Promise<ReadResult>;
  /** Implements the extraction port of the backend module. */
  extract(
    input: ReadRequest,
  ): Promise<{ readonly draft?: Readonly<Record<string, unknown>> }>;
}

/** Factory shape the rows pin. */
type CreateDocumentExtraction = (options?: {
  readonly createClient?: (
    config: Readonly<Record<string, unknown>>,
  ) => unknown;
  readonly localReader?: unknown;
}) => Adapter;

/** Fake AI client. It extends `MockProvider` and records every call. */
class FakeVertexClient extends MockProvider {
  /** Every call this fake served. */
  readonly recorded: FakeCall[] = [];

  /**
   * Builds a fake client with one canned draft.
   * @param canned Draft the fake returns for every call.
   */
  constructor(private readonly canned: Readonly<Record<string, unknown>>) {
    super({});
  }

  /**
   * Serves one structured object call with the canned draft.
   * @param input Structured generation request of the adapter.
   * @returns The canned draft.
   */
  override async generateObject<T>(input: GenerateObjectInput<T>): Promise<T> {
    this.recorded.push({
      method: "generateObject",
      model: input.model ?? null,
      schema: input.schema,
      prompt: input.prompt,
      mediaBuffer: null,
      mediaMimeType: null,
    });
    return this.canned as unknown as T;
  }

  /**
   * Serves one media call with the canned draft.
   * @param input Media request of the adapter.
   * @returns The canned draft.
   */
  override async generateObjectFromMedia<T>(
    input: GenerateObjectFromMediaInput<T>,
  ): Promise<T> {
    this.recorded.push({
      method: "generateObjectFromMedia",
      model: input.model ?? null,
      schema: input.schema,
      prompt: input.prompt,
      mediaBuffer: new Uint8Array(input.media.buffer),
      mediaMimeType: input.media.mimeType,
    });
    return this.canned as unknown as T;
  }
}

/** Counters of the labeled route cases. */
const routeCounts = {
  /** Local paths of the phase. */
  localPaths: 0,
  /** Model paths of the phase. */
  modelPaths: 0,
  /** Provider route cases of the phase. */
  providerRouteCases: 0,
};

/** Counters of the model draft contract rows (Review A A401, A402, B401). */
const draftContractCounts = {
  /** Draft keys the schema and the prompt named. */
  schemaKeys: 0,
  /** Contract cases of the draft schema. */
  contractCases: 0,
  /** Out-of-schema adversarial cases. */
  adversarialRows: 0,
  /** Default client route cases. */
  defaultRouteRows: 0,
  /** Blank or absent model id cases. */
  blankModelIdCases: 0,
};

/** Model calls the fakes served. */
let fakeModelCalls = 0;

/** Calls of the network stub. */
const networkCalls: unknown[][] = [];

/** Stub of the network. A real model call lands here. */
const fakeFetch = vi.fn((...args: unknown[]) => {
  networkCalls.push(args);
  throw new Error("A test must not reach the network");
});

beforeAll(() => {
  vi.stubEnv("ACCOUNTING_EXTRACTION_MODEL", FAKE_MODEL_ID);
  vi.stubEnv("PROJECT_ID", FAKE_PROJECT_ID);
  vi.stubEnv("VERTEX_LOCATION", FAKE_LOCATION);
  vi.stubGlobal("fetch", fakeFetch);
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/**
 * Loads the adapter module without a static import.
 * @returns The module, or null when the module does not load.
 */
async function loadAdapterModule(): Promise<Record<string, unknown> | null> {
  try {
    return (await import(
      /* @vite-ignore */ ADAPTER_URL.href
    )) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Loads the adapter module and asserts that the file exists.
 * @returns The module.
 * @throws When the module file is missing or does not load.
 */
async function requireAdapterModule(): Promise<Record<string, unknown>> {
  expect(existsSync(ADAPTER_PATH), MISSING_MODULE).toBe(true);
  const module = await loadAdapterModule();
  expect(module, MISSING_MODULE).not.toBeNull();
  if (module === null) {
    throw new Error(MISSING_MODULE);
  }
  return module;
}

/**
 * Resolves the factory export of the adapter module.
 * @param module Loaded adapter module.
 * @returns The factory.
 * @throws When the export is absent.
 */
function requireFactory(
  module: Readonly<Record<string, unknown>>,
): CreateDocumentExtraction {
  const factory = module["createDocumentExtraction"];
  expect(typeof factory, MISSING_FACTORY).toBe("function");
  if (typeof factory !== "function") {
    throw new Error(MISSING_FACTORY);
  }
  return factory as CreateDocumentExtraction;
}

/**
 * Resolves the reviewer merge export of the adapter module.
 * @param module Loaded adapter module.
 * @returns The merge function.
 * @throws When the export is absent.
 */
function requireReviewerMerge(
  module: Readonly<Record<string, unknown>>,
): (input: {
  readonly draft: Readonly<Record<string, unknown>>;
  readonly values: Readonly<Record<string, string>>;
}) => { readonly draft: Record<string, unknown>; readonly extraction: string } {
  const merge = module["applyReviewerValues"];
  expect(typeof merge, MISSING_MERGE).toBe("function");
  if (typeof merge !== "function") {
    throw new Error(MISSING_MERGE);
  }
  return merge as unknown as (
    input: {
      readonly draft: Readonly<Record<string, unknown>>;
      readonly values: Readonly<Record<string, string>>;
    },
  ) => { readonly draft: Record<string, unknown>; readonly extraction: string };
}

/**
 * Builds a fake local reader with one fixed result.
 * @param result Read result the fake returns.
 * @returns The fake port and its call log.
 */
function createFakeLocalReader(result: Readonly<Record<string, unknown>>): {
  readonly calls: string[];
  readonly port: {
    read(input: { readonly mimeType: string }): Promise<
      Readonly<Record<string, unknown>>
    >;
  };
} {
  const calls: string[] = [];
  return {
    calls,
    port: {
      async read(input: { readonly mimeType: string }) {
        calls.push(input.mimeType);
        return result;
      },
    },
  };
}

/**
 * Builds one adapter with a fake client and an optional fake local reader.
 * @param canned Draft the fake client returns.
 * @param localReader Optional fake local reader result.
 * @returns The adapter, the fake client, the client configs, the local reader.
 */
function buildAdapter(
  canned: Readonly<Record<string, unknown>>,
  localReader?: Readonly<Record<string, unknown>>,
): {
  readonly adapter: Adapter;
  readonly client: FakeVertexClient;
  readonly configs: Array<Readonly<Record<string, unknown>>>;
  readonly localCalls: string[];
} {
  const factory = requireFactoryForRows();
  const client = new FakeVertexClient(canned);
  const configs: Array<Readonly<Record<string, unknown>>> = [];
  const local = localReader
    ? createFakeLocalReader(localReader)
    : createFakeLocalReader({ kind: "needs-model" });
  const adapter = factory({
    createClient: (config) => {
      configs.push(config);
      return client;
    },
    localReader: local.port,
  });
  return { adapter, client, configs, localCalls: local.calls };
}

/**
 * Reads the property names a Zod object schema declares.
 * @param schema Schema the adapter passed to the client.
 * @returns The declared key names, or an empty list for a non-object schema.
 */
function readDeclaredKeys(schema: unknown): string[] {
  if (schema === null || typeof schema !== "object") {
    return [];
  }
  const shape = (schema as { readonly shape?: unknown }).shape;
  if (shape === null || typeof shape !== "object") {
    return [];
  }
  return Object.keys(shape as Record<string, unknown>);
}

/**
 * Returns the `safeParse` member of a schema.
 * @param schema Schema the adapter passed to the client.
 * @returns The parse function, bound to the schema.
 * @throws When the schema holds no `safeParse` member.
 */
function requireSafeParse(
  schema: unknown,
): (input: unknown) => { readonly success: boolean } {
  const parse = (schema as { readonly safeParse?: unknown } | null)?.safeParse;
  expect(typeof parse, "schema_safe_parse").toBe("function");
  if (typeof parse !== "function") {
    throw new Error("The model schema holds no safeParse member");
  }
  return (parse as (input: unknown) => { readonly success: boolean }).bind(
    schema,
  );
}

/** Factory resolved by the row that needs it. */
let loadedFactory: CreateDocumentExtraction | null = null;
/**
 * Returns the factory of a row, after the row loaded the module.
 * @returns The factory of the adapter module.
 * @throws When the factory is absent.
 */
function requireFactoryForRows(): CreateDocumentExtraction {
  if (loadedFactory === null) {
    throw new Error(MISSING_FACTORY);
  }
  return loadedFactory;
}

/**
 * Loads the module and pins the factory for one row.
 * @returns The loaded adapter module.
 */
async function loadForRow(): Promise<Record<string, unknown>> {
  const module = await requireAdapterModule();
  loadedFactory = requireFactory(module);
  return module;
}

describe("document extraction adapter", () => {
  it("routes a text PDF to the local reader and never calls the client", async () => {
    await loadForRow();
    const build = buildAdapter(
      { payee: "Fake Vendor" },
      { kind: "text", draft: { payee: "Fake Vendor", amountMinor: "10000" } },
    );

    const result = await build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PDF_MIME,
      body: TEXT_PDF_BYTES,
    });

    expect(build.client.recorded.length, "local_paths client calls").toBe(0);
    expect(build.localCalls).toEqual([PDF_MIME]);
    expect(result.extraction).toBe("local-text");
    expect(result.draft["payee"]).toBe("Fake Vendor");
    expect(build.configs.length, "local_paths client builds").toBe(0);
    routeCounts.localPaths += 1;
    routeCounts.providerRouteCases += 1;
  });

  it("refuses a Google Sheets voucher without calling the client", async () => {
    await loadForRow();
    const build = buildAdapter({ payee: "Fake Vendor" });

    const read = build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: SHEET_MIME,
      body: SHEET_BYTES,
    });

    await expect(read).rejects.toThrow(/review:/u);
    expect(build.client.recorded.length, "local_paths client calls").toBe(0);
    expect(build.configs.length, "local_paths client builds").toBe(0);
    routeCounts.localPaths += 1;
    routeCounts.providerRouteCases += 1;
  });

  it("routes a non-text PDF to the client and marks the draft model", async () => {
    await loadForRow();
    const canned = { payee: "Fake Vendor", amountMinor: "10000" };
    const build = buildAdapter(canned, { kind: "needs-model" });

    const result = await build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PDF_MIME,
      body: TEXT_PDF_BYTES,
    });

    expect(build.localCalls).toEqual([PDF_MIME]);
    expect(build.client.recorded.length, "model_paths client calls").toBe(1);
    expect(result.extraction).toBe("model");
    expect(result.draft["payee"]).toBe("Fake Vendor");
    expect(result.draft["amountMinor"]).toBe("10000");
    const call = build.client.recorded[0];
    expect(call?.model, "ACCOUNTING_EXTRACTION_MODEL").toBe(FAKE_MODEL_ID);
    expect(call?.mediaMimeType).toBe(PDF_MIME);
    expect(call?.mediaBuffer).toEqual(TEXT_PDF_BYTES);
    fakeModelCalls += build.client.recorded.length;
    routeCounts.modelPaths += 1;
    routeCounts.providerRouteCases += 1;
  });

  it("routes a JPEG receipt to the client and marks the draft model", async () => {
    await loadForRow();
    const build = buildAdapter({ payee: "Fake Vendor" });

    const result = await build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: JPEG_MIME,
      body: JPEG_BYTES,
    });

    expect(build.client.recorded.length, "model_paths client calls").toBe(1);
    expect(build.localCalls.length, "image local reads").toBe(0);
    expect(result.extraction).toBe("model");
    expect(build.client.recorded[0]?.mediaMimeType).toBe(JPEG_MIME);
    expect(build.client.recorded[0]?.mediaBuffer).toEqual(JPEG_BYTES);
    fakeModelCalls += build.client.recorded.length;
    routeCounts.modelPaths += 1;
    routeCounts.providerRouteCases += 1;
  });

  it("routes a PNG receipt to the client and marks the draft model", async () => {
    await loadForRow();
    const build = buildAdapter({ payee: "Fake Vendor" });

    const result = await build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    expect(build.client.recorded.length, "model_paths client calls").toBe(1);
    expect(build.localCalls.length, "image local reads").toBe(0);
    expect(result.extraction).toBe("model");
    expect(build.client.recorded[0]?.mediaMimeType).toBe(PNG_MIME);
    expect(build.client.recorded[0]?.mediaBuffer).toEqual(PNG_BYTES);
    fakeModelCalls += build.client.recorded.length;
    routeCounts.modelPaths += 1;
    routeCounts.providerRouteCases += 1;
  });

  it("keeps a value the model returned empty and marks a reviewer value human", async () => {
    const module = await loadForRow();
    const merge = requireReviewerMerge(module);
    const build = buildAdapter({ payee: "", amountMinor: "" });

    const result = await build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    expect(result.extraction).toBe("model");
    expect(result.draft["payee"]).toBe("");
    expect(result.draft["amountMinor"]).toBe("");

    const merged = merge({
      draft: result.draft,
      values: { amountMinor: "12345" },
    });

    expect(merged.extraction).toBe("human");
    expect(merged.draft["amountMinor"]).toBe("12345");
    expect(merged.draft["payee"]).toBe("");
    fakeModelCalls += build.client.recorded.length;
  });

  it("builds the client from the vertex route and passes the document bytes", async () => {
    await loadForRow();
    const factory = requireFactoryForRows();
    const configs: Array<Readonly<Record<string, unknown>>> = [];
    const client = new FakeVertexClient({ payee: "Fake Vendor" });
    const adapter = factory({
      createClient: (config) => {
        configs.push(config);
        return client;
      },
    });

    await adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    expect(configs.length, "vertex client builds").toBe(1);
    expect(configs[0]?.["provider"], "provider route").toBe("vertex");
    expect(typeof adapter.extract).toBe("function");
    expect(client.recorded.length, "vertex client calls").toBe(1);
    expect(client.recorded[0]?.mediaBuffer).toEqual(PNG_BYTES);
    fakeModelCalls += client.recorded.length;

    const localConfigs: unknown[] = [];
    const local = createFakeLocalReader({
      kind: "text",
      draft: { payee: "Fake Vendor" },
    });
    const localAdapter = factory({
      createClient: (config) => {
        localConfigs.push(config);
        return new FakeVertexClient({});
      },
      localReader: local.port,
    });
    await localAdapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PDF_MIME,
      body: TEXT_PDF_BYTES,
    });

    expect(localConfigs.length, "local_paths client builds").toBe(0);
    routeCounts.providerRouteCases += 1;
  });

  it("imports no AI SDK and names no provider other than vertex", async () => {
    await loadForRow();
    const source = readFileSync(ADAPTER_PATH, "utf8");

    const sdkImports = source.match(/@ai-sdk\//gu)?.length ?? 0;
    expect(sdkImports, "direct SDK imports").toBe(0);

    const lower = source.toLowerCase();
    const bannedHits = BANNED_PROVIDER_TOKENS.filter((token) =>
      lower.includes(token),
    );
    expect(bannedHits, "banned provider tokens").toEqual([]);

    expect(source).toMatch(/provider\s*:\s*["']vertex["']/u);
    expect(source).toMatch(/createAIClient/u);
    routeCounts.providerRouteCases += 1;
  });

  it("names the intake draft keys in the model schema and in the prompt", async () => {
    await loadForRow();
    const build = buildAdapter({
      payee: "Fake Vendor",
      amountMinor: "10000",
      currency: "THB",
    });

    await build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    expect(build.client.recorded.length, "model_paths client calls").toBe(1);
    const call = build.client.recorded[0];
    expect(call, "model_call_recorded").toBeDefined();
    if (call === undefined) {
      return;
    }
    const declared = readDeclaredKeys(call.schema);
    const prompt = call.prompt.toLowerCase();
    for (const key of INTAKE_DRAFT_KEYS) {
      expect(declared, `draft_schema_key:${key}`).toContain(key);
      expect(prompt, `draft_prompt_key:${key}`).toContain(key.toLowerCase());
    }
    expect(declared.length, "draft_schema_keys").toBeGreaterThanOrEqual(
      INTAKE_DRAFT_KEYS.length,
    );
    draftContractCounts.schemaKeys = INTAKE_DRAFT_KEYS.length;
    fakeModelCalls += build.client.recorded.length;
  });

  it("accepts the draft keys and rejects a wrong-type amount and currency", async () => {
    await loadForRow();
    const build = buildAdapter({ payee: "Fake Vendor" });

    await build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    const call = build.client.recorded[0];
    expect(call, "model_call_recorded").toBeDefined();
    if (call === undefined) {
      return;
    }
    const parse = requireSafeParse(call.schema);

    const valid = parse({
      kind: "expense",
      payee: "Fake Vendor",
      category: "supplies",
      description: "fake row",
      amountMinor: "10000",
      currency: "THB",
    });
    expect(valid.success, "valid_draft_parses").toBe(true);
    draftContractCounts.contractCases += 1;

    expect(parse({}).success, "empty_draft_parses").toBe(true);
    draftContractCounts.contractCases += 1;

    expect(parse({ amountMinor: 10000 }).success, "number_amount_rejected").toBe(
      false,
    );
    expect(parse({ amountMinor: null }).success, "null_amount_rejected").toBe(
      false,
    );
    expect(parse({ currency: "XYZ" }).success, "unknown_currency_rejected").toBe(
      false,
    );
    draftContractCounts.contractCases += 3;

    for (const currency of SETTLED_CURRENCIES) {
      const parsed = parse({ amountMinor: "10000", currency });
      expect(parsed.success, `settled_currency:${currency}`).toBe(true);
    }
    fakeModelCalls += build.client.recorded.length;
  });

  it("does not mark a model draft that falls outside the schema", async () => {
    await loadForRow();
    const build = buildAdapter({ payee: 42, amountMinor: 42 });

    const read = build.adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });
    const outcome = await read.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );

    expect(build.client.recorded.length, "out_of_schema_client_calls").toBe(1);
    expect(outcome.ok, "out_of_schema_draft_rejected").toBe(false);
    if (outcome.ok === false) {
      expect(outcome.error, "out_of_schema_error").toBeInstanceOf(Error);
    }
    draftContractCounts.adversarialRows += 1;
    fakeModelCalls += build.client.recorded.length;
  });

  it("builds the default client from the vertex route with no credentials", async () => {
    await loadForRow();
    const client = new FakeVertexClient({ payee: "Fake Vendor" });
    aiClientBuild.spy.mockReset();
    aiClientBuild.spy.mockReturnValue(client);
    const factory = requireFactoryForRows();
    const local = createFakeLocalReader({ kind: "needs-model" });
    const adapter = factory({ localReader: local.port });

    await adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    expect(aiClientBuild.spy, "default_client_builds").toHaveBeenCalledTimes(1);
    const calls = aiClientBuild.spy.mock.calls as unknown[][];
    const config = (calls[0]?.[0] ?? {}) as Readonly<Record<string, unknown>>;
    expect(config["provider"], "default_provider_route").toBe("vertex");
    expect(config["project"], "default_project").toBe(FAKE_PROJECT_ID);
    expect(config["location"], "default_location").toBe(FAKE_LOCATION);
    for (const key of FORBIDDEN_CLIENT_CONFIG_KEYS) {
      expect(Object.keys(config), `forbidden_config_key:${key}`).not.toContain(
        key,
      );
    }
    expect(client.recorded.length, "default_client_calls").toBe(1);
    draftContractCounts.defaultRouteRows += 1;
    fakeModelCalls += client.recorded.length;
  });

  it("throws on a blank or absent model id before any model call", async () => {
    await loadForRow();
    const build = buildAdapter({ payee: "Fake Vendor" });
    try {
      vi.stubEnv("ACCOUNTING_EXTRACTION_MODEL", "   ");
      await expect(
        build.adapter.readDocument({
          companyId: COMPANY_ID,
          mimeType: PNG_MIME,
          body: PNG_BYTES,
        }),
      ).rejects.toThrow(/extraction model id is not configured/u);
      expect(build.client.recorded.length, "blank_model_id_client_calls").toBe(
        0,
      );
      draftContractCounts.blankModelIdCases += 1;

      vi.stubEnv("ACCOUNTING_EXTRACTION_MODEL", undefined);
      await expect(
        build.adapter.readDocument({
          companyId: COMPANY_ID,
          mimeType: JPEG_MIME,
          body: JPEG_BYTES,
        }),
      ).rejects.toThrow(/extraction model id is not configured/u);
      expect(build.client.recorded.length, "absent_model_id_client_calls").toBe(
        0,
      );
      draftContractCounts.blankModelIdCases += 1;
    } finally {
      vi.stubEnv("ACCOUNTING_EXTRACTION_MODEL", FAKE_MODEL_ID);
    }
  });

  it("serves every model call with the fake provider", async () => {
    expect(routeCounts.localPaths, "local_paths").toBe(2);
    expect(routeCounts.modelPaths, "model_paths").toBe(3);
    expect(
      routeCounts.providerRouteCases,
      "provider_route_cases",
    ).toBeGreaterThanOrEqual(6);
    expect(fakeModelCalls).toBeGreaterThanOrEqual(routeCounts.modelPaths);
    expect(
      draftContractCounts.schemaKeys,
      "draft_schema_keys",
    ).toBeGreaterThanOrEqual(INTAKE_DRAFT_KEYS.length);
    expect(
      draftContractCounts.contractCases,
      "draft_contract_cases",
    ).toBeGreaterThanOrEqual(5);
    expect(
      draftContractCounts.adversarialRows,
      "adversarial_rows",
    ).toBeGreaterThanOrEqual(1);
    expect(
      draftContractCounts.defaultRouteRows,
      "default_route_rows",
    ).toBeGreaterThanOrEqual(1);
    expect(
      draftContractCounts.blankModelIdCases,
      "blank_model_id_cases",
    ).toBeGreaterThanOrEqual(2);

    const realModelCalls = networkCalls.length;
    // eslint-disable-next-line no-console -- the log carries the labeled counts
    console.log(
      `=== document-extraction labels === local_paths=${routeCounts.localPaths} model_paths=${routeCounts.modelPaths} provider_route_cases=${routeCounts.providerRouteCases} real_model_calls=${realModelCalls} fake_model_calls=${fakeModelCalls} draft_schema_keys=${draftContractCounts.schemaKeys} draft_contract_cases=${draftContractCounts.contractCases} adversarial_rows=${draftContractCounts.adversarialRows} default_route_rows=${draftContractCounts.defaultRouteRows} blank_model_id_cases=${draftContractCounts.blankModelIdCases}`,
    );
    expect(realModelCalls, "real_model_calls").toBe(0);
    expect(fakeFetch, "network stub").not.toHaveBeenCalled();
  });
});
