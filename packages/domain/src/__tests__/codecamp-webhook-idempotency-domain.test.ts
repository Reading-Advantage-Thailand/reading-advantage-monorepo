import { describe, it, expect, vi } from "vitest";

// Use the real tenant registry so the test does not hide REFERENTIAL
// classification behind the setup-time mock.
vi.unmock("../tenant-registry.js");

import { createTenantDB, TenantScopeError } from "../db-contract.js";
import { logWebhookEvent } from "../codecamp/index.js";
import { createMockDb } from "./mock-db.js";
import type { DB } from "@reading-advantage/db";

const globalTenant = { schoolId: null as string | null };

const systemUser = {
  id: "system",
  username: "system",
  name: "System",
  role: "SYSTEM" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

describe("webhook delivery idempotency at domain layer", () => {
  it("does not log duplicate webhook events for the same delivery id", async () => {
    const db = createMockDb();
    const tenantDb = createTenantDB(db as unknown as DB, globalTenant);
    const deliveryId = "github-delivery-dup-001";

    // Wrap insert so we can count how many rows would be written once the
    // TenantScopeError barrier is removed.
    let insertCallCount = 0;
    const originalInsert = db.insert.bind(db);
    db.insert = vi.fn((...args: unknown[]) => {
      insertCallCount++;
      return originalInsert(...args);
    });

    let tenantScopeErrorCount = 0;

    for (let i = 0; i < 2; i++) {
      try {
        await logWebhookEvent({
          db: tenantDb,
          user: systemUser,
          tenant: globalTenant,
          input: {
            deliveryId,
            event: "pull_request",
            action: "opened",
            repoUrl: "https://github.com/org/repo",
            prUrl: "https://github.com/org/repo/pull/1",
            githubUsername: "intern1",
            outcome: "ignored",
            reason: "duplicate delivery idempotency test",
          },
        });
      } catch (err) {
        if (err instanceof TenantScopeError) {
          tenantScopeErrorCount++;
        }
      }
    }

    const duplicateDeliveryLogCount = Math.max(0, insertCallCount - 1);

    expect({
      tenantScopeErrorCount,
      duplicateDeliveryLogCount,
    }).toEqual({
      tenantScopeErrorCount: 0,
      duplicateDeliveryLogCount: 0,
    });
  });
});
