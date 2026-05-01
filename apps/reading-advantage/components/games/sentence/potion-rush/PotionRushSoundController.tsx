'use client'

import { useEffect, useRef } from 'react'
import { usePotionRushStore } from '@/store/usePotionRushStore'
import { useSound } from '@/hooks/useSound'

export default function PotionRushSoundController() {
  const { playSound } = useSound()
  const lastScore = useRef(0)
  const lastReputation = useRef(100)
  const lastCauldronStates = useRef<string[]>([])
  const lastCauldronWordCounts = useRef<number[]>([0, 0, 0])

  useEffect(() => {
    // Initial state
    const state = usePotionRushStore.getState()
    lastScore.current = state.score
    lastReputation.current = state.reputation
    lastCauldronStates.current = state.cauldrons.map(c => c.state)
    lastCauldronWordCounts.current = state.cauldrons.map(c => c.currentWords.length)

    const unsubscribe = usePotionRushStore.subscribe((state) => {
      // 1. Score increased -> Cash Register
      if (state.score > lastScore.current) {
        playSound('cash-register')
      }
      lastScore.current = state.score

      // 2. Reputation decreased -> Angry Grunt
      if (state.reputation < lastReputation.current) {
        playSound('angry-grunt')
      }
      lastReputation.current = state.reputation

      // 3. Cauldron Changes
      state.cauldrons.forEach((cauldron, index) => {
        const prevState = lastCauldronStates.current[index]
        const prevCount = lastCauldronWordCounts.current[index]

        if (cauldron.state !== prevState) {
          if (cauldron.state === 'BREWING' && (prevState === 'IDLE')) {
            playSound('bubbling')
          } else if (cauldron.state === 'WARNING') {
            playSound('error')
          } else if (cauldron.state === 'COMPLETED') {
            playSound('success')
          }
        } else if (cauldron.state === 'BREWING' && cauldron.currentWords.length > prevCount) {
          // Added a correct word
          playSound('bubbling')
        }
      })
      lastCauldronStates.current = state.cauldrons.map(c => c.state)
      lastCauldronWordCounts.current = state.cauldrons.map(c => c.currentWords.length)
    })

    return () => unsubscribe()
  }, [playSound])

  return null
}
