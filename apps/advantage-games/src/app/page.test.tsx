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
    const links = screen.getAllByRole('link', { name: /Play Now/i })
    const hrefs = links.map((link) => link.getAttribute('href'))
    expect(links).toHaveLength(playableGames.length)
    expect(hrefs).toEqual(expect.arrayContaining(playableGames.map((game) => game.href)))
  })

  it('includes a Play Now link for Enchanted Library', () => {
    render(<MainMenu />)

    const links = screen.getAllByRole('link', { name: /Play Now/i })
    const hasEnchantedLibrary = links.some(
      (link) => link.getAttribute('href')?.includes('/enchanted-library')
    )

    expect(hasEnchantedLibrary).toBe(true)
  })
})
