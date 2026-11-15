// @vitest environment node
/**
 * Adversarial rows for the extraction adapter of the track
 * `accounting_drive_intake_20261109` (Phase 4).
 *
 * This file attacks `apps/accounting/app/lib/document-extraction.ts`.
 * It covers the strategy items of `test-strategy.md` Phase 4: a model value
 * outside the schema, an empty model value, a hostile document value, and a
 * provider that is not vertex. It also carries the B411 rows of
 * `measure/runs/accounting_drive_intake_20261109/review-b-p4-7a8933fd8.json`:
 * the prompt tells the model to return an empty string for every field it
 * cannot read, but the currency enum (`THB`, `USD`, `JPY`) rejects `""`.
 *
 * Expected behavior (spec section 5.3): "A value the model cannot read on an
 * image stays empty." Expected behavior (plan task 4.3): "a value the model
 * returns empty stays empty". Two rows of this file fail on the currency
 * enum and stay failing. They are marked `KNOWN DEFECT X411`. No row calls a
 * real model, opens the network, or reads a credential.
 */

import {
  MockProvider,
  type GenerateObjectFromMediaInput,
} from "@reading-advantage/ai";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  applyReviewerValues,
  createDocumentExtraction,
  type DocumentExtractionClientConfig,
} from "../document-extraction";

/** Fake company id of every row. */
const COMPANY_ID = "33333333-33333343-8333-333333333333";
/** Fake model id read from `ACCOUNTING_EXTRACTION_MODEL`. */
const FAKE_MODEL_ID = "fake-extraction-model";
/** Fake project id; no real project enters this file. */
const FAKE_PROJECT_ID = "fake-vertex-project";
/** Fake location of the vertex route. */
const FAKE_LOCATION = "fake-location";
/** MIME type of a PNG receipt. */
const PNG_MIME = "image/png";
/** MIME type of a JPEG receipt. */
const JPEG_MIME = "image/jpeg";
/** Fake bytes of a PNG receipt, made in the test. */
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
/** Fake bytes of a JPEG receipt, made in the test. */
const JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
/** Spy of the real `createAIClient` export. */
const aiClientBuild = vi.hoisted(() => ({ spy: vi.fn() }));

vi.mock("@reading-advantage/ai", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createAIClient: (config: unknown) => aiClientBuild.spy(config),
  };
});

/** One recorded media call of the fake. */
interface RecordedCall {
  /** Model id the adapter passed. */
  readonly model: string | null;
  /** MIME type the adapter passed. */
  readonly mediaMimeType: string | null;
}

/** Fake AI client. It extends `MockProvider` and records every call. */
class FakeVertexClient extends MockProvider {
  /** Every media call this fake served. */
  readonly recorded: RecordedCall[] = [];

  /**
   * Builds a fake client with one canned draft.
   * @param canned Draft the fake returns for every call.
   */
  constructor(private readonly canned: Readonly<Record<string, unknown>>) {
    super({});
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
      model: input.model ?? null,
      mediaMimeType: input.media.mimeType,
    });
    return this.canned as unknown as T;
  }
}

/** Counters of the labeled adversarial cases. */
const adversarialCounts = {
  /** Empty-value rows of this file. */
  emptyRows: 0,
  /** Out-of-schema rows of this file. */
  outOfSchemaRows: 0,
  /** Hostile-value rows of this file. */
  hostileRows: 0,
  /** Non-vertex provider rows of this file. */
  providerRows: 0,
};

/** Model calls the fakes served. */
let fakeModelCalls = 0;

beforeAll(() => {
  vi.stubEnv("ACCOUNTING_EXTRACTION_MODEL", FAKE_MODEL_ID);
  vi.stubEnv("PROJECT_ID", FAKE_PROJECT_ID);
  vi.stubEnv("VERTEX_LOCATION", FAKE_LOCATION);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

/**
 * Builds one adapter with a fake client and no local reader.
 * @param canned Draft the fake client returns.
 * @returns The adapter and the fake client.
 */
function buildModelOnlyAdapter(canned: Readonly<Record<string, unknown>>): {
  readonly adapter: ReturnType<typeof createDocumentExtraction>;
  readonly client: FakeVertexClient;
  readonly configs: Array<DocumentExtractionClientConfig>;
} {
  const client = new FakeVertexClient(canned);
  const configs: Array<DocumentExtractionClientConfig> = [];
  const adapter = createDocumentExtraction({
    createClient: (config: DocumentExtractionClientConfig) => {
      configs.push(config);
      return client;
    },
  });
  return { adapter, client, configs };
}

describe("document extraction adversarial rows", () => {
  it("keeps an empty amountMinor and an empty payee with extraction model", async () => {
    const { adapter, client } = buildModelOnlyAdapter({
      payee: "",
      amountMinor: "",
      currency: "THB",
    });

    const result = await adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    expect(result.extraction).toBe("model");
    expect(result.draft["payee"]).toBe("");
    expect(result.draft["amountMinor"]).toBe("");
    expect(result.draft["currency"]).toBe("THB");
    fakeModelCalls += client.recorded.length;
    adversarialCounts.emptyRows += 1;
  });

  it("X411 KNOWN DEFECT: keeps an empty currency with extraction model", async () => {
    // Spec section 5.3: a value the model cannot read stays empty. Plan task
    // 4.3: a value the model returns empty stays empty. The prompt tells the
    // model to return "" for every unreadable field, so an unreadable
    // currency arrives as "". This row expects the draft to resolve with
    // extraction "model" and currency "". It fails: the currency enum
    // rejects "" and the read throws with no draft. See Review B r2 B411.
    const { adapter, client } = buildModelOnlyAdapter({
      payee: "Fake Vendor",
      amountMinor: "10000",
      currency: "",
    });

    const result = await adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    expect(result.extraction).toBe("model");
    expect(result.draft["currency"]).toBe("");
    fakeModelCalls += client.recorded.length;
    adversarialCounts.emptyRows += 1;
  });

  it("X411 KNOWN DEFECT: keeps an all-empty draft with extraction model", async () => {
    // The prompt asks for an empty string for every field the model cannot
    // read. A blank image therefore arrives as all empty strings. This row
    // expects the draft to resolve with extraction "model" and every value
    // empty. It fails on the currency enum for the same X411 cause.
    const { adapter, client } = buildModelOnlyAdapter({
      kind: "",
      payee: "",
      payeeName: "",
      category: "",
      description: "",
      amountMinor: "",
      currency: "",
    });

    const result = await adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: JPEG_MIME,
      body: JPEG_BYTES,
    });

    expect(result.extraction).toBe("model");
    expect(result.draft["payee"]).toBe("");
    expect(result.draft["amountMinor"]).toBe("");
    expect(result.draft["currency"]).toBe("");
    fakeModelCalls += client.recorded.length;
    adversarialCounts.emptyRows += 1;
  });

  it("rejects a model currency outside the settled enum", async () => {
    const { adapter, client } = buildModelOnlyAdapter({
      payee: "Fake Vendor",
      amountMinor: "10000",
      currency: "EUR",
    });

    const outcome = await adapter
      .readDocument({ companyId: COMPANY_ID, mimeType: PNG_MIME, body: PNG_BYTES })
      .then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      );

    expect(client.recorded.length, "out_of_schema_client_calls").toBe(1);
    expect(outcome.ok, "unknown_currency_rejected").toBe(false);
    if (outcome.ok === false) {
      expect(outcome.error, "out_of_schema_error").toBeInstanceOf(Error);
    }
    fakeModelCalls += client.recorded.length;
    adversarialCounts.outOfSchemaRows += 1;
  });

  it("rejects a model money pair with an empty currency", async () => {
    const { adapter, client } = buildModelOnlyAdapter({
      money: { amountMinor: "10000", currency: "" },
    });

    const outcome = await adapter
      .readDocument({ companyId: COMPANY_ID, mimeType: PNG_MIME, body: PNG_BYTES })
      .then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      );

    expect(outcome.ok, "empty_money_currency_rejected").toBe(false);
    if (outcome.ok === false) {
      expect(outcome.error, "out_of_schema_error").toBeInstanceOf(Error);
    }
    fakeModelCalls += client.recorded.length;
    adversarialCounts.outOfSchemaRows += 1;
  });

  it("passes a hostile payee value through verbatim with no file access", async () => {
    const hostilePayee = "../../etc/passwd\u0000<script>\"evil\"</script>";
    const { adapter, client } = buildModelOnlyAdapter({
      payee: hostilePayee,
      amountMinor: "10000",
      currency: "THB",
    });

    const result = await adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: PNG_MIME,
      body: PNG_BYTES,
    });

    expect(result.extraction).toBe("model");
    expect(result.draft["payee"]).toBe(hostilePayee);
    fakeModelCalls += client.recorded.length;
    adversarialCounts.hostileRows += 1;
  });

  it("refuses a hostile MIME type with a review reason and no model call", async () => {
    const client = new FakeVertexClient({ payee: "Fake Vendor" });
    const adapter = createDocumentExtraction({
      createClient: () => client,
      localReader: {
        async read() {
          return { kind: "needs-model" as const };
        },
      },
    });

    const read = adapter.readDocument({
      companyId: COMPANY_ID,
      mimeType: "../../../etc/passwd",
      body: PNG_BYTES,
    });

    await expect(read).rejects.toThrow(/review:/u);
    expect(client.recorded.length, "hostile_mime_client_calls").toBe(0);
    adversarialCounts.hostileRows += 1;
  });

  it("builds the vertex route even when AI_PROVIDER names another provider", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    try {
      aiClientBuild.spy.mockReset();
      const client = new FakeVertexClient({ payee: "Fake Vendor" });
      aiClientBuild.spy.mockReturnValue(client);
      const adapter = createDocumentExtraction();

      const result = await adapter.readDocument({
        companyId: COMPANY_ID,
        mimeType: PNG_MIME,
        body: PNG_BYTES,
      });

      expect(aiClientBuild.spy, "default_client_builds").toHaveBeenCalledTimes(1);
      const calls = aiClientBuild.spy.mock.calls as unknown[][];
      const config = (calls[0]?.[0] ?? {}) as Readonly<Record<string, unknown>>;
      expect(config["provider"], "provider_route").toBe("vertex");
      expect(result.extraction).toBe("model");
      fakeModelCalls += client.recorded.length;
      adversarialCounts.providerRows += 1;
    } finally {
      vi.stubEnv("AI_PROVIDER", undefined);
    }
  });

  it("merges reviewer values over an empty model draft with the human marker", async () => {
    const merged = applyReviewerValues({
      draft: { payee: "", amountMinor: "", currency: "THB" },
      values: { payee: "Fake Vendor" },
    });

    expect(merged.extraction).toBe("human");
    expect(merged.draft["payee"]).toBe("Fake Vendor");
    expect(merged.draft["amountMinor"]).toBe("");
  });

  it("reports the labeled adversarial counts with no real model call", async () => {
    expect(adversarialCounts.emptyRows, "empty_rows").toBeGreaterThanOrEqual(1);
    expect(
      adversarialCounts.outOfSchemaRows,
      "out_of_schema_rows",
    ).toBeGreaterThanOrEqual(2);
    expect(adversarialCounts.hostileRows, "hostile_rows").toBeGreaterThanOrEqual(2);
    expect(adversarialCounts.providerRows, "provider_rows").toBeGreaterThanOrEqual(1);
    expect(fakeModelCalls, "fake_model_calls").toBeGreaterThanOrEqual(1);

    // The log below carries the labeled counts.
    console.log(
      `=== document-extraction adversarial labels === empty_rows=${adversarialCounts.emptyRows} out_of_schema_rows=${adversarialCounts.outOfSchemaRows} hostile_rows=${adversarialCounts.hostileRows} provider_rows=${adversarialCounts.providerRows} fake_model_calls=${fakeModelCalls}`,
    );
  });
});
