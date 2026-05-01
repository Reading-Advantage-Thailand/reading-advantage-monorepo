'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Stage, Layer, Rect, Text, Group, Circle } from 'react-konva'
import {
  createLibraryState,
  tickLibrary,
  calculateXP,
  GAME_WIDTH,
  GAME_HEIGHT,
  TRAMPOLINE_HEIGHT,
  type LibraryState,
} from '@/lib/games/hauntedLibrary'
import type { VocabularyItem } from '@/store/useGameStore'
import { useSound } from '@/hooks/useSound'
import { useDirectionalInput } from '@/hooks/useDirectionalInput'
import { useGameFullscreen } from '@/hooks/useGameFullscreen'
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings'
import { VirtualDPad } from '@/components/ui/VirtualDPad'
import { GameEndScreen } from '@/components/games/game/GameEndScreen'
import { GameStartScreen } from '@/components/games/game/GameStartScreen'
import { Book, DoorOpen, Sparkles, Zap, AlertTriangle } from 'lucide-react'

interface HauntedLibraryGameProps {
  sentences: VocabularyItem[]
  onComplete: (results: { 
    xp: number; 
    accuracy: number;
    correctAnswers: number;
    totalAttempts: number;
  }) => void
}

export function HauntedLibraryGame({ sentences, onComplete }: HauntedLibraryGameProps) {
  const { containerRef, enterFullscreen, exitFullscreen } = useGameFullscreen()
  const { getEffectiveTextSize } = useAccessibilitySettings()
  const [gameState, setGameState] = useState<LibraryState | null>(null)
  const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'ended'>('start')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const { playSound } = useSound()
  const { input, setVirtualInput } = useDirectionalInput()
  const lastFrameRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  const startGame = useCallback(() => {
    if (sentences.length > 0) {
      setGameState(createLibraryState(sentences, { difficulty }))
      setGamePhase('playing')
    }
  }, [sentences, difficulty])

  const endGame = useCallback((finalState: LibraryState) => {
    setGamePhase('ended')
    onComplete({ 
      xp: calculateXP(finalState), 
      accuracy: finalState.totalAttempts > 0 ? finalState.correctAnswers / finalState.totalAttempts : 0,
      correctAnswers: finalState.correctAnswers,
      totalAttempts: finalState.totalAttempts
    })
  }, [onComplete])

  // Game Loop with requestAnimationFrame
  useEffect(() => {
    if (gamePhase !== 'playing') return

    const loop = (timestamp: number) => {
      const delta = lastFrameRef.current ? timestamp - lastFrameRef.current : 16
      lastFrameRef.current = timestamp
      const clampedDelta = Math.min(delta, 50)

      setGameState(prev => {
        if (!prev || prev.phase !== 'playing') return prev
        const nextState = tickLibrary(prev, clampedDelta, { dx: input.dx, dy: input.dy })
        if (nextState.phase !== 'playing') {
          endGame(nextState)
        }
        return nextState
      })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      lastFrameRef.current = 0
    }
  }, [gamePhase, input.dx, input.dy, endGame])

  // Fullscreen handling
  useEffect(() => {
    if (gamePhase === 'playing') {
      enterFullscreen()
    } else if (gamePhase === 'ended' || gamePhase === 'start') {
      exitFullscreen()
    }
  }, [gamePhase, enterFullscreen, exitFullscreen])

  useEffect(() => {
    if (gameState?.lastEvent) {
      switch (gameState.lastEvent) {
        case 'correct': playSound('success'); break
        case 'incorrect': playSound('error'); break
        case 'damage': playSound('error'); break
        case 'victory': playSound('success'); break
        case 'defeat': playSound('error'); break
      }
    }
  }, [gameState?.lastEvent, playSound])

  if (gamePhase === 'start') {
    return (
      <div className="absolute inset-0 z-50 bg-slate-950" ref={containerRef}>
        <GameStartScreen
          gameTitle="The Haunted Library"
          gameSubtitle="A Spooky Word Adventure"
          vocabulary={sentences}
          onStart={startGame}
          icon={Book}
          instructions={[
            { step: 1, text: "Explore the library floors using the DPad or Arrow Keys.", icon: Sparkles },
            { step: 2, text: "Bounce on the orange trampolines at the edges to reach higher floors.", icon: Zap },
            { step: 3, text: "Open doors by pressing UP when nearby to collect the next word.", icon: DoorOpen },
            { step: 4, text: "Avoid ghosts and bats! Slamming a door on a ghost will stun it.", icon: AlertTriangle }
          ]}
          proTip="Collecting words in the correct order is key to purifying the library!"
          controls={[
            { label: "Move", keys: "Arrow Keys / WASD", color: "bg-blue-500" },
            { label: "Open Door", keys: "Up Arrow / W", color: "bg-green-500" },
            { label: "Bounce", keys: "Move to Edges", color: "bg-orange-500" }
          ]}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-wider text-white/50" style={{ fontSize: getEffectiveTextSize(16) }}>Difficulty:</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className="bg-slate-800 border border-white/20 rounded-lg px-3 py-1.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{ fontSize: getEffectiveTextSize(16) }}
            >
              <option value="easy">Novice Scholarly</option>
              <option value="medium">Master Archivist</option>
              <option value="hard">Forbidden Knowledge</option>
            </select>
          </div>
        </GameStartScreen>
      </div>
    )
  }


  if (gamePhase === 'ended' && gameState) {
    return (
      <div ref={containerRef} className="absolute inset-0 z-50">
        <GameEndScreen
          status={gameState.phase === 'victory' ? 'victory' : 'defeat'}
          score={gameState.score}
          xp={calculateXP(gameState)}
          accuracy={gameState.totalAttempts > 0 ? gameState.correctAnswers / gameState.totalAttempts : 0}
          onRestart={startGame}
          title="The Haunted Library"
        />
      </div>
    )
  }


  if (!gameState) return null

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-[600px] bg-slate-900 rounded-lg overflow-hidden shadow-2xl border-4 border-slate-700 relative">
      <Stage width={GAME_WIDTH} height={GAME_HEIGHT}>
        <Layer>
          {/* Background */}
          <Rect width={GAME_WIDTH} height={GAME_HEIGHT} fill="#1a1a2e" />
          
          {/* Floors */}
          {gameState.floors.map((floor, i) => (
            <React.Fragment key={i}>
              <Rect
                x={0}
                y={floor.y}
                width={GAME_WIDTH}
                height={floor.height}
                fill="#4a4a4a"
              />
              {/* Trampolines at edges */}
              <Rect
                x={0}
                y={floor.y - TRAMPOLINE_HEIGHT}
                width={40}
                height={TRAMPOLINE_HEIGHT}
                fill="#ff4500"
                cornerRadius={[4, 4, 0, 0]}
              />
              <Rect
                x={GAME_WIDTH - 40}
                y={floor.y - TRAMPOLINE_HEIGHT}
                width={40}
                height={TRAMPOLINE_HEIGHT}
                fill="#ff4500"
                cornerRadius={[4, 4, 0, 0]}
              />
            </React.Fragment>
          ))}

          {/* Doors */}
          {gameState.doors.map((door) => (
            <Group key={door.id} x={door.x} y={door.y}>
              <Rect
                width={60}
                height={80}
                fill={door.isOpen ? (door.isCorrect ? "#22c55e" : "#ef4444") : "#8b4513"}
                stroke="#5d2e0a"
                strokeWidth={2}
                cornerRadius={2}
              />
              {door.isOpen && door.word && (
                <Text
                  text={door.word}
                  fontSize={getEffectiveTextSize(16)}
                  fontStyle="bold"
                  fill="white"
                  width={60}
                  align="center"
                  y={30}
                />
              )}
            </Group>
          ))}

          {/* Ghosts */}
          {gameState.ghosts.map((ghost) => (
            <Group key={ghost.id} x={ghost.x} y={ghost.y}>
              <Circle
                radius={24}
                x={24}
                y={24}
                fill={ghost.state === 'stunned' ? "rgba(200, 200, 255, 0.4)" : "rgba(100, 150, 255, 0.6)"}
                stroke={ghost.state === 'stunned' ? "#999" : "#fff"}
                strokeWidth={1}
              />
              {ghost.state === 'stunned' && (
                <Text
                  text="ZZZ"
                  fontSize={getEffectiveTextSize(16)}
                  fill="white"
                  x={10}
                  y={-10}
                />
              )}
            </Group>
          ))}

          {/* Bats */}
          {gameState.bats.map((bat) => (
            <Rect
              key={bat.id}
              x={bat.x}
              y={bat.y}
              width={bat.width}
              height={bat.height}
              fill="#ef4444"
              cornerRadius={16}
            />
          ))}

          {/* Player */}
          <Rect
            x={gameState.player.x}
            y={gameState.player.y}
            width={gameState.player.width}
            height={gameState.player.height}
            fill="#3b82f6"
            cornerRadius={4}
            stroke="#fff"
            strokeWidth={2}
          />
        </Layer>
      </Stage>

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-black/50 text-white backdrop-blur-sm">
        <div className="text-center font-bold mb-2" style={{ fontSize: getEffectiveTextSize(20) }}>
          {gameState.currentSentence.translation}
        </div>
        <div className="flex justify-between items-center" style={{ fontSize: getEffectiveTextSize(16) }}>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 font-bold">
              <Book className="w-4 h-4 text-blue-400" /> {gameState.lives}
            </span>
            <span className="font-bold">Score: {gameState.score}</span>
          </div>
          <div className="flex gap-1">
            {gameState.words.map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-3 rounded-full ${i < gameState.nextWordIndex ? 'bg-green-500' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 pointer-events-none">
        <VirtualDPad onInput={setVirtualInput} />
      </div>
    </div>
  )
}
