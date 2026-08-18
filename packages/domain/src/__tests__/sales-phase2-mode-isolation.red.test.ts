// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  createSalesMasteryProjection,
  SalesMasteryProjectionError,
} from "../sales-mastery.js";

type CreateProjection = (options: unknown) => unknown;

const createProjection =
  createSalesMasteryProjection as unknown as CreateProjection;

/** Creates dependency spies for constructor-boundary tests. */
function dependencySpies(): {
  readonly database: {
    readonly select: ReturnType<typeof vi.fn>;
    readonly insert: ReturnType<typeof vi.fn>;
    readonly transaction: ReturnType<typeof vi.fn>;
  };
  readonly mastery: {
    readonly readSnapshot: ReturnType<typeof vi.fn>;
    readonly commitMasteryEvidence: ReturnType<typeof vi.fn>;
    readonly approveMasteryCalibration: ReturnType<typeof vi.fn>;
  };
  readonly companyIdentity: {
    readonly verify: ReturnType<typeof vi.fn>;
  };
  readonly masteryFactory: {
    readonly create: ReturnType<typeof vi.fn>;
  };
} {
  return {
    database: {
      select: vi.fn(),
      insert: vi.fn(),
      transaction: vi.fn(),
    },
    mastery: {
      readSnapshot: vi.fn(),
      commitMasteryEvidence: vi.fn(),
      approveMasteryCalibration: vi.fn(),
    },
    companyIdentity: {
      verify: vi.fn(),
    },
    masteryFactory: {
      create: vi.fn(),
    },
  };
}

/** Captures a synchronous constructor failure for stable error assertions. */
function captureConstructorError(options: unknown): unknown {
  try {
    createProjection(options);
    return undefined;
  } catch (error) {
    return error;
  }
}

describe("Sales Phase 2 constructor mode isolation Red", () => {
  it("rejects mixed legacy and trusted dependencies before dependency access", () => {
    const dependencies = dependencySpies();
    const error = captureConstructorError({
      database: dependencies.database,
      mastery: dependencies.mastery,
      companyIdentity: dependencies.companyIdentity,
      masteryFactory: dependencies.masteryFactory,
    });

    expect(error).toBeInstanceOf(SalesMasteryProjectionError);
    expect(error).toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(dependencies.mastery.readSnapshot).not.toHaveBeenCalled();
    expect(dependencies.mastery.commitMasteryEvidence).not.toHaveBeenCalled();
    expect(
      dependencies.mastery.approveMasteryCalibration,
    ).not.toHaveBeenCalled();
    expect(dependencies.masteryFactory.create).not.toHaveBeenCalled();
    expect(dependencies.companyIdentity.verify).not.toHaveBeenCalled();
    expect(dependencies.database.select).not.toHaveBeenCalled();
    expect(dependencies.database.insert).not.toHaveBeenCalled();
    expect(dependencies.database.transaction).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "companyIdentity",
      options: (dependencies: ReturnType<typeof dependencySpies>) => ({
        database: dependencies.database,
        mastery: dependencies.mastery,
        masteryFactory: dependencies.masteryFactory,
      }),
    },
    {
      label: "masteryFactory",
      options: (dependencies: ReturnType<typeof dependencySpies>) => ({
        database: dependencies.database,
        mastery: dependencies.mastery,
        companyIdentity: dependencies.companyIdentity,
      }),
    },
  ])(
    "rejects trusted options missing $label without legacy fallback or database access",
    ({ options }) => {
      const dependencies = dependencySpies();
      const error = captureConstructorError(options(dependencies));

      expect(error).toBeInstanceOf(SalesMasteryProjectionError);
      expect(error).toMatchObject({ code: "CONFIGURATION_ERROR" });
      expect(dependencies.mastery.readSnapshot).not.toHaveBeenCalled();
      expect(dependencies.mastery.commitMasteryEvidence).not.toHaveBeenCalled();
      expect(
        dependencies.mastery.approveMasteryCalibration,
      ).not.toHaveBeenCalled();
      expect(dependencies.masteryFactory.create).not.toHaveBeenCalled();
      expect(dependencies.companyIdentity.verify).not.toHaveBeenCalled();
      expect(dependencies.database.select).not.toHaveBeenCalled();
      expect(dependencies.database.insert).not.toHaveBeenCalled();
      expect(dependencies.database.transaction).not.toHaveBeenCalled();
    },
  );
});
