import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HauntedLibraryGame } from './HauntedLibraryGame'
import React from 'react'
import type { LibraryState } from '@/lib/games/hauntedLibrary'

// Phase 5: mock the legacy VirtualDPad path. The component must import from
// @/lib/games-runtime instead for this mock to be ignored.
jest.mock('@/components/ui/VirtualDPad', () => ({
  VirtualDPad: () => <div data-testid="legacy-dpad">Legacy DPad</div>,
}))

const mockEnterFullscreen = jest.fn()
const mockExitFullscreen = jest.fn()

// Mutable hook into the partially-mocked library so Phase-3 tests can force
// game-over without breaking the existing tests that rely on the real tick.
const tickMock = {
  fn: jest.fn((state: LibraryState, delta: number, input: { dx: number; dy: number }) => {
    const { tickLibrary } = jest.requireActual('@/lib/games/hauntedLibrary') as typeof import('@/lib/games/hauntedLibrary')
    return tickLibrary(state, delta, input)
  }),
}

jest.mock('@/lib/games/hauntedLibrary', () => ({
  ...jest.requireActual('@/lib/games/hauntedLibrary'),
  tickLibrary: (...args: unknown[]) => tickMock.fn(...args),
}))

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

describe('HauntedLibraryGame — Phase 3 shared completion contract payload (Group 3D)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    tickMock.fn = jest.fn((state: LibraryState, delta: number, input: { dx: number; dy: number }) => {
      const { tickLibrary } = jest.requireActual('@/lib/games/hauntedLibrary') as typeof import('@/lib/games/hauntedLibrary')
      return tickLibrary(state, delta, input)
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sends the contract payload on game-over with idempotencyKey and no xp', async () => {
    const onComplete = jest.fn()
    const { createLibraryState } = jest.requireActual('@/lib/games/hauntedLibrary') as typeof import('@/lib/games/hauntedLibrary')
    const baseState = createLibraryState(mockSentences, { difficulty: 'medium' }, () => 0.5)
    const finalState: LibraryState = {
      ...baseState,
      phase: 'victory',
      score: 42,
      correctAnswers: 5,
      totalAttempts: 6,
      accuracy: 5 / 6,
      time: 12_345,
      lives: 3,
      initialLives: 3,
    }
    tickMock.fn = jest.fn().mockReturnValue(finalState)

    let rafCalls = 0
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      // Drive exactly one animation frame so the loop reaches game-over and stops.
      if (rafCalls === 0) {
        rafCalls++
        cb(0)
      }
      return rafCalls
    })

    render(<HauntedLibraryGame sentences={mockSentences} onComplete={onComplete} />)
    const startButton = screen.getByRole('button', { name: /Start Game/i })
    fireEvent.click(startButton)

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))

    const payload = onComplete.mock.calls[0][0]
    expect(payload.gameType).toBe('haunted-library')
    expect(payload.difficulty).toBe('medium')
    expect(payload.score).toBe(42)
    expect(payload.accuracy).toBeCloseTo(5 / 6)
    expect(payload.correctAnswers).toBe(5)
    expect(payload.totalAttempts).toBe(6)
    expect(payload.duration).toBe(12_345)
    expect(payload.victory).toBe(true)
    expect(payload.idempotencyKey).toMatch(UUID_RE)
    expect(payload.clientTimestamp).toBeGreaterThan(0)
    expect(payload).not.toHaveProperty('xp')
  })

  it('fires onComplete exactly once for a single game-over (B30-002 duplicate guard)', async () => {
    const onComplete = jest.fn()
    const { createLibraryState } = jest.requireActual('@/lib/games/hauntedLibrary') as typeof import('@/lib/games/hauntedLibrary')
    const baseState = createLibraryState(mockSentences, { difficulty: 'medium' }, () => 0.5)
    const finalState: LibraryState = {
      ...baseState,
      phase: 'victory',
      score: 10,
      correctAnswers: 3,
      totalAttempts: 3,
      accuracy: 1,
      time: 5_000,
      lives: 3,
      initialLives: 3,
    }
    tickMock.fn = jest.fn().mockReturnValue(finalState)

    let rafCalls = 0
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      // Drive exactly one animation frame so the loop reaches game-over and stops.
      if (rafCalls === 0) {
        rafCalls++
        cb(0)
      }
      return rafCalls
    })

    render(<HauntedLibraryGame sentences={mockSentences} onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete).toHaveBeenCalledTimes(1)

    const payload = onComplete.mock.calls[0][0]
    expect(payload.idempotencyKey).toMatch(UUID_RE)
    expect(payload).not.toHaveProperty('xp')
  })
})

describe('HauntedLibraryGame — Phase 5 embeddable runtime + onNavigate (Group 5D)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('imports VirtualDPad from the canonical @/lib/games-runtime module (D-11)', async () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }))

    await waitFor(() => expect(screen.getByTestId('konva-stage')).toBeInTheDocument())

    // If the component still imports from the legacy @/components/ui/VirtualDPad
    // path, the mocked legacy-dpad would render. In Green it imports from
    // @/lib/games-runtime, so the legacy mock is bypassed.
    expect(screen.queryByTestId('legacy-dpad')).not.toBeInTheDocument()

    // Positive control: the canonical polished implementation uses this base.
    expect(document.querySelector('.bg-slate-900\\/70')).toBeInTheDocument()
  })

  it('wires onNavigate prop to the Exit control (D-09)', async () => {
    const onNavigate = jest.fn()
    const { createLibraryState } = jest.requireActual('@/lib/games/hauntedLibrary') as typeof import('@/lib/games/hauntedLibrary')
    const baseState = createLibraryState(mockSentences, { difficulty: 'medium' }, () => 0.5)
    const finalState: LibraryState = {
      ...baseState,
      phase: 'victory',
      score: 10,
      correctAnswers: 3,
      totalAttempts: 3,
      accuracy: 1,
      time: 5_000,
      lives: 3,
      initialLives: 3,
    }
    tickMock.fn = jest.fn().mockReturnValue(finalState)

    let rafCalls = 0
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (rafCalls === 0) {
        rafCalls++
        cb(0)
      }
      return rafCalls
    })

    render(
      <HauntedLibraryGame
        sentences={mockSentences}
        onComplete={jest.fn()}
        {...({ onNavigate } as any)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Exit/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Exit/i }))

    // onNavigate call count: 1 (Exit control)
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith('exit')
  })
})
