import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  getCapabilityRequestContext,
  runWithTrustedCapabilityRequestContext,
} from "../contracts/request-context.js";
import {
  createAllowedProjectionContract,
  projectedDataEnvelopeSchema,
  projectionReferenceSchema,
} from "../contracts/projections.js";

describe("kernel coverage regressions", () => {
  it("isolates a validated trusted request context", () => {
    expect(getCapabilityRequestContext()).toBeUndefined();

    const result = runWithTrustedCapabilityRequestContext({
      bindingId: "next:http:GET:/api/status",
      capabilityId: "status.service.read",
      capabilityKind: "query",
      exposure: "public",
      transport: "next-http",
      method: "GET",
      path: "/api/status",
    }, () => getCapabilityRequestContext());

    expect(result).toMatchObject({
      bindingId: "next:http:GET:/api/status",
      capabilityId: "status.service.read",
    });
    expect(getCapabilityRequestContext()).toBeUndefined();
  });

  it("rejects unordered, duplicate, sensitive, and undeclared projection keys", () => {
    const contract = createAllowedProjectionContract({
      projectorId: "coverage.projection",
      shape: { count: z.number(), label: z.string() },
    });

    expect(() => contract.validate({ count: 1, label: "one", extra: true }))
      .toThrow();
    expect(() => createAllowedProjectionContract({
      projectorId: "coverage.sensitive",
      shape: { token: z.string() },
    })).toThrow();
    expect(projectionReferenceSchema.safeParse({
      projectorId: "coverage.projection",
      schemaIdentity: contract.reference.schemaIdentity,
      allowedKeys: ["label", "count", "count"],
    }).success).toBe(false);
    expect(projectedDataEnvelopeSchema.safeParse({
      ...contract.reference,
      values: { count: 1, label: "one", extra: true },
    }).success).toBe(false);
  });
});
