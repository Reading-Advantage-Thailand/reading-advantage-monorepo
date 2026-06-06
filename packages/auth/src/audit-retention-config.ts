import { z } from "zod";

/**
 * Validated schema for audit retention configuration.
 * AUDIT_RETENTION_DAYS must be a positive integer ≥ 365 (1 year minimum).
 * Default is 2557 days (≈7 years, FERPA compliance).
 */
export const retentionConfigSchema = z.object({
  AUDIT_RETENTION_DAYS: z
    .string()
    .default("2557")
    .transform((val) => {
      const num = Number(val);
      if (!Number.isInteger(num)) {
        throw new Error(`AUDIT_RETENTION_DAYS must be an integer, got: ${val}`);
      }
      return num;
    })
    .pipe(z.number().int().min(365, "AUDIT_RETENTION_DAYS must be ≥ 365")),
});

/**
 * Returns the configured audit retention period in days.
 * Reads from AUDIT_RETENTION_DAYS env var; defaults to 2557 (≈7 years).
 * @returns The retention period in days
 */
export function getRetentionDays(): number {
  const config = retentionConfigSchema.parse(process.env);
  return config.AUDIT_RETENTION_DAYS;
}
