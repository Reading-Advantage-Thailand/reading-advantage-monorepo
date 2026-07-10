import { describe, expect, it } from "vitest";

import * as schedulerModule from "../srs/scheduler.js";
import type { ObjectivePriority } from "../srs/contract.js";

const FIXTURE_PROVENANCE = Object.freeze({
  specVersion: "kst-srs.v3.1",
  configVersion: "scheduler-priority-retention.v1",
  graphRelease: "codecamp.synthetic.v1",
  paramsVersion: "fsrs.v5.3.2.defaults",
});

type PriorityRetentionConfig = {
  requestRetention?: number;
  requestRetentionByPriority?: Partial<Record<ObjectivePriority, number>>;
  maximumInterval?: number;
  enableShortTermPreview?: boolean;
};

type ResolveRequestRetention = (
  priority: ObjectivePriority,
  config?: PriorityRetentionConfig,
) => number;

function getResolver(): ResolveRequestRetention | undefined {
  return (schedulerModule as Record<string, unknown>)
    .resolveRequestRetention as ResolveRequestRetention | undefined;
}

describe("kst-srs.v3.1 per-priority request retention", () => {
  it("provides the normative essential/supporting/extension defaults", () => {
    expect(FIXTURE_PROVENANCE.specVersion).toBe("kst-srs.v3.1");
    const resolveRequestRetention = getResolver();

    expect(
      typeof resolveRequestRetention,
      "scheduler must expose resolveRequestRetention for auditable priority targeting",
    ).toBe("function");
    if (!resolveRequestRetention) return;

    expect(resolveRequestRetention("essential")).toBe(0.95);
    expect(resolveRequestRetention("supporting")).toBe(0.9);
    expect(resolveRequestRetention("extension")).toBe(0.8);
  });

  it("honors an explicit priority override without mutating unrelated scheduler config", () => {
    const resolveRequestRetention = getResolver();
    expect(typeof resolveRequestRetention).toBe("function");
    if (!resolveRequestRetention) return;

    const config: PriorityRetentionConfig = {
      requestRetention: 0.88,
      requestRetentionByPriority: { essential: 0.97 },
      maximumInterval: 180,
      enableShortTermPreview: true,
    };
    const before = structuredClone(config);

    expect(resolveRequestRetention("essential", config)).toBe(0.97);
    expect(resolveRequestRetention("supporting", config)).toBe(0.9);
    expect(config).toEqual(before);
  });
});
