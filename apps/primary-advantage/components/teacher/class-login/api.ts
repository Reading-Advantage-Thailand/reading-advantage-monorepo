/** One student row of the live roster, as JSON (dates are ISO strings). */
export interface RosterStudent {
  userId: string;
  name: string;
  username: string;
  hasPicturePassword: boolean;
  hasCardToken: boolean;
  signedIn: boolean;
  lastSeenAt: string | null;
}

/** The live sign-in roster of a class, as the roster route returns it. */
export interface ClassRoster {
  classroomName: string;
  picturePasswordEnabled: boolean;
  openSession: { id: string; expiresAt: string } | null;
  students: RosterStudent[];
}

/** Keys under `ClassLogin.errors` in the message files. */
export type ClassLoginErrorKey = "signedOut" | "forbidden" | "notFound" | "rateLimited" | "unavailable" | "generic";

/** A failed call to a student-login API route. */
export class ClassLoginApiError extends Error {
  /**
   * Builds the error.
   * @param status The HTTP status of the response.
   */
  constructor(readonly status: number) {
    super(`Student login request failed with status ${status}`);
    this.name = "ClassLoginApiError";
  }
}

/**
 * Posts a JSON body to a route under `/api/auth/student/` and returns the JSON response.
 * @param path The route path after `/api/auth/student/`, for example `roster`.
 * @param body The request body.
 * @returns The parsed response body.
 * @throws {ClassLoginApiError} When the response status is not 2xx.
 */
export async function postStudentLogin<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/auth/student/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new ClassLoginApiError(response.status);
  return (await response.json()) as T;
}

/**
 * Maps a failed call to the message key that explains it to the teacher.
 * @param error The thrown value.
 * @returns A key under `ClassLogin.errors`.
 */
export function errorKey(error: unknown): ClassLoginErrorKey {
  const status = error instanceof ClassLoginApiError ? error.status : 0;
  if (status === 401) return "signedOut";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 429) return "rateLimited";
  if (status === 503) return "unavailable";
  return "generic";
}
