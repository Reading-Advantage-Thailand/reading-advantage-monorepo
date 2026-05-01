import { describe, it, expect } from 'vitest';
import { apiSuccess, apiError } from './api-helpers';

describe('API Helpers', () => {
  describe('apiSuccess', () => {
    it('should return a NextResponse with success: true and data', async () => {
      const response = apiSuccess({ foo: 'bar' });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, foo: 'bar' });
    });

    it('should respect custom status codes', async () => {
      const response = apiSuccess({ created: true }, 201);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data).toEqual({ success: true, created: true });
    });
  });

  describe('apiError', () => {
    it('should return a NextResponse with success: false and error message', async () => {
      const response = apiError('Not found', 404);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data).toEqual({ success: false, error: 'Not found' });
    });

    it('should include details if provided', async () => {
      const response = apiError('Validation failed', 400, { field: 'email' });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toEqual({ 
        success: false, 
        error: 'Validation failed', 
        details: { field: 'email' } 
      });
    });

    it('should default to 400 status code', async () => {
      const response = apiError('Bad Request');
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toEqual({ success: false, error: 'Bad Request' });
    });
  });
});
