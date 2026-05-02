import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  createTokenPair,
  type AccessTokenPayload,
} from "../token.js";

const TEST_SECRET = "test-secret-for-unit-tests";

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

const samplePayload: AccessTokenPayload = {
  userId: "user-123",
  email: "test@example.com",
  role: "TEACHER",
  schoolId: "school-456",
};

describe("access tokens", () => {
  it("signs and verifies access token round-trip", () => {
    const token = signAccessToken(samplePayload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(samplePayload.userId);
    expect(decoded.email).toBe(samplePayload.email);
    expect(decoded.role).toBe(samplePayload.role);
    expect(decoded.schoolId).toBe(samplePayload.schoolId);
  });

  it("throws on invalid token", () => {
    expect(() => verifyAccessToken("not-a-real-token")).toThrow();
  });

  it("throws on token signed with different secret", () => {
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "other-secret";
    const token = signAccessToken(samplePayload);
    process.env.JWT_SECRET = oldSecret!;
    expect(() => verifyAccessToken(token)).toThrow();
  });
});

describe("refresh tokens", () => {
  it("signs and verifies refresh token round-trip", () => {
    const token = signRefreshToken("user-123");
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe("user-123");
  });

  it("rejects access token as refresh token", () => {
    const accessToken = signAccessToken(samplePayload);
    expect(() => verifyRefreshToken(accessToken)).toThrow(/refresh token/i);
  });

  it("throws on invalid refresh token", () => {
    expect(() => verifyRefreshToken("garbage")).toThrow();
  });
});

describe("createTokenPair", () => {
  it("returns both access and refresh tokens", () => {
    const pair = createTokenPair(samplePayload);
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    expect(pair.accessToken).not.toBe(pair.refreshToken);
  });

  it("access token from pair verifies correctly", () => {
    const pair = createTokenPair(samplePayload);
    const decoded = verifyAccessToken(pair.accessToken);
    expect(decoded.userId).toBe(samplePayload.userId);
  });

  it("refresh token from pair verifies correctly", () => {
    const pair = createTokenPair(samplePayload);
    const decoded = verifyRefreshToken(pair.refreshToken);
    expect(decoded.userId).toBe(samplePayload.userId);
  });
});
