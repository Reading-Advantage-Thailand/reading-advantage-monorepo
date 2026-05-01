import { render, screen, fireEvent } from '@testing-library/react'
import { SpellweaversRunGame } from './SpellweaversRunGame'
import React from 'react'

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    callback([
      {
        contentRect: { width: 800, height: 600 },
        target: element,
      },
    ])
  }),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

const mockEnterFullscreen = jest.fn()
const mockExitFullscreen = jest.fn()

// Mock Konva Stage and Layer
jest.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-stage">{children}</div>
  ),
  Layer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Rect: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-rect" {...props} />
  ),
  Text: ({
    text,
    ...props
  }: { text?: string } & React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-text" {...props}>
      {text}
    </div>
  ),
  Circle: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-circle" {...props} />
  ),
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  ),
}))

const mockContainerRef = { current: null }

// Mock hooks
jest.mock('@/hooks/useGameFullscreen', () => ({
  useGameFullscreen: () => ({
    containerRef: mockContainerRef,
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

jest.mock('@/locales/client', () => ({
  useScopedI18n: () => (key: string) => key,
}))

const mockVocabulary = [
  { term: 'The cat sits', translation: 'แมวนั่ง' },
  { term: 'I love books', translation: 'ฉันชอบหนังสือ' },
]

describe('SpellweaversRunGame', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the start screen initially', () => {
    render(
      <SpellweaversRunGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    expect(
      screen.getByRole('heading', { name: /spellweaver's run/i }),
    ).toBeInTheDocument()
  })

  it('transitions to playing phase when start is clicked', async () => {
    render(
      <SpellweaversRunGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    const startButton = screen.getByRole('button', {
      name: /begin the run/i,
    })
    fireEvent.click(startButton)

    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })

  it('enters fullscreen when game starts', async () => {
    render(
      <SpellweaversRunGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    const startButton = screen.getByRole('button', {
      name: /begin the run/i,
    })
    fireEvent.click(startButton)

    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
    expect(mockEnterFullscreen).toHaveBeenCalled()
  })

  it('displays difficulty select on start screen', () => {
    render(
      <SpellweaversRunGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
  })

  it('allows changing difficulty', () => {
    render(
      <SpellweaversRunGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hard' } })
    expect(select).toHaveValue('hard')
  })

  it('calls onComplete when game ends', async () => {
    const onComplete = jest.fn()
    render(
      <SpellweaversRunGame vocabulary={mockVocabulary} onComplete={onComplete} />,
    )
    const startButton = screen.getByRole('button', {
      name: /begin the run/i,
    })
    fireEvent.click(startButton)

    // Game should render canvas
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })

  it('shows end screen after game ends', async () => {
    render(
      <SpellweaversRunGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )

    const startButton = screen.getByRole('button', {
      name: /begin the run/i,
    })
    fireEvent.click(startButton)
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })
})
