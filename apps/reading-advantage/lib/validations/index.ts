/**
 * Shared Zod-backed input-validation helpers for Next.js route handlers.
 *
 * The reading-advantage controllers historically read `req.query` / `req.body`
 * without validation (SEC-7). These helpers provide a uniform rejection shape
 * (HTTP 400 with a structured error body) and are the only sanctioned way to
 * read external input on reviewed routes.
 *
 * Usage:
 * ```ts
 * const query = parseQuery(req, z.object({ startDate: z.string().date() }));
 * if (query instanceof NextResponse) return query;
 * const { startDate } = query;
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import type { ZodIssue, ZodTypeAny, z } from "zod";

/**
 * Build a JSON 400 NextResponse describing a Zod validation failure.
 * @param issues - Zod issues to serialize
 * @returns A NextResponse with status 400 and a structured error body
 */
function buildErrorResponse(issues: ZodIssue[]): NextResponse {
  return NextResponse.json(
    {
      code: "INVALID_INPUT",
      message: "Request input failed validation",
      details: issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    },
    { status: 400 },
  );
}

/**
 * Parse and validate the URL query parameters of a NextRequest.
 * @param req - The Next.js request
 * @param schema - A Zod schema describing the expected query shape
 * @returns The parsed query on success; a 400 NextResponse on failure
 */
export function parseQuery<T extends ZodTypeAny>(
  req: NextRequest,
  schema: T
): z.infer<T> | NextResponse {
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    return buildErrorResponse(result.error.issues);
  }
  return result.data;
}

/**
 * Parse and validate the JSON body of a NextRequest.
 * @param req - The Next.js request
 * @param schema - A Zod schema describing the expected body shape
 * @returns The parsed body on success; a 400 NextResponse on failure
 */
export async function parseBody<T extends ZodTypeAny>(
  req: NextRequest,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      {
        code: "INVALID_JSON",
        message: "Request body is not valid JSON",
      },
      { status: 400 }
    );
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return buildErrorResponse(result.error.issues);
  }
  return result.data;
}

/**
 * Parse and validate dynamic route path params.
 * @param paramsPromise - The `params` Promise exposed by Next.js route handlers
 * @param schema - A Zod schema describing the expected params shape
 * @returns The parsed params on success; a 400 NextResponse on failure
 */
export async function parsePath<T extends ZodTypeAny>(
  paramsPromise: Promise<Record<string, string>>,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  const raw = await paramsPromise;
  const result = schema.safeParse(raw);
  if (!result.success) {
    return buildErrorResponse(result.error.issues);
  }
  return result.data;
}