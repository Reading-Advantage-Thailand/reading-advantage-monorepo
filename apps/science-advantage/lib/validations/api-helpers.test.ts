import { describe, it, expect } from 'vitest';
import { z, ZodError } from 'zod';
import { parseBody, parseQuery, parsePath, ValidationError } from './api-helpers';

describe('parseBody', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it('returns the parsed value for a valid body', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice', age: 30 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await parseBody(request, schema);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('throws ValidationError with 400 status on invalid body', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: '', age: -1 }),
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(parseBody(request, schema)).rejects.toThrow(ValidationError);
    try {
      await parseBody(request, schema);
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).status).toBe(400);
      expect((err as ValidationError).details.length).toBeGreaterThan(0);
      expect((err as ValidationError).toJSON().error).toBe('invalid_input');
    }
  });

  it('throws ValidationError on missing required fields', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(parseBody(request, schema)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError on invalid JSON', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(parseBody(request, schema)).rejects.toThrow(ValidationError);
    try {
      await parseBody(request, schema);
    } catch (err) {
      expect((err as ValidationError).toJSON().details[0].message).toBe(
        'Invalid JSON body'
      );
    }
  });
});

describe('parseQuery', () => {
  const schema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  });

  it('returns the parsed value for valid query params', () => {
    const request = new Request('http://localhost/api/test?page=2&limit=10');
    const result = parseQuery(request, schema);
    expect(result).toEqual({ page: 2, limit: 10 });
  });

  it('returns defaults when params are omitted', () => {
    const request = new Request('http://localhost/api/test');
    const result = parseQuery(request, schema);
    expect(result).toEqual({});
  });

  it('throws ValidationError on invalid query params', () => {
    const request = new Request('http://localhost/api/test?page=-1');
    expect(() => parseQuery(request, schema)).toThrow(ValidationError);
  });
});

describe('parsePath', () => {
  const schema = z.object({
    classId: z.string().uuid(),
    studentId: z.string().uuid(),
  });

  it('returns the parsed value for valid path params', () => {
    const params = {
      classId: '550e8400-e29b-41d4-a716-446655440000',
      studentId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    };
    const result = parsePath(params, schema);
    expect(result).toEqual(params);
  });

  it('throws ValidationError on invalid path params', () => {
    const params = { classId: 'not-a-uuid', studentId: 'also-not-a-uuid' };
    expect(() => parsePath(params, schema)).toThrow(ValidationError);
  });

  it('throws ValidationError on missing path params', () => {
    const params = { classId: '550e8400-e29b-41d4-a716-446655440000' };
    expect(() => parsePath(params as Record<string, string>, schema)).toThrow(
      ValidationError
    );
  });
});

describe('ValidationError', () => {
  it('serializes to JSON with error and details', () => {
    const zodError = new ZodError([
      { code: 'invalid_type', expected: 'string', received: 'undefined', path: ['name'], message: 'Required' },
    ]);
    const err = new ValidationError(zodError);
    const json = err.toJSON();
    expect(json.error).toBe('invalid_input');
    expect(json.details).toEqual([{ path: 'name', message: 'Required' }]);
  });

  it('has status 400', () => {
    const err = new ValidationError(new ZodError([]));
    expect(err.status).toBe(400);
  });
});
