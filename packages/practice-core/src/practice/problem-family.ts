import { z } from 'zod';

export const DIFFICULTY_VALUES = [
  'introductory',
  'standard',
  'challenging',
] as const;

export type Difficulty = (typeof DIFFICULTY_VALUES)[number];

export const difficultySchema = z.enum(DIFFICULTY_VALUES);

export type PracticeVariant = {
  variantKey: string;
  componentKey: string;
  displayName: string;
  description: string;
  objectiveIds: string[];
  difficulty: Difficulty;
  metadata: Record<string, unknown>;
};

const baseVariantSchema = z.object({
  variantKey: z.string().trim().min(1),
  componentKey: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  description: z.string().trim().min(1),
  objectiveIds: z.array(z.string().trim().min(1)),
  difficulty: difficultySchema,
  metadata: z.record(z.string(), z.unknown()),
});

export const practiceVariantSchema = baseVariantSchema;

export type PracticeVariantInput = z.input<typeof practiceVariantSchema>;
