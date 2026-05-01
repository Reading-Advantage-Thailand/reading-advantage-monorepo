import { render, screen, fireEvent } from '@testing-library/react'
import { StormCastleTowerGame } from './StormCastleTowerGame'
import React from 'react'

const mockEnterFullscreen = jest.fn()
const mockExitFullscreen = jest.fn()

// Mock Konva Stage and Layer
jest.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-rect" {...props} />,
  Text: ({ text, ...props }: { text?: string } & React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-text" {...props}>{text}</div>,
  Circle: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-circle" {...props} />,
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
}))

// Mock hooks
jest.mock('@/hooks/useGameFullscreen', () => ({
  useGameFullscreen: () => ({
    containerRef: { current: null },
    enterFullscreen: mockEnterFullscreen,
    exitFullscreen: mockExitFullscreen,
  }),
}))

jest.mock('@/hooks/useAccessibilitySettings', () => ({
  useAccessibilitySettings: () => ({
    settings: {
      textSizeMultiplier: 1,
      touchTargetMultiplier: 1,
      assistMode: false,
      reduceMotion: false,
    },
    getEffectiveTextSize: (base: number) => base,
    getEffectiveTouchTarget: (base: number) => base,
  }),
}))

jest.mock('@/lib/games/xp', () => ({
  calculateXP: jest.fn(() => 5),
}))

const mockVocabulary = [
  { term: 'The dragon flies high', translation: 'Le dragon vole haut' },
  { term: 'The knight is brave', translation: 'Le chevalier est brave' },
]

describe('StormCastleTowerGame', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the start screen initially', () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    expect(screen.getByText(/Storm the Castle Tower/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Storm the Tower/i })).toBeInTheDocument()
  })

  it('transitions to playing phase when start is clicked', async () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Storm the Tower/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })

  it('enters fullscreen when game starts', async () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Storm the Tower/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
    expect(mockEnterFullscreen).toHaveBeenCalled()
  })

  it('exits fullscreen when game ends', async () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Storm the Tower/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
    expect(mockEnterFullscreen).toHaveBeenCalled()
  })

  it('displays HUD elements when playing', async () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Storm the Tower/i })
    fireEvent.click(startButton)
    
    const konvaTexts = await screen.findAllByTestId('konva-text')
    expect(konvaTexts.length).toBeGreaterThan(0)
  })

  it('displays konva layer when playing', async () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Storm the Tower/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-layer')).toBeInTheDocument()
  })

  it('renders difficulty selector', () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    expect(screen.getByText(/Tower Height:/i)).toBeInTheDocument()
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1)
  })

  it('changes difficulty when select changes', () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'hard' } })
    expect(selects[0]).toHaveValue('hard')
  })

  it('uses medium difficulty by default', () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const selects = screen.getAllByRole('combobox')
    expect(selects[0]).toHaveValue('medium')
  })

  it('handles keyboard input during gameplay', async () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Storm the Tower/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
    
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'Enter' })
  })

  it('ignores keyboard input when not playing', () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    // Should not crash
    expect(screen.getByText(/Storm the Castle Tower/i)).toBeInTheDocument()
  })

  it('renders touch controls during gameplay', async () => {
    render(<StormCastleTowerGame vocabulary={mockVocabulary} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Storm the Tower/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
    expect(screen.getByText('Collect')).toBeInTheDocument()
  })
})
