import { renderHook, act } from '@testing-library/react'
import { isGameMusicId, resolveGameMusicId, useBackgroundMusic } from './useBackgroundMusic'

describe('useBackgroundMusic', () => {
  let audioMock: {
    play: jest.Mock
    pause: jest.Mock
    loop: boolean
    volume: number
    currentTime: number
    src: string
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }

  beforeEach(() => {
    audioMock = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      loop: false,
      volume: 1,
      currentTime: 0,
      src: '',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    window.Audio = jest.fn(() => audioMock) as unknown as typeof window.Audio
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('resolves catalog ids to themselves and unknown ids to a fallback track', () => {
    expect(isGameMusicId('dragon-flight')).toBe(true)
    expect(isGameMusicId('not-a-catalog-game')).toBe(false)
    expect(resolveGameMusicId('haunted-library')).toBe('haunted-library')
    expect(resolveGameMusicId('not-a-catalog-game')).toBe('dragon-flight')
  })

  it('creates an Audio instance with correct game track', () => {
    renderHook(() => useBackgroundMusic('wizard-vs-zombie'))
    
    expect(window.Audio).toHaveBeenCalledWith('/sounds/music/wizard-vs-zombie.mp3')
    expect(audioMock.loop).toBe(true)
  })

  it('starts playback after user gesture', async () => {
    const { result } = renderHook(() => useBackgroundMusic('castle-defense'))
    
    expect(audioMock.play).not.toHaveBeenCalled()
    
    await act(async () => {
      await result.current.start()
    })
    
    expect(audioMock.play).toHaveBeenCalled()
    expect(audioMock.loop).toBe(true)
  })

  it('stops playback on stop()', async () => {
    const { result } = renderHook(() => useBackgroundMusic('dragon-flight'))
    
    await act(async () => {
      await result.current.start()
      result.current.stop()
    })
    
    expect(audioMock.pause).toHaveBeenCalled()
    expect(audioMock.currentTime).toBe(0)
  })

  it('pauses playback on pause()', async () => {
    const { result } = renderHook(() => useBackgroundMusic('rpg-battle'))
    
    await act(async () => {
      await result.current.start()
    })
    audioMock.currentTime = 30
    
    act(() => {
      result.current.pause()
    })
    
    expect(audioMock.pause).toHaveBeenCalledTimes(1)
    expect(audioMock.currentTime).toBe(30)
  })

  it('cleans up audio on unmount', () => {
    const { unmount } = renderHook(() => useBackgroundMusic('enchanted-library'))
    
    unmount()
    
    expect(audioMock.pause).toHaveBeenCalled()
    expect(audioMock.currentTime).toBe(0)
  })

  it('changes track when gameId changes', () => {
    const { rerender } = renderHook(
      ({ gameId }) => useBackgroundMusic(gameId),
      { initialProps: { gameId: 'rune-match' as const } }
    )
    
    expect(window.Audio).toHaveBeenCalledWith('/sounds/music/rune-match.mp3')
    
    rerender({ gameId: 'magic-defense' })
    
    expect(audioMock.pause).toHaveBeenCalled()
    expect(window.Audio).toHaveBeenCalledWith('/sounds/music/magic-defense.mp3')
  })

  it('handles play rejection gracefully (autoplay policy)', async () => {
    audioMock.play.mockRejectedValue(new Error('Autoplay prevented'))
    
    const { result } = renderHook(() => useBackgroundMusic('alchemists-synthesis'))
    
    await act(async () => {
      await result.current.start()
    })
    
    expect(audioMock.play).toHaveBeenCalled()
  })

  it('does not start if already playing', async () => {
    const { result } = renderHook(() => useBackgroundMusic('potion-rush'))
    
    await act(async () => {
      await result.current.start()
    })
    
    audioMock.play.mockClear()
    
    await act(async () => {
      await result.current.start()
    })
    
    expect(audioMock.play).not.toHaveBeenCalled()
  })

  it('exposes isPlaying state', async () => {
    const { result } = renderHook(() => useBackgroundMusic('dungeon-liberator'))
    
    expect(result.current.isPlaying).toBe(false)
    
    await act(async () => {
      await result.current.start()
    })
    
    expect(result.current.isPlaying).toBe(true)
    
    act(() => {
      result.current.stop()
    })
    
    expect(result.current.isPlaying).toBe(false)
  })
})
