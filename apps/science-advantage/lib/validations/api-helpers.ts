import { z, ZodType, ZodTypeDef, ZodError } from 'zod';

/**
 * Error thrown when Zod validation fails at an API boundary.
 * Carries HTTP 400 status and structured error details.
 */
export class ValidationError extends Error {
  public readonly status = 400;
  public readonly details: z.ZodIssue[];

  constructor(zodError: ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.details = zodError.issues;
  }

  toJSON() {
    return {
      error: 'invalid_input',
      details: this.details.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
}

/**
 * Parse and validate a request body against a Zod schema.
 * Returns the parsed value or throws ValidationError with HTTP 400 details.
 * @param request The incoming Request object.
 * @param schema The Zod schema to validate against.
 * @returns The parsed and validated value.
 * @throws ValidationError if the body fails schema validation.
 * @throws ValidationError if the body is not valid JSON.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T, ZodTypeDef, unknown>
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError(
      new ZodError([
        {
          code: 'custom',
          message: 'Invalid JSON body',
          path: [],
        },
      ])
    );
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

/**
 * Parse and validate URL search parameters against a Zod schema.
 * Returns the parsed value or throws ValidationError with HTTP 400 details.
 * @param request The incoming Request object.
 * @param schema The Zod schema to validate against.
 * @returns The parsed and validated value.
 * @throws ValidationError if query params fail schema validation.
 */
export function parseQuery<T>(
  request: Request,
  schema: ZodType<T, ZodTypeDef, unknown>
): T {
  const url = new URL(request.url);
  const raw: Record<string, string | undefined> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (!(key in raw)) {
      raw[key] = value;
    }
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

/**
 * Parse and validate route path parameters against a Zod schema.
 * Returns the parsed value or throws ValidationError with HTTP 400 details.
 * @param params The route params object (from Next.js context).
 * @param schema The Zod schema to validate against.
 * @returns The parsed and validated value.
 * @throws ValidationError if path params fail schema validation.
 */
export function parsePath<T>(
  params: Record<string, string | string[]>,
  schema: ZodType<T, ZodTypeDef, unknown>
): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}
