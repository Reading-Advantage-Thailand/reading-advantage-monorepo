/**
 * @jest-environment node
 */

import { POST, GET } from "@/app/api/host-proof/games/completions/route";
import { NextRequest } from "next/server";

const mockGetCurrentUser = jest.fn();
const mockRecordHostProofGameCompletion = jest.fn();
const mockGetHostProofGameCompletions = jest.fn();
const mockCreateTenantDB = jest.fn();
const mockIsHostProofEnabled = jest.fn();

jest.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

jest.mock("@reading-advantage/domain/games", () => ({
  HostProofCompletionError: class HostProofCompletionError extends Error {
    code: string;
    issues?: unknown;
    constructor(code: string, message: string, issues?: unknown) {
      super(message);
      this.code = code;
      this.issues = issues;
      this.name = "HostProofCompletionError";
    }
    get httpStatus() {
      const map: Record<string, number> = {
        HOST_PROOF_UNAUTHENTICATED: 401,
        HOST_PROOF_VALIDATION_FAILED: 400,
        HOST_PROOF_UNKNOWN_CARTRIDGE: 404,
        HOST_PROOF_FORBIDDEN: 403,
        HOST_PROOF_TENANT_REQUIRED: 403,
        HOST_PROOF_INTERNAL: 500,
      };
      return map[this.code] ?? 500;
    }
  },
  hostProofErrorHttpStatus: (code: string) => {
    const map: Record<string, number> = {
      HOST_PROOF_UNAUTHENTICATED: 401,
      HOST_PROOF_VALIDATION_FAILED: 400,
      HOST_PROOF_UNKNOWN_CARTRIDGE: 404,
      HOST_PROOF_FORBIDDEN: 403,
      HOST_PROOF_TENANT_REQUIRED: 403,
      HOST_PROOF_INTERNAL: 500,
    };
    return map[code] ?? 500;
  },
  recordHostProofGameCompletion: (...args: unknown[]) => mockRecordHostProofGameCompletion(...args),
  getHostProofGameCompletions: (...args: unknown[]) => mockGetHostProofGameCompletions(...args),
}));

jest.mock("@reading-advantage/domain", () => ({
  createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args),
}));

jest.mock("@reading-advantage/db", () => ({
  db: {},
}));

jest.mock("@/lib/host-proof-config", () => ({
  isHostProofEnabled: () => mockIsHostProofEnabled(),
}));

function makeRequest(body?: unknown, query?: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/host-proof/games/completions${query ? `?${query}` : ""}`, {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? null : JSON.stringify(body),
  });
}

const mockUser = {
  id: "user-1",
  username: "student1",
  display_name: "Student",
  role: "STUDENT",
  school_id: "school-1",
  xp: 0,
  level: 1,
  cefr_level: "A1",
  email: "student@example.com",
  email_verified: true,
  picture: "",
  expired_date: "",
  expired: false,
  license_id: "",
  license_level: "BASIC",
  onborda: false,
};

const validInput = {
  gameType: "dragon-flight",
  difficulty: "medium",
  score: 100,
  accuracy: 1,
  correctAnswers: 1,
  totalAttempts: 1,
  duration: 1000,
  victory: true,
  idempotencyKey: "11111111-1111-1111-1111-111111111111",
  clientTimestamp: Date.now(),
};

describe("/api/host-proof/games/completions", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockRecordHostProofGameCompletion.mockReset();
    mockGetHostProofGameCompletions.mockReset();
    mockCreateTenantDB.mockReset();
    mockCreateTenantDB.mockReturnValue({});
    mockIsHostProofEnabled.mockReturnValue(true);
  });

  describe("POST", () => {
    it("fails closed with 404 when host proof is disabled", async () => {
      mockIsHostProofEnabled.mockReturnValue(false);

      const response = await POST(makeRequest(validInput));

      expect(response.status).toBe(404);
      expect(mockGetCurrentUser).not.toHaveBeenCalled();
    });
    it("returns 401 when the caller is unauthenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const response = await POST(makeRequest(validInput));
      expect(response.status).toBe(401);
    });

    it("returns 403 when the user has no school assignment", async () => {
      mockGetCurrentUser.mockResolvedValue({ ...mockUser, school_id: undefined });
      const response = await POST(makeRequest(validInput));
      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid JSON body", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const request = new NextRequest("http://localhost:3000/api/host-proof/games/completions", {
        method: "POST",
        body: "not-json",
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns the domain result on a valid completion", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockRecordHostProofGameCompletion.mockResolvedValue({
        xpEarned: 7,
        activityId: "game:dragon-flight:11111111-1111-1111-1111-111111111111",
        duplicate: false,
        status: 200,
        gameType: "dragon-flight",
      });

      const response = await POST(makeRequest(validInput));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.xpEarned).toBe(7);
      expect(data.gameType).toBe("dragon-flight");
      expect(mockCreateTenantDB).toHaveBeenCalledWith({}, { schoolId: "school-1" });
      expect(mockRecordHostProofGameCompletion).toHaveBeenCalled();
    });

    it("maps a HostProofCompletionError to its structured response", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const { HostProofCompletionError } = await import("@reading-advantage/domain/games");
      mockRecordHostProofGameCompletion.mockRejectedValue(
        new HostProofCompletionError("HOST_PROOF_UNKNOWN_CARTRIDGE", "Unknown cartridge"),
      );

      const response = await POST(makeRequest({ ...validInput, gameType: "unknown-title" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe("HOST_PROOF_UNKNOWN_CARTRIDGE");
    });
  });

  describe("GET", () => {
    it("fails closed with 404 when host proof is disabled", async () => {
      mockIsHostProofEnabled.mockReturnValue(false);

      const response = await GET(makeRequest(undefined, "limit=10"));

      expect(response.status).toBe(404);
      expect(mockGetCurrentUser).not.toHaveBeenCalled();
    });
    it("returns 401 when the caller is unauthenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const response = await GET(makeRequest(undefined, "limit=10"));
      expect(response.status).toBe(401);
    });

    it("returns host-proof history scoped to the tenant", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockGetHostProofGameCompletions.mockResolvedValue([
        {
          id: "completion-1",
          gameType: "dragon-flight",
          difficulty: "medium",
          score: 100,
          accuracy: 1,
          xpEarned: 7,
          activityId: "game:dragon-flight:11111111-1111-1111-1111-111111111111",
          createdAt: new Date("2026-07-28T00:00:00Z"),
        },
      ]);

      const response = await GET(makeRequest(undefined, "gameType=dragon-flight&limit=10"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toHaveLength(1);
      expect(mockCreateTenantDB).toHaveBeenCalledWith({}, { schoolId: "school-1" });
      expect(mockGetHostProofGameCompletions).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { gameType: "dragon-flight", limit: 10 },
        }),
      );
    });

    it("passes an invalid limit through the shared strict history validation", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser);
      const { HostProofCompletionError } = await import("@reading-advantage/domain/games");
      mockGetHostProofGameCompletions.mockRejectedValue(
        new HostProofCompletionError("HOST_PROOF_VALIDATION_FAILED", "Invalid history input"),
      );

      const response = await GET(makeRequest(undefined, "limit=not-a-number"));

      expect(response.status).toBe(400);
      expect(mockGetHostProofGameCompletions).toHaveBeenCalledWith(
        expect.objectContaining({ input: { limit: Number.NaN } }),
      );
    });
  });
});
