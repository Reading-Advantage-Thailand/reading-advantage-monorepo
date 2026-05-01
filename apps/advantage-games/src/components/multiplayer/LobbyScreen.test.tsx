import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LobbyScreen } from './LobbyScreen';

describe('LobbyScreen', () => {
  const defaultProps = {
    mode: 'create' as const,
    onCreateRoom: jest.fn(),
    onJoinRoom: jest.fn(),
    onStartGame: jest.fn(),
    onKickPlayer: jest.fn(),
    onTransferHost: jest.fn(),
    onLeaveRoom: jest.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Room Mode', () => {
    it('should render create room form', () => {
      render(<LobbyScreen {...defaultProps} />);
      expect(screen.getByTestId('create-tab')).toHaveAttribute('data-variant', 'default');
      expect(screen.getByTestId('player-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('create-room-btn')).toBeInTheDocument();
    });

    it('should call onCreateRoom with player name', () => {
      render(<LobbyScreen {...defaultProps} />);
      fireEvent.change(screen.getByTestId('player-name-input'), {
        target: { value: 'Player 1' },
      });
      fireEvent.click(screen.getByTestId('create-room-btn'));
      expect(defaultProps.onCreateRoom).toHaveBeenCalledWith('Player 1', undefined);
    });

    it('should call onCreateRoom with game ID when provided', () => {
      render(<LobbyScreen {...defaultProps} />);
      fireEvent.change(screen.getByTestId('player-name-input'), {
        target: { value: 'Player 1' },
      });
      fireEvent.change(screen.getByTestId('game-select'), {
        target: { value: 'wizard-vs-zombie' },
      });
      fireEvent.click(screen.getByTestId('create-room-btn'));
      expect(defaultProps.onCreateRoom).toHaveBeenCalledWith('Player 1', 'wizard-vs-zombie');
    });

    it('should disable create button when name is empty', () => {
      render(<LobbyScreen {...defaultProps} />);
      expect(screen.getByTestId('create-room-btn')).toBeDisabled();
    });

    it('should show loading state', () => {
      render(<LobbyScreen {...defaultProps} isLoading={true} />);
      expect(screen.getByTestId('create-room-btn')).toBeDisabled();
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('Join Room Mode', () => {
    it('should render join room form when join tab clicked', () => {
      render(<LobbyScreen {...defaultProps} />);
      fireEvent.click(screen.getByTestId('join-tab'));
      expect(screen.getByTestId('room-code-input')).toBeInTheDocument();
      expect(screen.getByTestId('join-room-btn')).toBeInTheDocument();
    });

    it('should call onJoinRoom with room code and player name', () => {
      render(<LobbyScreen {...defaultProps} />);
      fireEvent.click(screen.getByTestId('join-tab'));
      fireEvent.change(screen.getByTestId('room-code-input'), {
        target: { value: 'ABC123' },
      });
      fireEvent.change(screen.getByTestId('player-name-input'), {
        target: { value: 'Player 2' },
      });
      fireEvent.click(screen.getByTestId('join-room-btn'));
      expect(defaultProps.onJoinRoom).toHaveBeenCalledWith('ABC123', 'Player 2');
    });

    it('should convert room code to uppercase', () => {
      render(<LobbyScreen {...defaultProps} />);
      fireEvent.click(screen.getByTestId('join-tab'));
      const input = screen.getByTestId('room-code-input');
      fireEvent.change(input, { target: { value: 'abc123' } });
      expect(input).toHaveValue('ABC123');
    });

    it('should disable join button when fields are empty', () => {
      render(<LobbyScreen {...defaultProps} />);
      fireEvent.click(screen.getByTestId('join-tab'));
      expect(screen.getByTestId('join-room-btn')).toBeDisabled();
    });
  });

  describe('Lobby Mode', () => {
    const lobbyProps = {
      ...defaultProps,
      mode: 'lobby' as const,
      roomCode: 'ABC123',
      players: [
        { id: 'host1', name: 'Host', isHost: true, isConnected: true },
        { id: 'player1', name: 'Player 1', isHost: false, isConnected: true },
      ],
      currentPlayerId: 'host1',
    };

    it('should display room code', () => {
      render(<LobbyScreen {...lobbyProps} />);
      expect(screen.getByTestId('room-code')).toHaveTextContent('ABC123');
    });

    it('should display player list', () => {
      render(<LobbyScreen {...lobbyProps} />);
      expect(screen.getByTestId('player-host1')).toBeInTheDocument();
      expect(screen.getByTestId('player-player1')).toBeInTheDocument();
      expect(screen.getByText('Host')).toBeInTheDocument();
      expect(screen.getByText('Player 1')).toBeInTheDocument();
    });

    it('should show host icon for host player', () => {
      render(<LobbyScreen {...lobbyProps} />);
      expect(screen.getByTestId('player-host1').querySelector('[data-testid="host-icon"]')).toBeInTheDocument();
    });

    it('should show start game button for host', () => {
      render(<LobbyScreen {...lobbyProps} />);
      expect(screen.getByTestId('start-game-btn')).toBeInTheDocument();
    });

    it('should call onStartGame when start button clicked', () => {
      render(<LobbyScreen {...lobbyProps} />);
      fireEvent.click(screen.getByTestId('start-game-btn'));
      expect(defaultProps.onStartGame).toHaveBeenCalled();
    });

    it('should disable start game with less than 2 players', () => {
      render(
        <LobbyScreen
          {...lobbyProps}
          players={[{ id: 'host1', name: 'Host', isHost: true, isConnected: true }]}
        />
      );
      expect(screen.getByTestId('start-game-btn')).toBeDisabled();
    });

    it('should show host controls for host player', () => {
      render(<LobbyScreen {...lobbyProps} />);
      expect(screen.getByTestId('kick-player-player1')).toBeInTheDocument();
      expect(screen.getByTestId('transfer-host-player1')).toBeInTheDocument();
    });

    it('should call onKickPlayer when kick button clicked', () => {
      render(<LobbyScreen {...lobbyProps} />);
      fireEvent.click(screen.getByTestId('kick-player-player1'));
      expect(defaultProps.onKickPlayer).toHaveBeenCalledWith('player1');
    });

    it('should call onTransferHost when transfer button clicked', () => {
      render(<LobbyScreen {...lobbyProps} />);
      fireEvent.click(screen.getByTestId('transfer-host-player1'));
      expect(defaultProps.onTransferHost).toHaveBeenCalledWith('player1');
    });

    it('should show waiting message for non-host players', () => {
      render(<LobbyScreen {...lobbyProps} currentPlayerId="player1" />);
      expect(screen.getByText('Waiting for host to start the game...')).toBeInTheDocument();
      expect(screen.queryByTestId('start-game-btn')).not.toBeInTheDocument();
    });

    it('should call onLeaveRoom when leave button clicked', () => {
      render(<LobbyScreen {...lobbyProps} />);
      fireEvent.click(screen.getByText('Leave Room'));
      expect(defaultProps.onLeaveRoom).toHaveBeenCalled();
    });

    it('should display error message', () => {
      render(<LobbyScreen {...lobbyProps} error="Room is full" />);
      expect(screen.getByText('Room is full')).toBeInTheDocument();
    });

    it('should show game name when provided', () => {
      render(<LobbyScreen {...lobbyProps} gameName="Wizard vs Zombie" />);
      expect(screen.getByText('Wizard vs Zombie')).toBeInTheDocument();
    });

    it('should show player count', () => {
      render(<LobbyScreen {...lobbyProps} />);
      expect(screen.getByText('2 players')).toBeInTheDocument();
    });

    it('should show singular player count for 1 player', () => {
      render(
        <LobbyScreen
          {...lobbyProps}
          players={[{ id: 'host1', name: 'Host', isHost: true, isConnected: true }]}
        />
      );
      expect(screen.getByText('1 player')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error in create mode', () => {
      render(<LobbyScreen {...defaultProps} error="Failed to create room" />);
      expect(screen.getByText('Failed to create room')).toBeInTheDocument();
    });
  });
});
