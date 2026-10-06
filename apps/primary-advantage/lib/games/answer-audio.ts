import {
  createAnswerChoiceAudioController,
  createBrowserAudioClipPorts,
  type AnswerChoiceAudioController,
} from "@reading-advantage/advantage-play-kit";
import {
  preparedReadToSelectAudioVocabularyResponseSchema,
  type PreparedReadToSelectAudioVocabularyResponse,
} from "@reading-advantage/game-contracts";

/** The 3D games with the English answer audio mode: a Thai question, English answer clips. */
export const ANSWER_AUDIO_GAME_IDS: ReadonlySet<string> = new Set(["hero-vs-zombie", "dragon-flight", "dragon-rider"]);

/**
 * Fetches the student's saved words with their prepared English answer clips.
 * @param gameId The 3D game id; the content route checks that the game has the mode.
 * @param signal Aborts the request when the page changes.
 * @returns The validated prepared response with at least one word.
 * @throws When the request fails (`unauthenticated` set on HTTP 401), the response is invalid, or it has no words.
 */
export async function fetchAnswerAudio(gameId: string, signal?: AbortSignal): Promise<PreparedReadToSelectAudioVocabularyResponse> {
  const res = await fetch(`/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=${gameId}`, { cache: "no-store", credentials: "same-origin", signal });
  if (!res.ok) throw Object.assign(new Error(`answer audio: HTTP ${res.status}`), { unauthenticated: res.status === 401 });
  const prepared = preparedReadToSelectAudioVocabularyResponseSchema.parse(await res.json());
  if (prepared.content.length === 0) throw new Error("answer audio: no saved words");
  return prepared;
}

/**
 * Makes the answer audio controller for one run from the prepared response.
 * @param prepared The prepared session and clips.
 * @returns A new controller that plays the clips in the browser.
 */
export function answerAudioControllerOf(prepared: PreparedReadToSelectAudioVocabularyResponse): AnswerChoiceAudioController {
  return createAnswerChoiceAudioController({
    session: prepared.answerAudioSession,
    clips: prepared.preparedAnswerAudio.clips.map(({ itemPosition, url, mediaType }) => ({ itemPosition, url, mediaType: mediaType as `audio/${string}` })),
    preparationTimeoutMs: 10_000,
    ...createBrowserAudioClipPorts(),
    ducking: { duck: () => () => undefined },
  });
}
