import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { useSound } from './useSound';

type PlaySoundFn = (type: 'success' | 'error' | 'missile-hit' | 'bubbling' | 'clinking' | 'angry-grunt' | 'cash-register') => void;

function SoundHarness({ onReady }: { onReady: (playSound: PlaySoundFn) => void }) {
  const { playSound } = useSound();

  useEffect(() => {
    onReady(playSound);
  }, [onReady, playSound]);

  return null;
}

describe('useSound', () => {
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = window['webkitAudioContext'];
  const originalAudio = window.Audio;

  let lastOscillator: {
    start: jest.Mock;
    stop: jest.Mock;
    frequency: { setValueAtTime: jest.Mock };
  } | null = null;
  let lastGain: { gain: { setValueAtTime: jest.Mock; exponentialRampToValueAtTime: jest.Mock } } | null = null;
  let audioMock: { play: jest.Mock };

  class FakeAudioContext {
    currentTime = 0;
    destination = {};

    createOscillator() {
      lastOscillator = {
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { setValueAtTime: jest.fn() },
      };
      return {
        type: 'sine',
        connect: jest.fn(),
        frequency: lastOscillator.frequency,
        start: lastOscillator.start,
        stop: lastOscillator.stop,
      };
    }

    createGain() {
      lastGain = {
        gain: {
          setValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn(),
        },
      };
      return {
        connect: jest.fn(),
        gain: lastGain.gain,
      };
    }
  }

  beforeEach(() => {
    audioMock = {
      play: jest.fn().mockRejectedValue(new Error('File not found')), // Default to failing to test fallback
    };
    window.Audio = jest.fn(() => audioMock) as unknown as typeof window.Audio;
  });

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      value: originalAudioContext,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      value: originalWebkitAudioContext,
      configurable: true,
    });
    window.Audio = originalAudio;
    lastOscillator = null;
    lastGain = null;
  });

  it('tries to play a file first, then falls back to success tone', async () => {
    Object.defineProperty(window, 'AudioContext', {
      value: FakeAudioContext,
      configurable: true,
    });

    let playSound: PlaySoundFn | null = null;
    render(<SoundHarness onReady={(fn) => {
      playSound = fn;
    }} />);

    await act(async () => {
      playSound?.('success');
      // Wait for promise rejection to handle
      await Promise.resolve();
    });

    expect(window.Audio).toHaveBeenCalledWith('/sounds/success.mp3');
    expect(audioMock.play).toHaveBeenCalled();
    // Fallback:
    expect(lastOscillator?.start).toHaveBeenCalledTimes(1);
    expect(lastOscillator?.stop).toHaveBeenCalledTimes(1);
  });

  it('plays a bubbling tone on fallback', async () => {
    Object.defineProperty(window, 'AudioContext', {
      value: FakeAudioContext,
      configurable: true,
    });

    let playSound: PlaySoundFn | null = null;
    render(<SoundHarness onReady={(fn) => {
      playSound = fn;
    }} />);

    await act(async () => {
      playSound?.('bubbling');
      await Promise.resolve();
    });

    expect(lastOscillator?.start).toHaveBeenCalledTimes(1);
  });

  it('no-ops safely when audio is unavailable', () => {
    Object.defineProperty(window, 'AudioContext', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      value: undefined,
      configurable: true,
    });

    let playSound: PlaySoundFn | null = null;
    render(<SoundHarness onReady={(fn) => {
      playSound = fn;
    }} />);

    expect(() => {
      act(() => {
        playSound?.('error');
      });
    }).not.toThrow();
  });
});
