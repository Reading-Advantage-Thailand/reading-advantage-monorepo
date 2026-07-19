import { describe, expect, it, vi } from "vitest";

import type {
  CapabilityExecutor,
  ValidatedProjectedData,
} from "@reading-advantage/backend";

import { createAccountsCapabilityTelemetry } from "./telemetry";

describe("Accounts capability telemetry", () => {
  it("records correlated success timing and retains only secret-safe attributes", async () => {
    const records: unknown[] = [];
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(112.75);
    const telemetry = createAccountsCapabilityTelemetry({
      createId: () => "correlation-accounts-1",
      now,
      write: (record) => records.push(record),
    });

    await expect(
      telemetry.observe("company-identity.employees.create", async () => {
        expect(telemetry.createCorrelationId()).toBe("correlation-accounts-1");
        telemetry.logger.info("company-identity.employee.started", {
          resourceType: "company-employee",
          applicationKey: "sales",
          password: "must-not-appear",
          sessionToken: "must-not-appear",
          authorizationCode: "must-not-appear",
          apiKey: "must-not-appear",
          privateKey: "must-not-appear",
          signingKey: "must-not-appear",
          clientKey: "must-not-appear",
          arbitraryField: "must-not-appear",
        } as unknown as ValidatedProjectedData);
        telemetry.span.setAttributes({
          resourceType: "company-employee",
          credential: "must-not-appear",
        } as unknown as ValidatedProjectedData);
        return { status: "ok" };
      }),
    ).resolves.toEqual({ status: "ok" });

    expect(records).toEqual([
      expect.objectContaining({
        severity: "INFO",
        event: "company-identity.employee.started",
        capabilityId: "company-identity.employees.create",
        correlationId: "correlation-accounts-1",
        attributes: {
          applicationKey: "sales",
          resourceType: "company-employee",
        },
      }),
      expect.objectContaining({
        severity: "INFO",
        event: "accounts.capability.completed",
        capabilityId: "company-identity.employees.create",
        correlationId: "correlation-accounts-1",
        outcome: "success",
        durationMs: 12.75,
        attributes: { resourceType: "company-employee" },
      }),
    ]);
    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain("must-not-appear");
    expect(serialized).not.toMatch(
      /password|credential|sessionToken|authorizationCode|apiKey|privateKey|signingKey|clientKey|arbitraryField/,
    );
  });

  it("drops nested values even when their top-level key is allowed", async () => {
    const records: unknown[] = [];
    const telemetry = createAccountsCapabilityTelemetry({
      createId: () => "correlation-accounts-nested",
      now: () => 1,
      write: (record) => records.push(record),
    });

    await telemetry.observe("company-identity.employees.list", async () => {
      telemetry.logger.info("company-identity.employee.loaded", {
        resourceType: { privateKey: "must-not-appear" },
      } as unknown as ValidatedProjectedData);
    });

    expect(JSON.stringify(records)).not.toContain("must-not-appear");
    expect(records[0]).not.toHaveProperty("attributes");
  });

  it("records a boundary-safe failure code without serializing error details", async () => {
    const records: unknown[] = [];
    const now = vi.fn().mockReturnValueOnce(20).mockReturnValueOnce(25);
    const telemetry = createAccountsCapabilityTelemetry({
      createId: () => "correlation-accounts-2",
      now,
      write: (record) => records.push(record),
    });
    const failure = Object.assign(new Error("password=private token=private"), {
      code: "FORBIDDEN",
      details: { authorizationCode: "private" },
    });

    await expect(
      telemetry.observe("company-identity.employees.list", async () => {
        telemetry.createCorrelationId();
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(records).toEqual([
      expect.objectContaining({
        severity: "WARNING",
        event: "accounts.capability.failed",
        capabilityId: "company-identity.employees.list",
        correlationId: "correlation-accounts-2",
        outcome: "failure",
        errorCode: "FORBIDDEN",
        durationMs: 5,
      }),
    ]);
    expect(JSON.stringify(records)).not.toMatch(
      /password=private|token=private|authorizationCode/,
    );
  });

  it("emits only reviewed scalar attributes outside execution context", () => {
    const records: unknown[] = [];
    const telemetry = createAccountsCapabilityTelemetry({
      createId: () => "correlation-outside-context",
      write: (record) => records.push(record),
    });

    expect(telemetry.createCorrelationId()).toBe("correlation-outside-context");
    telemetry.span.setAttributes({
      resourceType: "ignored-outside-context",
    } as unknown as ValidatedProjectedData);
    telemetry.logger.info("accounts.scalar.null-boolean", {
      applicationKey: null,
      resourceType: false,
    } as unknown as ValidatedProjectedData);
    telemetry.logger.info("accounts.scalar.number", {
      applicationKey: Number.POSITIVE_INFINITY,
      resourceType: 7,
    } as unknown as ValidatedProjectedData);
    telemetry.logger.info("accounts.scalar.string", {
      applicationKey: "sales",
      resourceType: ["not-allowed"],
    } as unknown as ValidatedProjectedData);

    expect(records).toEqual([
      expect.objectContaining({
        attributes: { applicationKey: null, resourceType: false },
      }),
      expect.objectContaining({ attributes: { resourceType: 7 } }),
      expect.objectContaining({ attributes: { applicationKey: "sales" } }),
    ]);
    expect(records[0]).not.toHaveProperty("correlationId");
  });

  it("uses production defaults and never lets sink failure change execution", async () => {
    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const defaults = createAccountsCapabilityTelemetry();
    expect(defaults.createCorrelationId()).toMatch(/^[0-9a-f-]{36}$/);
    defaults.logger.warn("accounts.default-sink");
    expect(stdout).toHaveBeenCalledOnce();
    stdout.mockRestore();

    const telemetry = createAccountsCapabilityTelemetry({
      createId: () => "correlation-throwing-sink",
      now: () => 10,
      write: () => {
        throw new Error("sink unavailable");
      },
    });
    await expect(
      telemetry.observe("company-identity.employees.list", async () => "ok"),
    ).resolves.toBe("ok");
  });

  it("maps untrusted failure shapes to the internal error code", async () => {
    const records: unknown[] = [];
    const telemetry = createAccountsCapabilityTelemetry({
      createId: () => "correlation-untrusted-error",
      now: () => 10,
      write: (record) => records.push(record),
    });

    await expect(
      telemetry.observe("company-identity.employees.list", async () => {
        throw "untrusted failure";
      }),
    ).rejects.toBe("untrusted failure");
    expect(records).toEqual([
      expect.objectContaining({ errorCode: "INTERNAL_ERROR" }),
    ]);
  });

  it("instruments an executor without changing its result or correlation identifier", async () => {
    const records: unknown[] = [];
    const now = vi.fn().mockReturnValueOnce(40).mockReturnValueOnce(44);
    const telemetry = createAccountsCapabilityTelemetry({
      createId: () => "correlation-accounts-3",
      now,
      write: (record) => records.push(record),
    });
    const execute = vi.fn(async () => {
      telemetry.logger.debug("company-identity.employee.loaded", {
        resourceType: "company-employee",
      } as unknown as ValidatedProjectedData);
      return {
        employeeId: "11111111-1111-4111-8111-111111111111",
        correlationId: telemetry.createCorrelationId(),
      };
    });
    const executor = telemetry.instrument({ execute } as CapabilityExecutor);

    await expect(
      executor.execute({
        capabilityId: "company-identity.employees.list",
        evidence: { kind: "anonymous" },
        input: {},
      }),
    ).resolves.toEqual({
      employeeId: "11111111-1111-4111-8111-111111111111",
      correlationId: "correlation-accounts-3",
    });
    expect(execute).toHaveBeenCalledOnce();
    expect(records).toEqual([
      expect.objectContaining({
        event: "company-identity.employee.loaded",
        correlationId: "correlation-accounts-3",
      }),
      expect.objectContaining({
        event: "accounts.capability.completed",
        correlationId: "correlation-accounts-3",
        durationMs: 4,
      }),
    ]);
  });
});
