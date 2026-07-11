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
        playableGames.map((game) => `/en${game.href}`)
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

  it('does not expose the withdrawn APK quality-control lab', () => {
    render(<MainMenu />)

    expect(
      screen.queryByRole('link', { name: /Open APK QC Lab/i })
    ).not.toBeInTheDocument()
  })

  it('does not expose withdrawn APK arcade links', () => {
    render(<MainMenu />)

    const startLinks = screen.getAllByRole('link', { name: /Start Game/i })
    expect(startLinks.some((link) => link.getAttribute('href')?.includes('/student/arcade/'))).toBe(false)
  })
})
