import { render, screen, fireEvent } from '@testing-library/react'
import { ShadowGateDungeonGame } from './ShadowGateDungeonGame'
import React from 'react'

// Mock withBasePath
jest.mock('@/lib/basePath', () => ({
  withBasePath: (src: string) => src,
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock requestAnimationFrame to prevent infinite loops
global.requestAnimationFrame = jest.fn(() => 1)
global.cancelAnimationFrame = jest.fn()

// Mock Konva
jest.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-stage">{children}</div>
  ),
  Layer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Rect: () => <div data-testid="konva-rect" />,
  Text: ({ text }: { text?: string }) => <div data-testid="konva-text">{text}</div>,
  Circle: () => <div data-testid="konva-circle" />,
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  ),
  Line: () => <div data-testid="konva-line" />,
}))

// Mock hooks
jest.mock('@/hooks/useGameFullscreen', () => ({
  useGameFullscreen: () => ({
    containerRef: { current: null },
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
  }),
}))

jest.mock('@/hooks/useAccessibilitySettings', () => ({
  useAccessibilitySettings: () => ({
    getEffectiveTextSize: (size: number) => size,
    getEffectiveTouchTarget: (size: number) => size,
  }),
}))

jest.mock('@/locales/client', () => ({
  useScopedI18n: () => (key: string) => key,
}))

// Mock VirtualDPad
jest.mock('@/components/games/ui/VirtualDPad', () => ({
  VirtualDPad: () => <div data-testid="virtual-dpad" />,
}))

// Mock GameStartScreen and GameEndScreen
jest.mock('@/components/games/game/GameStartScreen', () => ({
  GameStartScreen: ({
    children,
    onStart,
  }: {
    children?: React.ReactNode
    onStart: () => void
  }) => (
    <div data-testid="game-start-screen">
      {children}
      <button data-testid="start-button" onClick={onStart}>
        Start
      </button>
    </div>
  ),
}))

jest.mock('@/components/games/game/GameEndScreen', () => ({
  GameEndScreen: ({
    onRestart,
    onExit,
  }: {
    onRestart: () => void
    onExit: () => void
  }) => (
    <div data-testid="game-end-screen">
      <button data-testid="restart-button" onClick={onRestart}>
        Restart
      </button>
      <button data-testid="exit-button" onClick={onExit}>
        Exit
      </button>
    </div>
  ),
}))

const mockVocabulary = [
  { term: 'The cat sits', translation: 'แมวนั่ง' },
  { term: 'I love books', translation: 'ฉันชอบหนังสือ' },
]

describe('ShadowGateDungeonGame', () => {
  const mockOnComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders start screen initially', () => {
    render(
      <ShadowGateDungeonGame
        vocabulary={mockVocabulary}
        onComplete={mockOnComplete}
      />
    )
    expect(screen.getByTestId('game-start-screen')).toBeInTheDocument()
  })

  it('renders with empty vocabulary', () => {
    render(
      <ShadowGateDungeonGame
        vocabulary={[]}
        onComplete={mockOnComplete}
      />
    )
    expect(screen.getByTestId('game-start-screen')).toBeInTheDocument()
  })

  it('allows difficulty selection', () => {
    render(
      <ShadowGateDungeonGame
        vocabulary={mockVocabulary}
        onComplete={mockOnComplete}
      />
    )

    const select = screen.getByRole('combobox', { name: /difficulty/i })
    expect(select).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'hard' } })
    expect(select).toHaveValue('hard')
  })

  it('allows creature selection', () => {
    render(
      <ShadowGateDungeonGame
        vocabulary={mockVocabulary}
        onComplete={mockOnComplete}
      />
    )

    const select = screen.getByRole('combobox', { name: /opponent/i })
    expect(select).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'shadow-dragon' } })
    expect(select).toHaveValue('shadow-dragon')
  })
})
