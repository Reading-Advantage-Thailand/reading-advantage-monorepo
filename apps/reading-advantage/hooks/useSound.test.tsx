import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { useSound } from './useSound';

type PlaySoundFn = (type: 'success' | 'error' | 'missile-hit') => void;

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
  let lastOscillator: {
    start: jest.Mock;
    stop: jest.Mock;
    frequency: { setValueAtTime: jest.Mock };
  } | null = null;
  let lastGain: { gain: { setValueAtTime: jest.Mock; exponentialRampToValueAtTime: jest.Mock } } | null = null;

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

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      value: originalAudioContext,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      value: originalWebkitAudioContext,
      configurable: true,
    });
    lastOscillator = null;
    lastGain = null;
  });

  it('plays a success tone via Web Audio when available', () => {
    Object.defineProperty(window, 'AudioContext', {
      value: FakeAudioContext,
      configurable: true,
    });

    let playSound: PlaySoundFn | null = null;
    render(<SoundHarness onReady={(fn) => {
      playSound = fn;
    }} />);

    act(() => {
      playSound?.('success');
    });

    expect(lastOscillator?.start).toHaveBeenCalledTimes(1);
    expect(lastOscillator?.stop).toHaveBeenCalledTimes(1);
    expect(lastGain?.gain.setValueAtTime).toHaveBeenCalled();
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
