import { renderHook, act } from '@testing-library/react';
import { useMultiplayerSocket } from './useMultiplayerSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event?: any) => void) | null = null;
  onclose: ((event?: any) => void) | null = null;
  onerror: ((event?: any) => void) | null = null;
  onmessage: ((event?: any) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening asynchronously
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(_data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  simulateError() {
    if (this.onerror) this.onerror(new Error('Connection failed'));
  }

  simulateMessage(data: string) {
    if (this.onmessage) this.onmessage({ data });
  }
}

describe('useMultiplayerSocket', () => {
  let originalWebSocket: typeof WebSocket;

  beforeAll(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as any;
  });

  afterAll(() => {
    global.WebSocket = originalWebSocket;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useMultiplayerSocket());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.socket).toBeNull();
  });

  it('should connect to WebSocket server', async () => {
    const { result } = renderHook(() => useMultiplayerSocket());
    
    act(() => {
      result.current.connect('ws://localhost:1234');
    });

    // Wait for connection
    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.socket).not.toBeNull();
  });

  it('should disconnect from WebSocket server', async () => {
    const { result } = renderHook(() => useMultiplayerSocket());
    
    act(() => {
      result.current.connect('ws://localhost:1234');
    });

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.socket).toBeNull();
  });

  it('should send messages when connected', async () => {
    const { result } = renderHook(() => useMultiplayerSocket());
    
    act(() => {
      result.current.connect('ws://localhost:1234');
    });

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    const sendSpy = jest.spyOn(result.current.socket!, 'send');

    act(() => {
      result.current.send('test message');
    });

    expect(sendSpy).toHaveBeenCalledWith('test message');
  });

  it('should not send messages when disconnected', () => {
    const { result } = renderHook(() => useMultiplayerSocket());
    
    act(() => {
      result.current.send('test message');
    });

    // Should not throw and should handle gracefully
    expect(result.current.isConnected).toBe(false);
  });

  it('should register event listeners', async () => {
    const { result } = renderHook(() => useMultiplayerSocket());
    const messageHandler = jest.fn();
    
    act(() => {
      result.current.on('message', messageHandler);
      result.current.connect('ws://localhost:1234');
    });

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    act(() => {
      (result.current.socket as any).simulateMessage('{"type": "test"}');
    });

    expect(messageHandler).toHaveBeenCalledWith('{"type": "test"}');
  });

  it('should handle connection errors', async () => {
    const { result } = renderHook(() => useMultiplayerSocket());
    const errorHandler = jest.fn();
    
    act(() => {
      result.current.on('error', errorHandler);
      result.current.connect('ws://localhost:1234');
    });

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    act(() => {
      (result.current.socket as any).simulateError();
    });

    expect(errorHandler).toHaveBeenCalled();
  });

  it('should expose reconnection configuration options', () => {
    const { result } = renderHook(() => 
      useMultiplayerSocket({ maxRetries: 5, reconnectDelay: 2000 })
    );
    
    // Verify hook accepts options without errors
    expect(result.current).toBeDefined();
    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should allow manual reconnection after disconnect', async () => {
    const { result } = renderHook(() => useMultiplayerSocket());
    
    act(() => {
      result.current.connect('ws://localhost:1234');
    });

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);

    // Disconnect
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.socket).toBeNull();

    // Manual reconnect should work
    act(() => {
      result.current.connect('ws://localhost:1234');
    });

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.socket).not.toBeNull();
  });

  it('should clean up on unmount', async () => {
    const { result, unmount } = renderHook(() => useMultiplayerSocket());
    
    act(() => {
      result.current.connect('ws://localhost:1234');
    });

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    const closeSpy = jest.spyOn(result.current.socket!, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });
});
