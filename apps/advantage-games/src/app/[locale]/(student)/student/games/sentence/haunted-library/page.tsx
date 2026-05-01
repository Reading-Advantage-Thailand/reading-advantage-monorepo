'use client'

import React, { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/store/useGameStore'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useCurrentLocale, useScopedI18n } from '@/locales/client'
import { useSession } from '@/hooks/useSession'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import Link from 'next/link'

const HauntedLibraryGame = dynamic(
  () =>
    import('@/components/games/sentence/haunted-library/HauntedLibraryGame').then(
      (mod) => mod.HauntedLibraryGame,
    ),
  { ssr: false },
)

type WarningStatus = {
  type: 'NO_SENTENCES' | 'INSUFFICIENT_SENTENCES' | null
  requiredCount?: number
  currentCount?: number
}

export default function HauntedLibraryPage() {
  const [sentences, setSentences] = useState<
    { term: string; translation: string }[]
  >([])
  const setLastResult = useGameStore((state) => state.setLastResult)
  const [warningStatus, setWarningStatus] = useState<WarningStatus>({
    type: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const locale = useCurrentLocale()
  const t = useScopedI18n('pages.student.gamesPage')
  const { data: session } = useSession()

  useEffect(() => {
    const fetchSentences = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(
          `/api/v1/games/haunted-library/sentences?locale=${locale}`,
        )
        const data = await res.json()

        if (data.warning === 'NO_SENTENCES') {
          setWarningStatus({ type: 'NO_SENTENCES' })
        } else if (data.warning === 'INSUFFICIENT_SENTENCES') {
          setWarningStatus({
            type: 'INSUFFICIENT_SENTENCES',
            requiredCount: data.requiredCount,
            currentCount: data.currentCount,
          })
        } else {
          setWarningStatus({ type: null })
          setSentences(data.sentences || [])
        }
      } catch (error) {
        console.error('Failed to load sentences:', error)
        setWarningStatus({ type: 'NO_SENTENCES' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSentences()
  }, [locale])

  const handleComplete = useCallback(
    async (results: { 
      xp: number; 
      accuracy: number; 
      correctAnswers: number; 
      totalAttempts: number 
    }) => {
      setLastResult(results.xp, results.accuracy)

      try {
        await fetch('/api/v1/games/haunted-library/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            xpEarned: results.xp,
            accuracy: results.accuracy,
            correctAnswers: results.correctAnswers,
            totalAttempts: results.totalAttempts,
            userId: session?.user?.id,
          }),
        })
      } catch (e) {
        console.error('Failed to submit game results', e)
      }
    },
    [setLastResult, session],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-slate-100">
        <Header heading="Haunted Library" />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
            <p className="text-blue-300 animate-pulse font-medium">
              {t('loading') || 'Searching the Restricted Section...'}
            </p>
          </div>
        </main>
      </div>
    )
  }

  if (warningStatus.type) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header heading="Haunted Library" />
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md border-2 border-blue-500/50 bg-blue-950/30 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                <AlertTriangle className="h-8 w-8 text-blue-400" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-blue-100">
                  {warningStatus.type === 'NO_SENTENCES'
                    ? 'Library Catalog Empty'
                    : 'Missing Tomes'}
                </h2>
                <p className="text-blue-200/80">
                  {warningStatus.type === 'NO_SENTENCES'
                    ? 'No sentences found in the library. Add some to start your study!'
                    : `You need at least ${warningStatus.requiredCount} sentences to play. You currently have ${warningStatus.currentCount}.`}
                </p>
              </div>

              <Button asChild variant="default" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg">
                <Link href="/">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Header heading="Haunted Library" />
      <main className="flex-1 p-4 flex items-center justify-center max-w-4xl mx-auto w-full">
        <HauntedLibraryGame
          sentences={sentences}
          onComplete={handleComplete}
        />
      </main>
    </div>
  )
}
