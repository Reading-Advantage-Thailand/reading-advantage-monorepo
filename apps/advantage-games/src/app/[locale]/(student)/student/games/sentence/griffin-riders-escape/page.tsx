'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { VocabularyItem } from '@/store/useGameStore'
import { useCurrentLocale, useScopedI18n } from '@/locales/client'
import { useSession } from '@/hooks/useSession'

const GriffinRidersEscapeGame = dynamic(
  () => import('@/components/games/sentence/griffin-riders-escape/GriffinRidersEscapeGame').then(mod => mod.GriffinRidersEscapeGame),
  { ssr: false },
)

export default function GriffinRidersEscapePage() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const locale = useCurrentLocale()
  const t = useScopedI18n('pages.student.gamesPage')
  const { data: session } = useSession()

  useEffect(() => {
    async function fetchVocabulary() {
      try {
        const response = await fetch(`/api/v1/games/griffin-riders-escape/sentences?locale=${locale}`)
        const data = await response.json()
        if (data.sentences) {
          setVocabulary(data.sentences)
        }
      } catch (error) {
        console.error('Failed to fetch sentences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVocabulary()
  }, [locale])

  const handleComplete = async (results: { accuracy: number; xp: number }) => {
    try {
      await fetch('/api/v1/games/griffin-riders-escape/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...results,
          userId: session?.user?.id,
        }),
      })
    } catch (error) {
      console.error('Failed to submit results:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-xl font-medium text-slate-400 animate-pulse">{t('loading') || 'Loading Skyscape...'}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <GriffinRidersEscapeGame
        vocabulary={vocabulary}
        onComplete={handleComplete}
      />
    </div>
  )
}
