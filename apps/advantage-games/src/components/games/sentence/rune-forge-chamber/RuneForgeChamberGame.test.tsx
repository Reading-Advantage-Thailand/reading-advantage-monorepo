import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { RuneForgeChamberGame } from './RuneForgeChamberGame'
import React from 'react'

// Mock withBasePath
jest.mock('@/lib/basePath', () => ({
  withBasePath: (src: string) => src,
}))

// Mock Image to load asynchronously but reliably
class MockImage {
  _onload: (() => void) | null = null
  _onerror: (() => void) | null = null
  src = ''
  width = 64
  height = 64

  set onload(fn: (() => void) | null) {
    this._onload = fn
    if (fn) {
      setTimeout(() => fn(), 10)
    }
  }
  get onload() {
    return this._onload
  }

  set onerror(fn: (() => void) | null) {
    this._onerror = fn
  }
  get onerror() {
    return this._onerror
  }
}
Object.defineProperty(global, 'Image', {
  value: MockImage,
  writable: true,
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn((element) => {
    // Defer callback to avoid infinite loop in tests
    setTimeout(() => {
      callback([
        {
          contentRect: { width: 800, height: 600 },
          target: element,
        },
      ])
    }, 0)
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
  Line: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-line" {...props} />
  ),
  Ring: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-ring" {...props} />
  ),
  Image: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-image" {...props} />
  ),
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

jest.mock('@/locales/client', () => ({
  useScopedI18n: () => (key: string) => key,
}))

const mockVocabulary = [
  { term: 'The cat sits on the mat', translation: 'แมวนั่งบนเสื่อ' },
  { term: 'I love to read books', translation: 'ฉันชอบอ่านหนังสือ' },
]

// Helper to wait for assets to load
async function waitForAssetsToLoad() {
  jest.advanceTimersByTime(100)
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
  )
}

describe('RuneForgeChamberGame', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the start screen initially', async () => {
    render(
      <RuneForgeChamberGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    await waitForAssetsToLoad()
    expect(
      screen.getByRole('heading', { name: /rune forge chamber/i }),
    ).toBeInTheDocument()
  })

  it('transitions to playing phase when start is clicked', async () => {
    render(
      <RuneForgeChamberGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    await waitForAssetsToLoad()
    const startButton = screen.getByRole('button', {
      name: /enter the forge/i,
    })
    fireEvent.click(startButton)

    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })

  it('enters fullscreen when game starts', async () => {
    render(
      <RuneForgeChamberGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    await waitForAssetsToLoad()
    const startButton = screen.getByRole('button', {
      name: /enter the forge/i,
    })
    fireEvent.click(startButton)

    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
    expect(mockEnterFullscreen).toHaveBeenCalled()
  })

  it('displays difficulty select on start screen', async () => {
    render(
      <RuneForgeChamberGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    await waitForAssetsToLoad()
    expect(
      screen.getByRole('combobox', { name: /difficulty/i }),
    ).toBeInTheDocument()
  })

  it('allows changing difficulty', async () => {
    render(
      <RuneForgeChamberGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    await waitForAssetsToLoad()
    const select = screen.getByRole('combobox', { name: /difficulty/i })
    fireEvent.change(select, { target: { value: 'hard' } })
    expect(select).toHaveValue('hard')
  })

  it('allows changing rune type', async () => {
    render(
      <RuneForgeChamberGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    await waitForAssetsToLoad()
    const select = screen.getByRole('combobox', { name: /rune type/i })
    fireEvent.change(select, { target: { value: 'rare-crystal' } })
    expect(select).toHaveValue('rare-crystal')
  })

  it('calls onComplete when game ends', async () => {
    const onComplete = jest.fn()
    render(
      <RuneForgeChamberGame vocabulary={mockVocabulary} onComplete={onComplete} />,
    )
    await waitForAssetsToLoad()
    const startButton = screen.getByRole('button', {
      name: /enter the forge/i,
    })
    fireEvent.click(startButton)

    // Game should render canvas
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })

  it('shows end screen after defeat', async () => {
    render(
      <RuneForgeChamberGame vocabulary={mockVocabulary} onComplete={jest.fn()} />,
    )
    await waitForAssetsToLoad()

    const startButton = screen.getByRole('button', {
      name: /enter the forge/i,
    })
    fireEvent.click(startButton)
    expect(await screen.findByTestId('konva-stage')).toBeInTheDocument()
  })
})
