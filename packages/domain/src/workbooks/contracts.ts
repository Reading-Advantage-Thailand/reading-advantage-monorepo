import { z } from "zod";

export const workbookSourceAppSchema = z.enum([
  "reading-advantage",
  "primary-advantage",
]);

export const workbookAssetKeySchema = z
  .string()
  .min(1)
  .refine(
    (value) => !value.startsWith("http://") && !value.startsWith("https://"),
    { message: "asset key must be a canonical key, not a URL" },
  );

export const workbookAssetMetadataSchema = z
  .object({
    key: workbookAssetKeySchema,
    contentType: z.string().min(1),
    byteSize: z.number().int().nonnegative(),
    checksum: z.string().min(1),
  })
  .strict();

export const workbookSourceIdentitySchema = z
  .object({
    sourceApp: workbookSourceAppSchema,
    sourceId: z.string().min(1),
    sourceRevision: z.string().min(1),
    contentHash: z.string().min(1),
  })
  .strict();

export const workbookQuestionSchema = z
  .object({
    questionId: z.string().min(1),
    prompt: z.string().min(1),
    questionType: z.string().min(1),
    choices: z.array(z.string().min(1)).optional(),
    correctChoiceIndex: z.number().int().nonnegative().optional(),
  })
  .strict();

export const workbookNormalizedContentSchema = z
  .object({
    title: z.string().min(1),
    cefrLevel: z.string().min(1),
    paragraphs: z
      .array(
        z
          .object({
            order: z.number().int().nonnegative(),
            text: z.string().min(1),
          })
          .strict(),
      ),
    questions: z.array(workbookQuestionSchema),
    assets: z.array(workbookAssetMetadataSchema),
  })
  .strict();

export const workbookSourceRecordSchema = z
  .object({
    identity: workbookSourceIdentitySchema,
    content: workbookNormalizedContentSchema,
  })
  .strict();

export const workbookIncompatibilityIssueSchema = z
  .object({
    path: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

export const workbookIncompatibilityErrorSchema = z
  .object({
    sourceApp: workbookSourceAppSchema,
    sourceId: z.string().min(1),
    issues: z.array(workbookIncompatibilityIssueSchema).min(1),
  })
  .strict();

export type WorkbookSourceApp = z.infer<typeof workbookSourceAppSchema>;
export type WorkbookAssetKey = z.infer<typeof workbookAssetKeySchema>;
export type WorkbookAssetMetadata = z.infer<typeof workbookAssetMetadataSchema>;
export type WorkbookSourceIdentity = z.infer<typeof workbookSourceIdentitySchema>;
export type WorkbookQuestion = z.infer<typeof workbookQuestionSchema>;
export type WorkbookNormalizedContent = z.infer<typeof workbookNormalizedContentSchema>;
export type WorkbookSourceRecord = z.infer<typeof workbookSourceRecordSchema>;
export type WorkbookIncompatibilityIssue = z.infer<typeof workbookIncompatibilityIssueSchema>;
export type WorkbookIncompatibilityError = z.infer<typeof workbookIncompatibilityErrorSchema>;
