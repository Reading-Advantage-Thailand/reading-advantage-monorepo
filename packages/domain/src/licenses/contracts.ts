import { z } from "zod";

export const createLicenseInputSchema = z.object({
  key: z.string().min(1),
  schoolName: z.string().min(1),
  maxUsers: z.number().int().min(1),
  licenseType: z.string().optional(),
  expiresAt: z.date().optional(),
});

export type CreateLicenseInput = z.infer<typeof createLicenseInputSchema>;

/** One license of a school in the view. The state follows the status and the end day. */
export const schoolLicenseRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  /** `active` counts for seats, `ended` has an end day before today, `inactive` has a status other than `active`. */
  state: z.enum(["active", "ended", "inactive"]),
  /** Start day as `YYYY-MM-DD`, or null. */
  startDate: z.string().nullable(),
  /** End day as `YYYY-MM-DD` (Bangkok calendar day), or null when the license never ends. */
  endDate: z.string().nullable(),
  /** The `max_users` of this license. */
  seats: z.number().int().nonnegative(),
});

/** The licenses of a school and the seat totals (view only). */
export const schoolLicenseViewOutputSchema = z.object({
  licenses: z.array(schoolLicenseRowSchema),
  /** Seats of the active licenses (shared rule of `usage.ts`). */
  seats: z.number().int().nonnegative(),
  /** The STUDENT users of the school. */
  seatsUsed: z.number().int().nonnegative(),
  seatsFree: z.number().int().nonnegative(),
  /** Students over the seats. 0 when the school has no active license. */
  seatsOver: z.number().int().nonnegative(),
  hasActiveLicense: z.boolean(),
});

/** The licenses of a school and the seat totals (view only). */
export type SchoolLicenseViewOutput = z.infer<typeof schoolLicenseViewOutputSchema>;

/** Number of seat holders on one page. */
export const SEAT_HOLDERS_PAGE_SIZE = 50;

/** Input of `listSeatHolders`. */
export const seatHoldersInputSchema = z.object({
  schoolId: z.string().uuid(),
  page: z.number().int().min(1),
});

/** Input of `listSeatHolders`. */
export type SeatHoldersInput = z.infer<typeof seatHoldersInputSchema>;

/** One page of the students of a school (the seat holders). */
export const seatHoldersOutputSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.literal(SEAT_HOLDERS_PAGE_SIZE),
  total: z.number().int().nonnegative(),
  holders: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
      classes: z.array(z.string()),
      /** Join instant as an ISO string. */
      joinedAt: z.string(),
    }),
  ),
});

/** One page of the students of a school (the seat holders). */
export type SeatHoldersOutput = z.infer<typeof seatHoldersOutputSchema>;
