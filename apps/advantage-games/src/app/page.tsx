import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { gameCards } from '@/lib/gameCards'

export default function MainMenu() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-6xl space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-foreground">
            Vocab Arcade
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            High-precision vocabulary training
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {gameCards.map((game) => {
            const isPlayable = game.status === 'playable'

            return (
              <Card
                key={game.id}
                className={cn(
                  'group overflow-hidden transition-all duration-200 hover:border-foreground/50',
                  !isPlayable && 'border-dashed opacity-60'
                )}
              >
                <div className="relative w-full overflow-hidden border-b border-border bg-secondary">
                  <Image
                    src={game.cover}
                    alt={`${game.title} cover`}
                    width={1024}
                    height={1536}
                    sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
                    className={cn(
                      'w-full h-auto object-contain transition-transform duration-300 grayscale hover:grayscale-0',
                      isPlayable && 'group-hover:scale-105'
                    )}
                  />
                </div>
                <CardHeader className="gap-2 px-6 pt-6">
                  <CardTitle>{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-4">
                  {isPlayable && game.href ? (
                    <Button asChild className="w-full" size="lg">
                      <Link href={game.href}>Start Game</Link>
                    </Button>
                  ) : (
                    <Button disabled variant="secondary" className="w-full" size="lg">
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
