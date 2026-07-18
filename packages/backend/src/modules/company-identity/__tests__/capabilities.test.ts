import { describe, expect, it, vi } from "vitest";

import {
  createCapabilityExecutor,
  type AuditEvent,
  type DurableIdempotencyPort,
} from "../../../kernel/index.js";
import {
  companyIdentityCapabilityIds,
  createCompanyIdentityCapabilityReferences,
  createCompanyIdentityCapabilityRegistry,
} from "../capabilities.js";
import type { Employee } from "../contracts.js";
import type { CompanyIdentityService } from "../service.js";

const employee: Employee = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "alex",
  displayName: "Alex Employee",
  status: "ACTIVE",
  companyRoles: ["EMPLOYEE"],
  appRoles: { sales: ["SALES_REP"] },
  createdAt: "2026-07-18T00:00:00.000Z",
};

function service(createEmployee = vi.fn(async () => employee)): CompanyIdentityService {
  return {
    createEmployee,
    listEmployees: vi.fn(async () => [employee]),
  } as unknown as CompanyIdentityService;
}

describe("company identity capability composition", () => {
  it("publishes seven handler-free descriptors through exact registries", () => {
    const registry = createCompanyIdentityCapabilityRegistry(
      service(),
      createCompanyIdentityCapabilityReferences(),
    );
    expect(registry.listDescriptors()).toHaveLength(7);
    expect(registry.snapshot().entries.map((entry) => entry.descriptor.id)).toEqual(
      Object.values(companyIdentityCapabilityIds).sort(),
    );
    expect(registry.getDescriptor(companyIdentityCapabilityIds.createEmployee)).not
      .toHaveProperty("handler");
  });

  it("derives the actor from session evidence and settles idempotency plus audit", async () => {
    const createEmployee = vi.fn(async () => employee);
    const references = createCompanyIdentityCapabilityReferences();
    const registry = createCompanyIdentityCapabilityRegistry(service(createEmployee), references);
    const auditEvents: AuditEvent[] = [];
    const complete = vi.fn<DurableIdempotencyPort["complete"]>(async () => {});
    const executor = createCapabilityExecutor({
      registry,
      authentication: {
        authenticate: async () => ({
          userId: "22222222-2222-4222-8222-222222222222",
          roles: ["COMPANY_ADMIN"],
          schoolId: null,
        }),
      },
      tenancy: { resolve: async () => ({ mode: "global" }) as never },
      authorization: { authorize: async () => ({ allowed: true }) },
      transactions: { run: async () => { throw new Error("unexpected transaction"); } },
      idempotency: {
        acquire: async () => ({ status: "owner", ownershipToken: "owner-1" }),
        complete,
        fail: async () => {},
      },
      audit: {
        append: async (event) => {
          auditEvents.push(event as AuditEvent);
          return { eventId: event.eventId, persistedAt: "2026-07-18T00:00:00.000Z" };
        },
      },
      references,
      adapters: { get: <TAdapter>() => ({}) as TAdapter },
      logger: { debug: () => {}, info: () => {}, warn: () => {} },
      span: { setAttributes: () => {} },
      clock: { now: () => new Date("2026-07-18T00:00:00.000Z") },
      createCorrelationId: () => "correlation-identity",
    });

    await expect(executor.execute({
      capabilityId: companyIdentityCapabilityIds.createEmployee,
      evidence: { kind: "session", opaqueSessionRef: "s".repeat(32) },
      idempotencyKey: "identity-create-0001",
      input: {
        username: "alex",
        displayName: "Alex Employee",
        initialPassword: "valid-password-123",
        companyRoles: ["EMPLOYEE"],
        appRoles: { sales: ["SALES_REP"] },
        idempotencyKey: "identity-create-0001",
      },
    })).resolves.toEqual(employee);
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({
      actorAccountId: "22222222-2222-4222-8222-222222222222",
    }));
    expect(complete).toHaveBeenCalledOnce();
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.outcome).toBe("success");
  });
});
