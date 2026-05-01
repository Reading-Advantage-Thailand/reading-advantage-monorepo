'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GameEndScreen } from '@/components/games/game/GameEndScreen'
import { GameStartScreen } from '@/components/games/game/GameStartScreen'
import type { GameStartScreenProps } from '@/components/games/game/GameStartScreen'
import { Crown, ScrollText, Shield, Swords, Wand2 } from 'lucide-react'

type PreviewMode = 'start' | 'victory' | 'defeat' | 'complete'

const sampleVocabulary = [
  { term: 'The knight defends the castle.', translation: 'El caballero defiende el castillo.' },
  { term: 'The dragon breathes fire.', translation: 'El dragón escupe fuego.' },
  { term: 'The wizard casts a spell.', translation: 'El mago lanza un hechizo.' },
  { term: 'The shield blocks the strike.', translation: 'El escudo bloquea el golpe.' },
  { term: 'The quest begins at dawn.', translation: 'La misión comienza al amanecer.' },
]

const sampleInstructions: GameStartScreenProps['instructions'] = [
  { step: 1, text: 'Review the sentence list before entering the arena.', icon: ScrollText },
  { step: 2, text: 'Answer quickly to build a stronger streak bonus.', icon: Wand2 },
  { step: 3, text: 'Defeat the final enemy to claim your reward.', icon: Crown },
]

const sampleControls: GameStartScreenProps['controls'] = [
  { label: 'Move', keys: 'Arrows / WASD', color: 'bg-amber-500' },
  { label: 'Confirm', keys: 'Enter', color: 'bg-emerald-500' },
  { label: 'Select', keys: 'Mouse / Tap', color: 'bg-sky-500' },
]

export default function GameScreensDevPage() {
  const [mode, setMode] = useState<PreviewMode>('start')

  const endStatus = useMemo(() => {
    if (mode === 'victory') return 'victory'
    if (mode === 'defeat') return 'defeat'
    return 'complete'
  }, [mode])

  return (
    <main className='min-h-screen bg-slate-950 text-white'>
      <h1 className='sr-only'>Unified Game Screens Preview</h1>
      <div className='relative min-h-screen'>
        <div className='absolute left-4 top-4 z-[60] flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 backdrop-blur'>
          <Link href='/' className='text-white/70 transition hover:text-white'>
            Back to Home
          </Link>
          <span className='hidden sm:inline'>Unified Game Screens Preview</span>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => setMode('start')}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.2em] transition ${
                mode === 'start' ? 'bg-amber-500 text-slate-900' : 'bg-white/10 text-white'
              }`}
            >
              Start
            </button>
            <button
              type='button'
              onClick={() => setMode('victory')}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.2em] transition ${
                mode === 'victory' ? 'bg-emerald-500 text-slate-900' : 'bg-white/10 text-white'
              }`}
            >
              End: Victory
            </button>
            <button
              type='button'
              onClick={() => setMode('defeat')}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.2em] transition ${
                mode === 'defeat' ? 'bg-rose-500 text-slate-900' : 'bg-white/10 text-white'
              }`}
            >
              End: Defeat
            </button>
            <button
              type='button'
              onClick={() => setMode('complete')}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.2em] transition ${
                mode === 'complete' ? 'bg-amber-500 text-slate-900' : 'bg-white/10 text-white'
              }`}
            >
              End: Complete
            </button>
          </div>
        </div>

        {mode === 'start' ? (
          <GameStartScreen
            gameTitle='Dragon Flight'
            gameSubtitle='Skyward Trials'
            vocabulary={sampleVocabulary}
            instructions={sampleInstructions}
            proTip='Complete streaks quickly to unlock bonus XP.'
            controls={sampleControls}
            icon={Shield}
            onStart={() => setMode('victory')}
          />
        ) : (
          <GameEndScreen
            status={endStatus}
            score={1250}
            xp={240}
            accuracy={0.86}
            customStats={[
              { label: 'Dragons Saved', value: 5, icon: Shield },
              { label: 'Boss Power', value: 3, icon: Swords },
            ]}
            onRestart={() => setMode('start')}
            onExit={() => setMode('start')}
          />
        )}
      </div>
    </main>
  )
}
