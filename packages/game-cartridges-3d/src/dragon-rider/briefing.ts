/** The start screen of Dragon Rider, in the APK briefing shape, from catalog keys (`audio.*` in answer audio). */
import type { GameBriefing, GameInput, ScopedI18n, PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';

export function briefing(i18n: ScopedI18n, _input: GameInput | PracticeInput, mode?: { answerAudio?: boolean }): GameBriefing {
  const t = i18n.scope('briefing').t;
  // Answer audio has its own read and choose steps and tip; the goal and the duel step are the same.
  const key = (k: string): string => (mode?.answerAudio && /^(instructions\.(read|choose)|tip)$/.test(k) ? `audio.${k}` : k);
  return {
    title: i18n.t('title'),
    subtitle: i18n.t('subtitle'),
    objective: t('objective'),
    instructions: (['read', 'choose', 'duel'] as const).map((k) => ({
      title: t(`${key(`instructions.${k}`)}.title`),
      description: t(`${key(`instructions.${k}`)}.description`),
    })),
    learningPreview: { heading: t('learningPreview') },
    controls: [
      { mode: 'touch', label: t('controls.touch.label'), action: t('controls.touch.action') },
      { mode: 'pointer', label: t('controls.pointer.label'), action: t('controls.pointer.action') },
    ],
    tip: t(key('tip')),
    labels: { startAction: t('start') },
    startPhase: 'playing',
  };
}
