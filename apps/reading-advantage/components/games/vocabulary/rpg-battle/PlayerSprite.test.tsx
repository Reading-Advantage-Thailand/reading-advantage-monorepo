import { render, screen } from '@testing-library/react'
import { PlayerSprite } from './PlayerSprite'

describe('PlayerSprite', () => {
  it('renders the player pose sheet placeholder', () => {
    render(<PlayerSprite />)

    expect(screen.getByAltText('Player sprite sheet')).toBeInTheDocument()
  })
})
