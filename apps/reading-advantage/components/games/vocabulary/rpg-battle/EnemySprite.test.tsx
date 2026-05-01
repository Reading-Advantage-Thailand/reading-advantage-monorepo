import { render, screen } from '@testing-library/react'
import { EnemySprite } from './EnemySprite'

describe('EnemySprite', () => {
  it('renders the enemy pose sheet placeholder', () => {
    render(<EnemySprite />)

    expect(screen.getByAltText('Enemy sprite sheet')).toBeInTheDocument()
  })
})
