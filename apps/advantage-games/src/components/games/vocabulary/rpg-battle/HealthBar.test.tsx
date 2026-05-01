import { render, screen } from '@testing-library/react'
import { HealthBar } from './HealthBar'

describe('HealthBar', () => {
  it('renders label and values', () => {
    render(<HealthBar current={75} max={100} label="Hero" tone="player" />)

    expect(screen.getByText('Hero')).toBeInTheDocument()
    expect(screen.getByText('75 / 100')).toBeInTheDocument()
  })

  it('clamps values and exposes progressbar attributes', () => {
    render(<HealthBar current={120} max={100} label="Goblin" tone="enemy" />)

    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuenow', '100')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
  })
})
