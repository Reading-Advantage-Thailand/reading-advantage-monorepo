import { render, screen } from '@testing-library/react'
import { BattleLog } from './BattleLog'

const entries = [
  { text: 'You cast Fireball!', type: 'player' as const },
  { text: 'Slime takes 12 damage.', type: 'system' as const },
  { text: 'Slime attacks!', type: 'enemy' as const },
]

describe('BattleLog', () => {
  it('renders battle log entries in order', () => {
    render(<BattleLog entries={entries} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('You cast Fireball!')
    expect(items[1]).toHaveTextContent('Slime takes 12 damage.')
    expect(items[2]).toHaveTextContent('Slime attacks!')
  })

  it('renders an empty state when there are no entries', () => {
    render(<BattleLog entries={[]} />)

    expect(screen.getByText('No actions yet.')).toBeInTheDocument()
  })
})
