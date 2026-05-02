import jwt from "jsonwebtoken";
import type { Role } from "./roles.js";

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: Role;
  schoolId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    return "dev-secret-do-not-use-in-production";
  }
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, getJwtSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  const payload = decoded as { userId: string; type: string };
  if (payload.type !== "refresh") {
    throw new Error("Not a refresh token");
  }
  return { userId: payload.userId };
}

export function createTokenPair(payload: AccessTokenPayload): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload.userId),
  };
}
