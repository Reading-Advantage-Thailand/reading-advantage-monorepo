/** The start screen of Castle Defense, in the APK briefing shape, from catalog keys. */
import type { GameBriefing, GameInput, ScopedI18n, PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';

export function briefing(i18n: ScopedI18n, _input: GameInput | PracticeInput): GameBriefing {
  const t = i18n.scope('briefing').t;
  return {
    title: i18n.t('title'),
    subtitle: i18n.t('subtitle'),
    objective: t('objective'),
    instructions: (['read', 'build', 'tower'] as const).map((k) => ({ title: t(`instructions.${k}.title`), description: t(`instructions.${k}.description`) })),
    learningPreview: { heading: t('learningPreview') },
    controls: [
      { mode: 'touch', label: t('controls.touch.label'), action: t('controls.touch.action') },
      { mode: 'pointer', label: t('controls.pointer.label'), action: t('controls.pointer.action') },
    ],
    tip: t('tip'),
    labels: { startAction: t('start') },
    startPhase: 'playing',
  };
}
