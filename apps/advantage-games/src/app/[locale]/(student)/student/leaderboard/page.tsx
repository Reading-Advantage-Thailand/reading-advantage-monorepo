'use client'

import { useLeaderboard } from '@/hooks/useLeaderboard'
import Link from 'next/link'
import { ChevronLeft, Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LeaderboardPage() {
  const { getLeaderboard, clearHistory } = useLeaderboard()
  const [showConfirm, setShowConfirm] = useState(false)
  const leaderboard = getLeaderboard()

  const highScoreList = Object.values(leaderboard.highScores).sort(
    (a, b) => b.bestScore - a.bestScore
  )

  const handleClear = () => {
    clearHistory()
    setShowConfirm(false)
  }

  return (
    <main className="min-h-screen px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Arcade
          </Link>
          {showConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Clear all history?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear History
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-4">
            Total XP Earned
          </div>
          <div className="text-6xl font-bold tracking-tighter text-foreground">
            {leaderboard.totalXp.toLocaleString()}
          </div>
        </div>

        {highScoreList.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-6 py-4 bg-secondary/30">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                High Scores
              </h2>
            </div>
            <div className="divide-y divide-border">
              {highScoreList.map((game, index) => (
                <div
                  key={game.gameId}
                  className="flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold border ${
                        index === 0
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-secondary text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {game.gameName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Best: {game.bestScore.toLocaleString()} pts ·{' '}
                        {game.bestXp.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(game.lastPlayed)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {leaderboard.sessions.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-6 py-4 bg-secondary/30">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Recent Sessions
              </h2>
            </div>
            <div className="divide-y divide-border">
              {leaderboard.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-semibold text-foreground">
                        {session.gameName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Score: {session.score.toLocaleString()} ·{' '}
                        {session.accuracy}% accuracy
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">
                      +{session.xp} XP
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(session.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Trophy className="mx-auto mb-4 h-10 w-10 text-muted-foreground/20" />
            <h3 className="text-xl font-bold text-muted-foreground mb-2">
              No sessions recorded
            </h3>
            <p className="text-sm text-muted-foreground">
              Complete any challenge to see your history.
            </p>
            <Link href="/">
              <Button className="mt-6 px-8 rounded-full">Explore Games</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
