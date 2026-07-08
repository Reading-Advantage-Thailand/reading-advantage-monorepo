'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import {
  createAbyssalWellState,
  advanceAbyssalWellTime,
  fireProjectile,
  rotatePlayer,
  spawnEnemy,
  startGame,
  calculateXP,
  type AbyssalWellState,
  type SentenceItem,
} from '@/lib/games/abyssalWell'
import { ABYSSAL_WELL_CONFIG } from '@/lib/games/abyssalWellConfig'
import type { CreatureType, AbyssalWellDifficulty } from '@/lib/games/abyssalWellConfig'
import { useGameFullscreen } from '@/hooks/useGameFullscreen'
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings'
import { GameEndScreen } from '@/components/games/game/GameEndScreen'
import { GameStartScreen } from '@/components/games/game/GameStartScreen'
import { AbyssalWellScene } from './AbyssalWellScene'
import { Flame, BookOpen, AlertTriangle, Target } from 'lucide-react'

export type AbyssalWellGameResult = {
  xp: number
  accuracy: number
}

interface AbyssalWellGameProps {
  sentences: SentenceItem[]
  onComplete: (results: AbyssalWellGameResult) => void
}

export function AbyssalWellGame({ sentences, onComplete }: AbyssalWellGameProps) {
  const { containerRef, enterFullscreen, exitFullscreen } = useGameFullscreen()
  const { getEffectiveTextSize } = useAccessibilitySettings()
  const [gameState, setGameState] = useState<AbyssalWellState | null>(null)

  // Live mirror of `gameState` so the RAF loop can tick outside the React
  // state updater. Updaters must stay pure — StrictMode double-invokes them,
  // and the spawn bookkeeping below mutates `lastSpawnRef`, so running it
  // inside the updater made the discarded first invocation consume every
  // spawn window (no enemy ever appeared).
  const gameStateRef = useRef<AbyssalWellState | null>(null)
  gameStateRef.current = gameState
  const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'ended'>('start')
  const [results, setResults] = useState<AbyssalWellGameResult | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<AbyssalWellDifficulty>('medium')
  const [selectedCreature, setSelectedCreature] = useState<CreatureType>('cave-spider')
  const hasReportedRef = useRef(false)
  const lastSpawnRef = useRef(0)
  const lastFrameRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const resetGame = useCallback(() => {
    if (sentences.length > 0) {
      setGameState(createAbyssalWellState(sentences, {
        difficulty: selectedDifficulty,
        creatureType: selectedCreature,
      }))
      setResults(null)
      hasReportedRef.current = false
      lastSpawnRef.current = 0
    }
  }, [sentences, selectedDifficulty, selectedCreature])

  useEffect(() => {
    if (sentences.length > 0 && gamePhase === 'start') {
      resetGame()
    }
  }, [sentences, gamePhase, resetGame])

  useEffect(() => {
    if (gamePhase !== 'playing') return

    const loop = (timestamp: number) => {
      const delta = lastFrameRef.current ? timestamp - lastFrameRef.current : 16
      lastFrameRef.current = timestamp
      const clampedDelta = Math.min(delta, 50)
      const prevState = gameStateRef.current
      if (prevState && prevState.phase === 'playing') {
        let nextState = advanceAbyssalWellTime(prevState, clampedDelta)

        if (nextState.gameTime - lastSpawnRef.current > ABYSSAL_WELL_CONFIG.enemy.spawnInterval) {
          nextState = spawnEnemy(nextState)
          lastSpawnRef.current = nextState.gameTime
        }

        gameStateRef.current = nextState
        setGameState(nextState)
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = 0
    }
  }, [gamePhase])

  useEffect(() => {
    if (gamePhase === 'playing') {
      enterFullscreen()
    } else {
      exitFullscreen()
    }
  }, [gamePhase, enterFullscreen, exitFullscreen])

  useEffect(() => {
    if (gameState?.phase === 'victory' || gameState?.phase === 'defeat') {
      if (gamePhase !== 'ended') {
        const accuracy = gameState.totalAttempts > 0
          ? gameState.correctWords / gameState.totalAttempts
          : 0
        const xp = calculateXP({
          correctWords: gameState.correctWords,
          totalAttempts: gameState.totalAttempts,
          lives: gameState.player.lives,
          initialLives: ABYSSAL_WELL_CONFIG.lives,
          gameTime: gameState.gameTime,
        })
        setResults({ xp, accuracy })
        setGamePhase('ended')
      }
    }
  }, [gameState?.phase, gamePhase, gameState])

  useEffect(() => {
    if (gamePhase === 'ended' && results && !hasReportedRef.current) {
      hasReportedRef.current = true
      onComplete(results)
    }
  }, [gamePhase, results, onComplete])

  const handleRotate = useCallback((direction: number) => {
    if (gameState && gameState.phase === 'playing' && gamePhase === 'playing') {
      setGameState(prevState => {
        if (!prevState || prevState.phase !== 'playing') return prevState
        return rotatePlayer(prevState, direction)
      })
    }
  }, [gameState, gamePhase])

  const handleFire = useCallback(() => {
    if (gameState && gameState.phase === 'playing' && gamePhase === 'playing') {
      setGameState(prevState => {
        if (!prevState || prevState.phase !== 'playing') return prevState
        return fireProjectile(prevState)
      })
    }
  }, [gameState, gamePhase])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gamePhase !== 'playing') return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleRotate(-1)
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleRotate(1)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleFire()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gamePhase, handleRotate, handleFire])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (gamePhase !== 'playing' || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const x = touch.clientX - rect.left
    const centerX = rect.width / 2

    if (x < centerX - 50) {
      handleRotate(-1)
    } else if (x > centerX + 50) {
      handleRotate(1)
    } else {
      handleFire()
    }
  }, [gamePhase, handleRotate, handleFire, containerRef])

  if (gamePhase === 'start') {
    return (
      <div
        ref={containerRef}
        className="relative h-[75vh] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10 touch-none md:aspect-video md:h-auto"
      >
        <GameStartScreen
          gameTitle="The Abyssal Well"
          gameSubtitle="Defend the Rim"
          vocabulary={sentences}
          instructions={[
            { step: 1, text: 'Enemies climb up from the well carrying word orbs.', icon: BookOpen },
            { step: 2, text: 'Shoot the enemies in the correct sentence order!', icon: Target },
            { step: 3, text: 'If an enemy reaches the rim, you lose a life. Don\'t let them through!', icon: AlertTriangle },
          ]}
          proTip="Rotate left/right to aim, tap center to fire. Hit enemies carrying the correct word in sequence!"
          controls={[
            { label: 'Rotate', keys: '← → / A D', color: 'bg-cyan-500' },
            { label: 'Fire', keys: 'Space / Tap Center', color: 'bg-purple-500' },
          ]}
          startButtonText="Enter the Well"
          icon={Flame}
          onStart={() => {
            resetGame()
            const startedState = startGame(gameState!)
            setGameState(startedState)
            setGamePhase('playing')
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="abyssal-difficulty" className="text-sm uppercase tracking-wider text-white/50">Well Depth:</label>
              <select
                id="abyssal-difficulty"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as AbyssalWellDifficulty)}
                className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="easy">Shallow Well</option>
                <option value="medium">Deep Chasm</option>
                <option value="hard">Abyss</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="abyssal-creature" className="text-sm uppercase tracking-wider text-white/50">Enemy Type:</label>
              <select
                id="abyssal-creature"
                value={selectedCreature}
                onChange={(e) => setSelectedCreature(e.target.value as CreatureType)}
                className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="goblin-scout">Goblin Scout (Slow)</option>
                <option value="cave-spider">Cave Spider (Medium)</option>
                <option value="shadow-demon">Shadow Demon (Fast)</option>
              </select>
            </div>
          </div>
        </GameStartScreen>
      </div>
    )
  }

  if (gamePhase === 'ended' && results) {
    return (
      <div
        ref={containerRef}
        className="relative h-[75vh] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10 touch-none md:aspect-video md:h-auto"
      >
        <GameEndScreen
          status={gameState?.phase === 'victory' ? 'victory' : 'defeat'}
          score={gameState?.correctWords ?? 0}
          xp={results.xp}
          accuracy={results.accuracy}
          onRestart={() => {
            resetGame()
            setGamePhase('start')
          }}
          customStats={[
            { label: 'Words Collected', value: gameState?.correctWords ?? 0 },
            { label: 'Lives Left', value: gameState?.player.lives ?? 0 },
          ]}
        />
      </div>
    )
  }

  const targetWord = gameState?.words[gameState.targetIndex] ?? ''
  const textScale = getEffectiveTextSize(16) / 16

  return (
    <div
      ref={containerRef}
      className="relative h-[75vh] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/10 touch-none md:aspect-video md:h-auto"
      onTouchStart={handleTouchStart}
    >
      {gameState && (
        <Canvas
          className="absolute inset-0"
          camera={{ position: [0, 0, 3.2], fov: 75, near: 0.1, far: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: false }}
        >
          <color attach="background" args={['#0f172a']} />
          <AbyssalWellScene state={gameState} textScale={textScale} />
          <EffectComposer>
            <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.6} mipmapBlur />
          </EffectComposer>
        </Canvas>
      )}

      {/* DOM HUD: kept out of the 3D scene for accessibility and text scaling */}
      {gameState && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <span
              className="rounded-lg bg-red-500/20 px-2 py-1 font-bold text-red-300"
              style={{ fontSize: getEffectiveTextSize(16) }}
            >
              ❤️ {gameState.player.lives}
            </span>
            <span
              className="rounded-lg bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-300"
              style={{ fontSize: getEffectiveTextSize(18) }}
            >
              Target: {targetWord}
            </span>
          </div>
          <p
            className="text-center text-slate-300/90"
            style={{ fontSize: getEffectiveTextSize(16) }}
          >
            {gameState.sentence.translation}
          </p>
        </div>
      )}

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 text-sm text-white/50">
        <span>← → Rotate</span>
        <span>Space = Fire</span>
      </div>
    </div>
  )
}
