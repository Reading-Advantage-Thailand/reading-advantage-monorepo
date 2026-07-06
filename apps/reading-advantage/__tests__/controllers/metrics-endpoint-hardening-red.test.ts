/**
 * Metrics/Health Endpoint Hardening Red Tests (SEC-10)
 *
 * Proves that the metrics SSE stream and the database health endpoint are
 * auth-gated and that the health endpoints do not expose detailed database
 * internals to authenticated callers.
 *
 * Falsification: remove auth from /metrics/stream and the unauthenticated test
 * receives 200; remove the DB-detail stripping from health endpoints and the
 * detail-leak tests fail.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/cache/metrics", () => ({
  getMetricsCacheStats: jest.fn().mockReturnValue({
    size: 0,
    pendingRefreshes: 0,
    totalHits: 0,
    totalMisses: 0,
    totalStaleHits: 0,
    totalInvalidations: 0,
    totalErrors: 0,
    hitRate: 0,
  }),
  invalidateMetrics: jest.fn(),
  invalidateMetricsByPrefix: jest.fn(),
  clearMetricsCache: jest.fn(),
}));

jest.mock("@/lib/cache/fallback-queries", () => ({
  checkMatviewsHealth: jest.fn().mockResolvedValue({
    healthy: true,
    views: [{ name: "mv_test", exists: true, lastRefresh: null, rowCount: 0 }],
  }),
}));

jest.mock("@/lib/cache/connection-monitor", () => ({
  connectionMonitor: {
    performHealthCheck: jest.fn().mockResolvedValue({ healthy: true, metrics: {} }),
  },
}));

jest.mock("@/lib/cache/advanced-cache", () => ({
  advancedCache: {
    getStats: jest.fn().mockReturnValue({
      hitRate: 0,
      totalEntries: 0,
    }),
    clear: jest.fn(),
  },
}));

jest.mock("@/lib/cache/matview-manager", () => ({
  matViewManager: {
    getRefreshStats: jest.fn().mockReturnValue({
      currentlyRefreshing: 0,
      queueLength: 0,
    }),
    forceRefreshAll: jest.fn(),
  },
}));

jest.mock("@reading-advantage/db", () => ({
  ...jest.requireActual("@reading-advantage/db"),
  db: {
    execute: jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation((cb) => cb({ execute: jest.fn().mockResolvedValue([]) })),
  },
}));

import { getCurrentUser } from "@/lib/session";
import { GET as getMetricsHealth } from "@/app/api/v1/metrics/health/route";
import { GET as getMetricsStream } from "@/app/api/v1/metrics/stream/route";
import { GET as getDatabaseHealth } from "@/app/api/v1/health/database/route";

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;

function makeRequest(url: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(url, { headers });
}

describe("metrics/health endpoint hardening (SEC-10 Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("/api/v1/metrics/stream", () => {
    it("returns 401 when the caller is not authenticated and has no access key", async () => {
      mockedGetCurrentUser.mockResolvedValue(null);

      // Prevent the SSE 30s heartbeat from keeping the Jest worker alive.
      const setIntervalSpy = jest
        .spyOn(global, "setInterval")
        .mockReturnValue(123 as any);
      const clearIntervalSpy = jest
        .spyOn(global, "clearInterval")
        .mockImplementation(() => {});

      const res = await getMetricsStream(
        makeRequest("http://localhost:3000/api/v1/metrics/stream")
      );

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();

      expect(res.status).toBe(401);
    });
  });

  describe("/api/v1/metrics/health", () => {
    it("does not expose detailed materialized view or cache internals", async () => {
      mockedGetCurrentUser.mockResolvedValue({
        id: "system-1",
        role: "SYSTEM",
        email: "system@example.com",
      } as any);

      const res = await getMetricsHealth(
        makeRequest("http://localhost:3000/api/v1/metrics/health")
      );
      const body = await res.json();

      expect(body).not.toHaveProperty("materialized_views");
      expect(body).not.toHaveProperty("cache");
      expect(body).not.toHaveProperty("matviewHealth");
    });

    it("still returns a healthy status summary (success result count: expected 1)", async () => {
      mockedGetCurrentUser.mockResolvedValue({
        id: "system-1",
        role: "SYSTEM",
        email: "system@example.com",
      } as any);

      const res = await getMetricsHealth(
        makeRequest("http://localhost:3000/api/v1/metrics/health")
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("status", "healthy");
    });
  });

  describe("/api/v1/health/database", () => {
    it("does not expose raw DB performance metrics", async () => {
      mockedGetCurrentUser.mockResolvedValue({
        id: "system-1",
        role: "SYSTEM",
        email: "system@example.com",
      } as any);

      const res = await getDatabaseHealth(
        makeRequest("http://localhost:3000/api/v1/health/database")
      );
      const body = await res.json();

      expect(body).not.toHaveProperty("performance");
      expect(body).not.toHaveProperty("slowQueries");
      expect(body).not.toHaveProperty("indexUsage");
      expect(body).not.toHaveProperty("tableStats");
      expect(body).not.toHaveProperty("lockStats");
      expect(body).not.toHaveProperty("recommendations");
    });
  });
});
