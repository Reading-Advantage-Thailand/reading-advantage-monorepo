import React, { useEffect, useMemo, useState } from 'react';
import {
  Stage,
  Layer,
  Text,
  Group,
  Image as KonvaImage,
} from 'react-konva';
import {
  Difficulty,
  GAME_HEIGHT,
  GAME_WIDTH,
  WizardZombieState,
  advanceWizardZombieTime,
  createWizardZombieState,
} from '@/lib/games/wizardZombie';
import type { VocabularyItem } from '@/store/useGameStore';

interface WizardZombieGameRendererProps {
  vocabulary: VocabularyItem[];
  difficulty: Difficulty;
  simulatedInput: { dx: number; dy: number; cast: boolean };
  frame: number;
}

export const WizardZombieGameRenderer: React.FC<WizardZombieGameRendererProps> = ({
  vocabulary,
  difficulty,
  simulatedInput,
  frame,
}) => {
  const [assets, setAssets] = useState<{
    player: HTMLImageElement | null;
    zombie: HTMLImageElement | null;
    orb: HTMLImageElement | null;
    floor: HTMLImageElement | null;
  }>({
    player: null,
    zombie: null,
    orb: null,
    floor: null,
  });
  
  // Load assets
  useEffect(() => {
    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new window.Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
    
    Promise.all([
      loadImage('/games/vocabulary/wizard-vs-zombie/player_3x3_pose_sheet.png'),
      loadImage('/games/vocabulary/wizard-vs-zombie/zombie_3x3_pose_sheet.png'),
      loadImage('/games/vocabulary/wizard-vs-zombie/orb_3x3_pose_sheet.png'),
      loadImage('/games/vocabulary/wizard-vs-zombie/tile-ruins.png'),
    ]).then(([player, zombie, orb, floor]) => {
      setAssets({ player, zombie, orb, floor });
    }).catch(console.error);
  }, []);
  
  // Initialize game state
  const [gameState, setGameState] = useState<WizardZombieState | null>(null);
  
  useEffect(() => {
    if (vocabulary.length > 0) {
      setGameState(createWizardZombieState(vocabulary, { difficulty }));
    }
  }, [vocabulary, difficulty]);
  
  // Advance game state based on frame (simulating 20 FPS game loop)
  const framesPerGameStateUpdate = 3; // Update game state every 3 Remotion frames
  const gameStateFrame = Math.floor(frame / framesPerGameStateUpdate);
  
  useMemo(() => {
    if (!gameState || gameState.status !== 'playing') return;
    
    // Simulate game loop - advance state
    let currentState = gameState;
    for (let i = 0; i < gameStateFrame; i++) {
      if (currentState.status === 'playing') {
        currentState = advanceWizardZombieTime(
          currentState,
          50, // 50ms per update
          simulatedInput,
          vocabulary
        );
      }
    }
    
    setGameState({ ...currentState } as WizardZombieState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStateFrame]);
  
  // Animation frames (0-2 for sprite animation)
  const animFrame = frame % 3;
  
  if (!gameState || !assets.player || !assets.zombie || !assets.orb || !assets.floor) {
    return <div style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: '#1a1a1a' }} />;
  }
  
  const spriteSize = 64;
  
  return (
    <div style={{ width: GAME_WIDTH, height: GAME_HEIGHT, position: 'relative' }}>
      <Stage width={GAME_WIDTH} height={GAME_HEIGHT}>
        <Layer>
          {/* Floor background */}
          {Array.from({ length: Math.ceil(GAME_HEIGHT / 64) }).map((_, row) =>
            Array.from({ length: Math.ceil(GAME_WIDTH / 64) }).map((_, col) => (
              <KonvaImage
                key={`floor-${row}-${col}`}
                image={assets.floor!}
                x={col * 64}
                y={row * 64}
                width={64}
                height={64}
              />
            ))
          )}
          
          {/* Orbs */}
          {gameState.orbs.map((orb) => (
            <Group key={orb.id} x={orb.x} y={orb.y}>
              <KonvaImage
                image={assets.orb!}
                x={-32}
                y={-32}
                width={spriteSize}
                height={spriteSize}
                crop={{
                  x: 0,
                  y: animFrame * spriteSize,
                  width: spriteSize,
                  height: spriteSize,
                }}
              />
              <Text
                text={orb.word}
                fontSize={14}
                fill={orb.isCorrect ? '#00ff00' : '#ffffff'}
                align="center"
                y={-40}
              />
            </Group>
          ))}
          
          {/* Player */}
          <Group x={gameState.player.x} y={gameState.player.y}>
            <KonvaImage
              image={assets.player!}
              x={-32}
              y={-32}
              width={spriteSize}
              height={spriteSize}
              crop={{
                x: animFrame * spriteSize,
                y: 0,
                width: spriteSize,
                height: spriteSize,
              }}
            />
          </Group>
          
          {/* Zombies */}
          {gameState.zombies.map((zombie) => (
            <KonvaImage
              key={zombie.id}
              image={assets.zombie!}
              x={zombie.x - 32}
              y={zombie.y - 32}
              width={spriteSize}
              height={spriteSize}
              crop={{
                x: animFrame * spriteSize,
                y: 0,
                width: spriteSize,
                height: spriteSize,
              }}
            />
          ))}
        </Layer>
      </Stage>
      
      {/* HUD */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 24,
          fontWeight: 'bold',
        }}
      >
        <div>HP: {gameState.player.hp}</div>
        <div style={{ marginTop: 5 }}>Score: {gameState.score}</div>
      </div>
    </div>
  );
};