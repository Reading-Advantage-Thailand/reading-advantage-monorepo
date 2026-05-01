import { act, render } from '@testing-library/react';
import { useInterval } from './useInterval';

function IntervalHarness({ delay, onTick }: { delay: number | null; onTick: () => void }) {
  useInterval(onTick, delay);
  return null;
}

describe('useInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('invokes the callback on the specified interval', () => {
    const onTick = jest.fn();
    render(<IntervalHarness delay={100} onTick={onTick} />);

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('does not run when delay is null', () => {
    const onTick = jest.fn();
    render(<IntervalHarness delay={null} onTick={onTick} />);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onTick).not.toHaveBeenCalled();
  });

  it('stops running when delay is cleared', () => {
    const onTick = jest.fn();
    const { rerender } = render(<IntervalHarness delay={100} onTick={onTick} />);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender(<IntervalHarness delay={null} onTick={onTick} />);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onTick).toHaveBeenCalledTimes(2);
  });
});
