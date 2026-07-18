import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { CapabilityDescriptor } from "../contracts/descriptors.js";
import {
  defineCommandCapability,
  defineJobCapability,
  defineQueryCapability,
} from "../runtime.js";

const base = {
  summary: "Returns a reviewed lesson result.",
  owner: {
    package: "@reading-advantage/backend",
    module: "curriculum",
  },
  input: z.strictObject({ lessonId: z.string().min(1) }),
  output: z.strictObject({ title: z.string().min(1) }),
  auth: "public",
  risk: "ordinary",
  authorization: { mode: "none" },
  tenancy: {
    mode: "global",
    globalPolicyId: "curriculum.lesson.global",
  },
  errors: [],
  audit: { mode: "none" },
  observability: {
    operationName: "curriculum.lesson.read",
    timeoutMs: 2_000,
    cancellation: "supported",
    logLevel: "info",
  },
} as const;

describe("capability descriptor builders", () => {
  it("defines immutable query, command, and job descriptors", () => {
    const query = defineQueryCapability({
      ...base,
      id: "curriculum.lesson.read",
      kind: "query",
      transaction: { mode: "none" },
      idempotency: { mode: "none" },
    });
    const command = defineCommandCapability({
      ...base,
      id: "curriculum.lesson.refresh",
      kind: "command",
      transaction: { mode: "required" },
      idempotency: { mode: "none" },
    });
    const job = defineJobCapability({
      ...base,
      id: "curriculum.lesson.reindex",
      kind: "job",
      transaction: { mode: "required" },
      idempotency: { mode: "none" },
    });

    expect([query.kind, command.kind, job.kind]).toEqual([
      "query",
      "command",
      "job",
    ]);
    expect([query, command, job].every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(query.owner)).toBe(true);
  });

  it("rejects metadata that does not match the selected kind", () => {
    const invalid = {
      ...base,
      id: "curriculum.lesson.invalid",
      kind: "query",
      transaction: { mode: "required" },
      idempotency: { mode: "none" },
    } as unknown as CapabilityDescriptor & { kind: "query" };

    expect(() => defineQueryCapability(invalid)).toThrow();
  });
});
