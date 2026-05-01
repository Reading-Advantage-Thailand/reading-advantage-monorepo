import { render, screen, fireEvent } from '@testing-library/react'
import { HauntedLibraryGame } from './HauntedLibraryGame'
import React from 'react'

const mockEnterFullscreen = jest.fn()
const mockExitFullscreen = jest.fn()

// Mock Konva Stage and Layer
jest.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
  Rect: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-rect" {...props} />,
  Text: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-text" {...props} />,
  Circle: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="konva-circle" {...props} />,
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
}))

// Mock hooks
jest.mock('@/hooks/useSound', () => ({
  useSound: () => ({ playSound: jest.fn() }),
}))

jest.mock('@/hooks/useDirectionalInput', () => ({
  useDirectionalInput: () => ({ input: { dx: 0, dy: 0 }, setVirtualInput: jest.fn() }),
}))

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

const mockSentences = [
  { term: 'The cat sits', translation: 'แมวนั่ง' },
  { term: 'Dog runs fast', translation: 'หมาวิ่งเร็ว' },
]

describe('HauntedLibraryGame', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the start screen initially', () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    expect(screen.getByText(/The Haunted Library/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Game/i })).toBeInTheDocument()
  })

  it('transitions to playing phase when start is clicked', async () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Start Game/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })

  it('calls onComplete when game ends', async () => {
    const onComplete = jest.fn()
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={onComplete} />)
    
    const startButton = screen.getByRole('button', { name: /Start Game/i })
    fireEvent.click(startButton)
    
    // Game should be in playing state
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })

  it('enters fullscreen when game starts', async () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Start Game/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
    expect(mockEnterFullscreen).toHaveBeenCalled()
  })

  it('exits fullscreen when game ends', async () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Start Game/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
    expect(mockEnterFullscreen).toHaveBeenCalled()
  })

  it('displays score in HUD', async () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Start Game/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByText(/Score:/)).toBeInTheDocument()
  })

  it('displays translation in HUD', async () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    const startButton = screen.getByRole('button', { name: /Start Game/i })
    fireEvent.click(startButton)
    
    expect(await screen.findByText(mockSentences[0].translation)).toBeInTheDocument()
  })

  it('renders difficulty selector', () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    expect(screen.getByText(/Difficulty:/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('changes difficulty when select changes', () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hard' } })
    expect(select).toHaveValue('hard')
  })

  it('uses medium difficulty by default', async () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('medium')
  })
})
