import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  defineDurableJobHandler,
  type DurableJobHandler,
} from "../index.js";

const validDefinition: DurableJobHandler<string, number> = {
  jobName: "test.jobs.example",
  tenantMode: "global",
  payload: z.string(),
  result: z.number(),
  async handle(_context, payload) {
    return payload.length;
  },
};

describe("durable job handler definition validation", () => {
  it("rejects unstable job names before registration", () => {
    expect(() =>
      defineDurableJobHandler({
        ...validDefinition,
        jobName: "Not Namespaced",
      }),
    ).toThrow();
  });

  it("rejects payload and result schema lookalikes", () => {
    expect(() =>
      defineDurableJobHandler({
        ...validDefinition,
        payload: {} as z.ZodType<string>,
      }),
    ).toThrow("genuine Zod payload");
    expect(() =>
      defineDurableJobHandler({
        ...validDefinition,
        result: {} as z.ZodType<number>,
      }),
    ).toThrow("genuine Zod result");
  });

  it("rejects a missing handler function at the runtime boundary", () => {
    expect(() =>
      defineDurableJobHandler({
        ...validDefinition,
        handle: undefined,
      } as unknown as DurableJobHandler<string, number>),
    ).toThrow("handler function");
  });
});
