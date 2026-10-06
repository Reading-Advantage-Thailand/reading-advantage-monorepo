/** The answer-choice audio controller lives in the Advantage Play Kit; the 3D kit re-exports it for the games and the mount. */
export { ListeningAudioControllerError, createAnswerChoiceAudioController } from '@reading-advantage/advantage-play-kit';
export type {
  AnswerChoiceAudioController,
  AnswerChoiceAudioControllerOptions,
  AnswerChoiceAudioSnapshot,
  AnswerChoiceConfirmation,
  AnswerChoicePlaybackSnapshot,
  AudioClipPlaybackPort,
  AudioClipPreparationPort,
  AudioDuckingPort,
  ListeningAudioClipReference,
  ListeningAudioFailure,
  ListeningAudioFailureCode,
  ListeningAudioStatus,
} from '@reading-advantage/advantage-play-kit';
