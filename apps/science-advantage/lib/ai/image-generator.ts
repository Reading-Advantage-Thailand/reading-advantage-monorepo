import { experimental_generateImage } from 'ai';
import sharp from 'sharp';

import { aiImageConfig } from '@/lib/config/ai-images';
import { logger } from '@/lib/observability/logger';

export type DiagramRequest = {
  title?: string;
  description: string;
  labels?: string[];
  subjectContext?: string;
  aspectRatio?: '4:3' | '1:1';
};

type GenerateDiagramResult = {
  buffer: Buffer;
  mimeType: string;
  modelUsed: string;
  prompt: string;
  fallbackUsed: boolean;
  sizeBytes: number;
};

function ensureApiKey(modelId: string) {
  if (modelId.startsWith('google/')) {
    if (!aiImageConfig.googleApiKey) {
      throw new Error('Missing GOOGLE_API_KEY or GEMINI_API_KEY for Google image generation');
    }
    if (!process.env.GOOGLE_API_KEY) {
      process.env.GOOGLE_API_KEY = aiImageConfig.googleApiKey;
    }
  }

  if (modelId.startsWith('openai/')) {
    if (!aiImageConfig.openaiApiKey) {
      throw new Error('Missing OPENAI_API_KEY for OpenAI image generation');
    }
    if (!process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = aiImageConfig.openaiApiKey;
    }
  }
}

function buildPrompt(request: DiagramRequest) {
  const parts = [
    'Create a clean, school-safe science diagram with crisp, legible labels.',
    'Use clear vector-style shapes, light background, and no watermarks or branding.',
    'Include accurate text labels directly on the diagram; avoid excessive decorative text.',
    'Ensure text is readable at 4:3 or square aspect ratios; no NSFW or disallowed content.',
  ];

  if (request.title) {
    parts.push(`Diagram focus: ${request.title}`);
  }

  if (request.subjectContext) {
    parts.push(`Context: ${request.subjectContext}`);
  }

  parts.push(`Diagram goal: ${request.description}`);

  if (request.labels?.length) {
    parts.push(`Required labels: ${request.labels.join(', ')}`);
  }

  if (request.aspectRatio) {
    parts.push(`Preferred aspect ratio: ${request.aspectRatio}`);
  } else {
    parts.push('Preferred aspect ratio: 4:3 or 1:1 (whichever best fits).');
  }

  return parts.join('\n');
}

async function optimizeImage(buffer: Buffer) {
  const qualityLevels = [80, 70, 60, 50, 40];
  let lastBuffer = buffer;

  for (const quality of qualityLevels) {
    const optimized = await sharp(buffer)
      .resize({ width: aiImageConfig.maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    lastBuffer = optimized;

    if (optimized.byteLength <= aiImageConfig.maxBytes) {
      return {
        buffer: optimized,
        mimeType: 'image/webp',
        sizeBytes: optimized.byteLength,
      };
    }
  }

  return {
    buffer: lastBuffer,
    mimeType: 'image/webp',
    sizeBytes: lastBuffer.byteLength,
  };
}

async function generateWithModel(modelId: string, prompt: string) {
  ensureApiKey(modelId);

  const { image } = await experimental_generateImage({
    model: modelId,
    prompt,
  });

  if (!image) {
    throw new Error(`Model ${modelId} did not return an image`);
  }

  return Buffer.from(image.base64, 'base64');
}

export async function generateLessonDiagram(
  request: DiagramRequest
): Promise<GenerateDiagramResult> {
  const prompt = buildPrompt(request);
  const modelsToTry = [
    aiImageConfig.primaryModel,
    ...aiImageConfig.fallbackModels,
  ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

  let lastError: Error | null = null;

  for (const modelId of modelsToTry) {
    try {
      const rawBuffer = await generateWithModel(modelId, prompt);
      const optimized = await optimizeImage(rawBuffer);

      if (optimized.sizeBytes > aiImageConfig.maxBytes) {
        logger.warn('ai.image.optimization_limit_exceeded', {
          model: modelId,
          sizeBytes: optimized.sizeBytes,
          maxBytes: aiImageConfig.maxBytes,
        });
      }

      return {
        buffer: optimized.buffer,
        mimeType: optimized.mimeType,
        modelUsed: modelId,
        prompt,
        fallbackUsed: modelId !== aiImageConfig.primaryModel,
        sizeBytes: optimized.sizeBytes,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      logger.warn('ai.image.model_error', {
        model: modelId,
        error: lastError.message,
      });
    }
  }

  throw lastError ?? new Error('Image generation failed for all models');
}
