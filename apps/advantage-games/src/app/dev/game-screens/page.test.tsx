import { fireEvent, render, screen } from '@testing-library/react'
import GameScreensDevPage from './page'

describe('GameScreensDevPage', () => {
  it('renders the start screen preview by default', () => {
    render(<GameScreensDevPage />)

    expect(screen.getByRole('heading', { name: /unified game screens preview/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument()
  })

  it('switches to a victory end screen preview', () => {
    render(<GameScreensDevPage />)

    fireEvent.click(screen.getByRole('button', { name: /end: victory/i }))

    expect(screen.getByRole('heading', { name: /victory!/i })).toBeInTheDocument()
  })
})
