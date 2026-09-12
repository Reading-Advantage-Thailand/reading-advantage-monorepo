import { NextResponse } from "next/server";
import {
  GameSpeechPreparationError,
  gameLearningContentInputSchema,
  gameLearningContentResultSchema,
  listGameLearningContent,
  prepareGameAnswerAudio,
  preparedGameAnswerAudioLearningContentResultSchema,
  type SpeechClipLookupPort,
} from "@reading-advantage/domain/games";

type ContentArguments = Parameters<typeof listGameLearningContent>[0];
type SessionUser = ContentArguments["user"];

interface AuthenticatedSession {
  user: SessionUser;
}

/** Dependencies that connect the content HTTP adapter to auth and domain code. */
export interface ApkContentRouteDependencies {
  /** Name of the shared first-party session cookie. */
  sessionCookieName: string;
  /** Resolves an opaque cookie token to its database-backed session. */
  validateSession: (token: string) => Promise<AuthenticatedSession | null>;
  /** Creates a school-scoped database for the authenticated student. */
  createTenantDb: (schoolId: string) => ContentArguments["db"];
  /** Reads student-owned content through the games domain. */
  listContent: typeof listGameLearningContent;
  /** Finds configured prepared clips when listening is enabled. */
  speechLookup?: SpeechClipLookupPort;
  /** Creates the configured prepared clip lookup after authorization. */
  getSpeechLookup?: () => SpeechClipLookupPort | undefined;
  /** Resolves complete prepared speech after the server loads student content. */
  prepareAnswerAudio?: typeof prepareGameAnswerAudio;
  /** Total deadline for all prepared clip lookups. */
  speechPreparationTimeoutMs?: number;
}

/** Request shape needed by the framework-neutral content adapter. */
export interface ApkContentRequest {
  /** Absolute request URL containing validated selection parameters. */
  url: string;
  /** Request headers containing the session cookie. */
  headers: Headers;
  /** Cancels stale server work when the caller disconnects. */
  signal?: AbortSignal;
}

const PRIVATE_NO_STORE = "no-store, private";

/**
 * Reads one cookie value from a standard Cookie header.
 * @param cookieHeader Raw Cookie request header.
 * @param cookieName Exact cookie name to resolve.
 * @returns The decoded value, or undefined when absent or malformed.
 */
function readCookie(
  cookieHeader: string | null,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const segment of cookieHeader.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0) continue;
    if (segment.slice(0, separator).trim() !== cookieName) continue;
    const value = segment.slice(separator + 1).trim();
    if (!value) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Creates a private JSON response with a stable error contract.
 * @param status HTTP status code.
 * @param code Stable machine-readable error code.
 * @param message Safe user-facing message.
 * @returns A private JSON error response.
 */
function errorResponse(
  status: 400 | 401 | 403 | 500 | 503,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    { error: { code, message }, status },
    { status, headers: { "Cache-Control": PRIVATE_NO_STORE } },
  );
}

/**
 * Builds the authenticated student APK learning-content endpoint.
 * @param dependencies Shared auth, tenant database, and domain adapters.
 * @returns A GET handler for student-owned vocabulary or sentence content.
 */
export function createApkContentRoute(
  dependencies: ApkContentRouteDependencies,
): { GET: (request: ApkContentRequest) => Promise<NextResponse> } {
  return {
    GET: async (request) => {
      let url: URL;
      try {
        url = new URL(request.url);
      } catch {
        return errorResponse(400, "INVALID_QUERY", "Content selection is invalid");
      }

      const allowedParameters = new Set([
        "mode", "locale", "limit", "learningMode", "cartridgeId",
      ]);
      if (
        [...url.searchParams.keys()].some((key) => !allowedParameters.has(key))
        || [...allowedParameters].some((key) => url.searchParams.getAll(key).length > 1)
      ) {
        return errorResponse(400, "INVALID_QUERY", "Content selection is invalid");
      }

      const rawLimit = url.searchParams.get("limit");
      const learningMode = url.searchParams.get("learningMode") ?? "reading";
      const cartridgeId = url.searchParams.get("cartridgeId");
      const supportsAnswerAudio = cartridgeId !== null
        && ["wizard-vs-zombie", "dragon-flight", "dragon-rider"].includes(cartridgeId);
      const wantsAnswerAudio = learningMode === "answer-audio";
      const requestedLocale = url.searchParams.get("locale") ?? "th";
      if (
        wantsAnswerAudio
        && supportsAnswerAudio
        && url.searchParams.get("mode") === "vocabulary"
        && ["en", "cn", "tw", "vi"].includes(requestedLocale)
      ) {
        return errorResponse(503, "LISTENING_UNAVAILABLE", "Prepared audio is unavailable");
      }
      if (
        (learningMode !== "reading" && learningMode !== "answer-audio")
        || (wantsAnswerAudio && (
          !supportsAnswerAudio
          || url.searchParams.get("mode") !== "vocabulary"
          || requestedLocale !== "th"
        ))
        || (!wantsAnswerAudio && cartridgeId !== null)
      ) {
        return errorResponse(400, "INVALID_QUERY", "Content selection is invalid");
      }
      const answerAudioSession = wantsAnswerAudio ? {
        modality: "read-to-select-audio" as const,
        promptLocale: "th-TH" as const,
        answerLocale: "en-US" as const,
        promptField: "translation" as const,
        answerField: "term" as const,
        scored: true,
      } : undefined;
      const parsedInput = gameLearningContentInputSchema.safeParse({
        mode: url.searchParams.get("mode"),
        locale: url.searchParams.get("locale") ?? undefined,
        ...(rawLimit === null ? {} : { limit: Number(rawLimit) }),
        ...(answerAudioSession ? { answerAudioSession } : {}),
      });
      if (!parsedInput.success) {
        return errorResponse(400, "INVALID_QUERY", "Content selection is invalid");
      }

      const token = readCookie(
        request.headers.get("cookie"),
        dependencies.sessionCookieName,
      );
      if (!token) {
        return errorResponse(401, "UNAUTHORIZED", "Authentication required");
      }

      try {
        const session = await dependencies.validateSession(token);
        if (!session) {
          return errorResponse(401, "UNAUTHORIZED", "Authentication required");
        }
        if (session.user.role !== "STUDENT") {
          return errorResponse(403, "FORBIDDEN", "A student account is required");
        }
        if (!session.user.schoolId) {
          return errorResponse(403, "TENANT_REQUIRED", "A school assignment is required");
        }

        const tenant = { schoolId: session.user.schoolId };
        const result = await dependencies.listContent({
          db: dependencies.createTenantDb(session.user.schoolId),
          user: session.user,
          tenant,
          input: parsedInput.data,
        });
        const validated = gameLearningContentResultSchema.safeParse(result);
        if (!validated.success) {
          console.error({
            level: "error",
            event: "apk_content_invalid_domain_result",
          });
          return errorResponse(500, "INTERNAL_ERROR", "Unable to load learning content");
        }

        if (wantsAnswerAudio) {
          const speechLookup = dependencies.speechLookup ?? dependencies.getSpeechLookup?.();
          if (!speechLookup) {
            return errorResponse(503, "LISTENING_UNAVAILABLE", "Prepared audio is unavailable");
          }
          const preparedAnswerAudio = await (dependencies.prepareAnswerAudio ?? prepareGameAnswerAudio)({
            user: session.user,
            tenant,
            session: answerAudioSession!,
            content: validated.data.content,
            lookup: speechLookup,
            preparationTimeoutMs: dependencies.speechPreparationTimeoutMs ?? 5_000,
            signal: request.signal,
          });
          const answerAudioResult = preparedGameAnswerAudioLearningContentResultSchema.safeParse({
            ...validated.data,
            answerAudioSession,
            preparedAnswerAudio,
          });
          if (!answerAudioResult.success) {
            console.error({ level: "error", event: "apk_listening_invalid_domain_result" });
            return errorResponse(500, "INTERNAL_ERROR", "Unable to load learning content");
          }
          return NextResponse.json(answerAudioResult.data, {
            status: 200,
            headers: { "Cache-Control": PRIVATE_NO_STORE },
          });
        }

        return NextResponse.json(validated.data, {
          status: 200,
          headers: { "Cache-Control": PRIVATE_NO_STORE },
        });
      } catch (error) {
        if (error instanceof GameSpeechPreparationError) {
          return errorResponse(503, "LISTENING_UNAVAILABLE", "Prepared audio is unavailable");
        }
        console.error({ level: "error", event: "apk_content_failed" });
        return errorResponse(500, "INTERNAL_ERROR", "Unable to load learning content");
      }
    },
  };
}
