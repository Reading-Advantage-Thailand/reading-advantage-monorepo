import { act, render, screen, waitFor } from '@testing-library/react'
import RpgBattlePage from './page'
import { useRPGBattleStore } from '@/store/useRPGBattleStore'
import { withBasePath } from '@/lib/games/basePath'

jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
  Link.displayName = 'Link'
  return Link
})

describe('RpgBattlePage', () => {
  beforeEach(() => {
    useRPGBattleStore.setState({
      status: 'idle',
      selectionStep: 'hero',
      selectedHeroId: null,
      selectedLocationId: null,
      selectedEnemyId: null,
    })
  })

  it('renders the RPG battle shell', () => {
    render(<RpgBattlePage />)

    expect(screen.getByText(/RPG Battle/i)).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Battle Log')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })

  it('shows the selection modal before the battle starts', () => {
    render(<RpgBattlePage />)

    expect(screen.getByRole('heading', { name: /choose your hero/i })).toBeInTheDocument()
    expect(useRPGBattleStore.getState().status).toBe('idle')
  })

  it('starts the battle once selections are complete', async () => {
    render(<RpgBattlePage />)

    act(() => {
      const { selectHero, selectLocation, selectEnemy } = useRPGBattleStore.getState()
      selectHero('male')
      selectLocation('forest-clearing')
      selectEnemy('slime')
    })

    await waitFor(() => {
      expect(useRPGBattleStore.getState().status).toBe('playing')
    })
  })

  it('applies the selected location background to the battle stage', async () => {
    render(<RpgBattlePage />)

    act(() => {
      const { selectHero, selectLocation, selectEnemy } = useRPGBattleStore.getState()
      selectHero('female')
      selectLocation('magic-arena')
      selectEnemy('goblin')
    })

    await waitFor(() => {
      const stage = screen.getByTestId('battle-stage')
      expect(stage).toHaveStyle({
        backgroundImage: `url(${withBasePath('/games/rpg-battle/background_magic_arena.png')})`,
      })
    })
  })
})
