import { render, screen } from '@testing-library/react'
import MainMenu from './page'
import { gameCards } from '@/lib/gameCards'

// Mock next/link since it's used in the component
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
  Link.displayName = 'Link'
  return Link
})

describe('MainMenu', () => {
  it('renders the title and game options', () => {
    render(<MainMenu />)
    
    expect(screen.getByText(/Vocab Arcade/i)).toBeInTheDocument()
    gameCards.forEach((game) => {
      expect(screen.getByText(game.title)).toBeInTheDocument()
    })

    const playableGames = gameCards.filter((game) => game.status === 'playable')
    const links = screen.getAllByRole('link', { name: /Start Game/i })
    const hrefs = links.map((link) => link.getAttribute('href'))
    expect(links).toHaveLength(playableGames.length)
    expect(hrefs).toEqual(
      expect.arrayContaining(
        playableGames.map((game) =>
          game.href?.startsWith('/qc') ? game.href : `/en${game.href}`
        )
      )
    )
  })

  it('includes a Start Game link for Enchanted Library', () => {
    render(<MainMenu />)

    const links = screen.getAllByRole('link', { name: /Start Game/i })
    const hasEnchantedLibrary = links.some(
      (link) => link.getAttribute('href')?.includes('/enchanted-library')
    )

    expect(hasEnchantedLibrary).toBe(true)
  })

  it('links to the isolated APK quality-control lab', () => {
    render(<MainMenu />)

    expect(
      screen.getByRole('link', { name: /Open APK QC Lab/i })
    ).toHaveAttribute('href', '/qc')
  })

  it('locale-prefixes the nine production APK arcade links', () => {
    render(<MainMenu />)

    const startLinks = screen.getAllByRole('link', { name: /Start Game/i })
    expect(startLinks.map((link) => link.getAttribute('href'))).toEqual(
      expect.arrayContaining([
        '/en/student/arcade/dragon-flight',
        '/en/student/arcade/dungeon-liberator',
        '/en/student/arcade/magic-defense',
        '/en/student/arcade/astral-mage',
        '/en/student/arcade/sorcerer-ziggurat',
        '/en/student/arcade/dragon-rider',
        '/en/student/arcade/spellweavers-run',
        '/en/student/arcade/griffin-riders-escape',
        '/en/student/arcade/storm-castle-tower',
      ])
    )
  })
})
