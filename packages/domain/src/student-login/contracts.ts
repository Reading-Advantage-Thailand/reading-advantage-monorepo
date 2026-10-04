import { z } from "zod";

/** Characters allowed in a class code. Look-alike characters (0, O, 1, I, L) are left out. */
export const CLASS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Number of characters in a class code. */
export const CLASS_CODE_LENGTH = 6;

/** Number of pictures in the picture-password grid. */
export const PICTURE_GRID_SIZE = 12;

/** Number of pictures in a picture password. */
export const PICTURE_SEQUENCE_LENGTH = 3;

/** Length of a QR card token: 32 random bytes in base64url without padding. */
export const QR_TOKEN_LENGTH = 43;

/** Session strength of a student session. NULL in storage means `full`. */
export const authStrengthSchema = z.enum(["full", "code_only"]);

/** Session strength of a student session: `full` or `code_only`. */
export type AuthStrength = z.infer<typeof authStrengthSchema>;

const codeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .length(CLASS_CODE_LENGTH)
      .regex(new RegExp(`^[${CLASS_CODE_ALPHABET}]+$`)),
  );

const studentIdSchema = z.string().min(1).max(64);

/** Request from a teacher to start a class login session. */
export const classSessionStartInput = z.object({ classroomId: z.string().uuid() });

/** Request from a teacher to end the open class login session. */
export const classSessionEndInput = z.object({ classroomId: z.string().uuid() });

/** Result of a class start: the one-time visible code and its expiry. */
export const classSessionStartOutput = z.object({
  sessionId: z.string().uuid(),
  code: codeSchema,
  expiresAt: z.coerce.date(),
});

/** Request to list the names of a class from a class code. */
export const codeEntryInput = z.object({ code: codeSchema });

/**
 * Name list for a valid code. A row holds no full name, email, or username.
 * `studentId` is an opaque handle (the id of the student credential row), never a user id.
 * `picturePasswordRequired` is false when the class turned the picture password off.
 */
export const nameListOutput = z.object({
  picturePasswordRequired: z.boolean(),
  students: z.array(
    z
      .object({
        studentId: studentIdSchema,
        displayName: z.string().min(1).max(40),
        avatar: z.string().min(1).max(40),
      })
      .strict(),
  ),
});

/** Request to sign in with a picture password. */
export const picturePasswordSignInInput = z.object({
  code: codeSchema,
  studentId: studentIdSchema,
  pictures: z
    .array(z.number().int().min(0).max(PICTURE_GRID_SIZE - 1))
    .length(PICTURE_SEQUENCE_LENGTH),
});

/** Request to sign in with a class code and a name only (class picture password is off). */
export const codeOnlySignInInput = z.object({ code: codeSchema, studentId: studentIdSchema });

/** Request from a teacher to reset the picture password of one student. */
export const resetPicturePasswordInput = z.object({
  classroomId: z.string().uuid(),
  studentUserId: z.string().min(1).max(64),
});

/** Request from a teacher to turn the picture password of a class on or off. */
export const picturePasswordSettingInput = z.object({
  classroomId: z.string().uuid(),
  enabled: z.boolean(),
});

/** Request from a teacher for the picture passwords of the students that have none. */
export const assignPicturePasswordsInput = z.object({ classroomId: z.string().uuid() });

/** Request to sign in with the token of a QR login card. */
export const qrTokenSignInInput = z.object({
  token: z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${QR_TOKEN_LENGTH}}$`)),
});

/** Request from a teacher to give one student a new QR card token. */
export const rotateCardTokenInput = z.object({
  classroomId: z.string().uuid(),
  studentUserId: z.string().min(1).max(64),
});

/** Request from a teacher for QR card tokens for the students that have none. */
export const issueCardTokensInput = z.object({ classroomId: z.string().uuid() });

/** Request from a teacher for the live sign-in roster of a class. */
export const classLoginRosterInput = z.object({ classroomId: z.string().uuid() });

/**
 * Live sign-in roster of a class for its teacher (FR-4). It holds no hash and no token:
 * `hasPicturePassword` and `hasCardToken` only tell whether one exists.
 */
export const classLoginRosterOutput = z.object({
  classroomName: z.string(),
  picturePasswordEnabled: z.boolean(),
  openSession: z.object({ id: z.string().uuid(), expiresAt: z.coerce.date() }).nullable(),
  students: z.array(
    z
      .object({
        userId: z.string().min(1),
        name: z.string(),
        username: z.string(),
        hasPicturePassword: z.boolean(),
        hasCardToken: z.boolean(),
        signedIn: z.boolean(),
        lastSeenAt: z.coerce.date().nullable(),
      })
      .strict(),
  ),
});

/** Request from a teacher to set new initial passwords for every student of a class (class sheet). */
export const resetClassPasswordsInput = z.object({ classroomId: z.string().uuid() });

/**
 * Result of a class password reset: the class sheet rows with each new plain password, shown
 * once, and the students whose password did not change.
 */
export const resetClassPasswordsOutput = z.object({
  classroomName: z.string(),
  students: z.array(
    z.object({ userId: z.string().min(1), name: z.string(), username: z.string(), password: z.string().min(1) }).strict(),
  ),
  failed: z.array(z.object({ userId: z.string().min(1), name: z.string() }).strict()),
});

/** Result of a student sign-in through a class code or a QR card. */
export const studentSignInOutput = z.object({
  user: z.object({ id: z.string().min(1), role: z.literal("STUDENT") }),
  authStrength: authStrengthSchema,
});

/** Input type of {@link classSessionStartInput}. */
export type ClassSessionStartInput = z.infer<typeof classSessionStartInput>;
/** Input type of {@link classSessionEndInput}. */
export type ClassSessionEndInput = z.infer<typeof classSessionEndInput>;
/** Output type of {@link classSessionStartOutput}. */
export type ClassSessionStartOutput = z.infer<typeof classSessionStartOutput>;
/** Input type of {@link codeEntryInput}. */
export type CodeEntryInput = z.infer<typeof codeEntryInput>;
/** Output type of {@link nameListOutput}. */
export type NameListOutput = z.infer<typeof nameListOutput>;
/** Input type of {@link codeOnlySignInInput}. */
export type CodeOnlySignInInput = z.infer<typeof codeOnlySignInInput>;
/** Input type of {@link resetPicturePasswordInput}. */
export type ResetPicturePasswordInput = z.infer<typeof resetPicturePasswordInput>;
/** Input type of {@link picturePasswordSettingInput}. */
export type PicturePasswordSettingInput = z.infer<typeof picturePasswordSettingInput>;
/** Input type of {@link assignPicturePasswordsInput}. */
export type AssignPicturePasswordsInput = z.infer<typeof assignPicturePasswordsInput>;
/** Input type of {@link picturePasswordSignInInput}. */
export type PicturePasswordSignInInput = z.infer<typeof picturePasswordSignInInput>;
/** Input type of {@link qrTokenSignInInput}. */
export type QrTokenSignInInput = z.infer<typeof qrTokenSignInInput>;
/** Output type of {@link studentSignInOutput}. */
export type StudentSignInOutput = z.infer<typeof studentSignInOutput>;
/** Input type of {@link rotateCardTokenInput}. */
export type RotateCardTokenInput = z.infer<typeof rotateCardTokenInput>;
/** Input type of {@link issueCardTokensInput}. */
export type IssueCardTokensInput = z.infer<typeof issueCardTokensInput>;
/** Input type of {@link classLoginRosterInput}. */
export type ClassLoginRosterInput = z.infer<typeof classLoginRosterInput>;
/** Output type of {@link classLoginRosterOutput}. */
export type ClassLoginRosterOutput = z.infer<typeof classLoginRosterOutput>;
/** Input type of {@link resetClassPasswordsInput}. */
export type ResetClassPasswordsInput = z.infer<typeof resetClassPasswordsInput>;
/** Output type of {@link resetClassPasswordsOutput}. */
export type ResetClassPasswordsOutput = z.infer<typeof resetClassPasswordsOutput>;
