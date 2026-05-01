import { render, screen } from '@testing-library/react'
import { BattleEffects } from './BattleEffects'

describe('BattleEffects', () => {
  it('renders children with shake metadata', () => {
    render(
      <BattleEffects shakeKey={2}>
        <div>Battle Stage</div>
      </BattleEffects>
    )

    const container = screen.getByTestId('battle-effects')
    expect(container).toHaveAttribute('data-shake-key', '2')
    expect(screen.getByText('Battle Stage')).toBeInTheDocument()
  })

  it('renders a flash overlay when flashKey is set', () => {
    render(
      <BattleEffects flashKey={1} flashTone="player">
        <div>Battle Stage</div>
      </BattleEffects>
    )

    expect(screen.getByTestId('battle-flash')).toBeInTheDocument()
  })
})
