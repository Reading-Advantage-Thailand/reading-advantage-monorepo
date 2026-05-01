import { render, screen, fireEvent } from '@testing-library/react'
import { BattleResults } from './BattleResults'

describe('BattleResults', () => {
  it('renders a victory summary with XP and accuracy', () => {
    render(
      <BattleResults
        outcome="victory"
        xp={7}
        accuracy={0.8}
        onRestart={jest.fn()}
      />
    )

    expect(screen.getByText('Victory')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('renders a defeat summary', () => {
    render(
      <BattleResults
        outcome="defeat"
        xp={2}
        accuracy={0.4}
        onRestart={jest.fn()}
      />
    )

    expect(screen.getByText('Defeat')).toBeInTheDocument()
  })

  it('calls onRestart when the button is clicked', () => {
    const onRestart = jest.fn()
    render(
      <BattleResults
        outcome="victory"
        xp={5}
        accuracy={0.7}
        onRestart={onRestart}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /play again/i }))
    expect(onRestart).toHaveBeenCalled()
  })
})
