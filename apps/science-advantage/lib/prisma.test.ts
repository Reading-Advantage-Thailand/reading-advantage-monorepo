import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock PrismaClient to avoid needing a real database
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      _isMockPrisma: true,
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    })),
  };
});

describe('PrismaClient singleton', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as Record<string, string>).NODE_ENV = originalEnv;
    vi.resetModules();
    delete (global as Record<string, unknown>).prisma;
  });

  it('should cache on global in all environments including production', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    delete (global as Record<string, unknown>).prisma;

    const { default: prisma } = await import('./prisma');
    expect(prisma).toBeDefined();
    expect((global as Record<string, unknown>).prisma).toBe(prisma);
  });

  it('should cache on global in development', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    delete (global as Record<string, unknown>).prisma;

    const { default: prisma } = await import('./prisma');
    expect(prisma).toBeDefined();
    expect((global as Record<string, unknown>).prisma).toBe(prisma);
  });

  it('should reuse global instance if it already exists', async () => {
    const fakeClient = { _isFake: true } as unknown;
    (global as Record<string, unknown>).prisma = fakeClient;

    const { default: prisma } = await import('./prisma');
    expect(prisma).toBe(fakeClient);
  });
});
