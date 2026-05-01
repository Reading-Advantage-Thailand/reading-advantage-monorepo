import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateImage = vi.fn();

const mockToBuffer = vi.fn();
const mockResize = vi.fn().mockReturnThis();
const mockWebp = vi.fn().mockReturnThis();

vi.mock('ai', () => ({
  experimental_generateImage: (...args: unknown[]) => mockGenerateImage(...args),
}));

vi.mock('sharp', () => {
  const sharpMock = vi.fn(() => ({
    resize: mockResize,
    webp: mockWebp,
    toBuffer: mockToBuffer,
  }));

  return { default: sharpMock };
});

const baseImageResponse = {
  images: [],
  warnings: [],
  responses: [],
};

async function loadModule() {
  const mod = await import('./image-generator');
  return mod;
}

describe('generateLessonDiagram', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.OPENAI_API_KEY = 'openai-key';
    delete process.env.GOOGLE_API_KEY;
    delete process.env.AI_IMAGE_FALLBACK_MODELS;
  });

  it('uses primary model and optimizes to the size cap', async () => {
    const buffers = [Buffer.alloc(250_000), Buffer.alloc(180_000)];
    mockToBuffer.mockImplementation(() => buffers.shift() ?? Buffer.alloc(1000));

    mockGenerateImage.mockResolvedValue({
      ...baseImageResponse,
      image: {
        base64: Buffer.from('stub-image').toString('base64'),
        uint8Array: new Uint8Array(),
        mediaType: 'image/png',
      },
    });

    const { generateLessonDiagram } = await loadModule();

    const result = await generateLessonDiagram({
      description: 'Label the layers of the Earth',
      labels: ['crust', 'mantle', 'core'],
      aspectRatio: '4:3',
    });

    expect(mockGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'google/gemini-3-pro-image',
      })
    );
    expect(result.mimeType).toBe('image/webp');
    expect(result.sizeBytes).toBeLessThanOrEqual(200_000);
    expect(result.fallbackUsed).toBe(false);
    expect(mockToBuffer).toHaveBeenCalledTimes(2);
  });

  it('falls back to secondary model when primary fails', async () => {
    process.env.AI_IMAGE_FALLBACK_MODELS = 'openai/dall-e-3';

    mockGenerateImage
      .mockRejectedValueOnce(new Error('primary failed'))
      .mockResolvedValueOnce({
        ...baseImageResponse,
        image: {
          base64: Buffer.from('fallback-image').toString('base64'),
          uint8Array: new Uint8Array(),
          mediaType: 'image/png',
        },
      });

    mockToBuffer.mockResolvedValue(Buffer.alloc(150_000));

    const { generateLessonDiagram } = await loadModule();

    const result = await generateLessonDiagram({
      description: 'Simple cell diagram',
      labels: ['nucleus', 'cell membrane'],
    });

    expect(result.modelUsed).toBe('openai/dall-e-3');
    expect(result.fallbackUsed).toBe(true);
    expect(mockGenerateImage).toHaveBeenCalledTimes(2);
  });

  it('falls back when google key is missing for primary model', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    mockGenerateImage.mockResolvedValue({
      ...baseImageResponse,
      image: {
        base64: Buffer.from('stub-image').toString('base64'),
        uint8Array: new Uint8Array(),
        mediaType: 'image/png',
      },
    });

    const { generateLessonDiagram } = await loadModule();

    await expect(
      generateLessonDiagram({
        description: 'Volcano cross-section',
      })
    ).resolves.toMatchObject({
      modelUsed: 'openai/dall-e-3',
      fallbackUsed: true,
    });
  });
});
