import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';

// Get simulated input for a given frame


export const WizardZombiePromo: React.FC = () => {
  const frame = useCurrentFrame();
  useVideoConfig();
  
  // Video structure (at 30 fps):
  // 0-150 frames (5s): Start screen with game poster
  // 150-450 frames (10s): First gameplay segment
  // 450-600 frames (5s): Title/transition overlay
  // 600-900 frames (10s): Second gameplay segment
  // 900-1050 frames (5s): End screen with CTA
  
  const showGameplay1 = frame >= 150 && frame < 450;
  const showTransition = frame >= 450 && frame < 600;
  const showGameplay2 = frame >= 600 && frame < 900;
  const showEnd = frame >= 900;
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Start Screen - 0 to 5 seconds */}
      {frame < 150 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #2d1b4e 50%, #1a1a1a 100%)',
          }}
        >
          {/* Game Poster */}
          <div
            style={{
              opacity: Math.min(frame / 60, 1),
              transform: `scale(${0.8 + Math.min(frame / 60, 1) * 0.2})`,
              maxWidth: '90%',
            }}
          >
            <Img
              src={staticFile('/wizard-vs-zombie.png')}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 20,
                boxShadow: '0 0 40px rgba(138, 43, 226, 0.6)',
              }}
            />
          </div>
          
          {/* Loading animation */}
          {frame > 90 && (
            <div
              style={{
                marginTop: 40,
                display: 'flex',
                gap: 10,
                opacity: (frame - 90) / 60,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#8a2be2',
                    animationDelay: `${i * 0.2}s`,
                    opacity: 0.5 + ((frame + i * 10) % 30) / 30 * 0.5,
                  }}
                />
              ))}
            </div>
          )}
        </AbsoluteFill>
      )}
      
      {/* First Gameplay Segment - 5 to 15 seconds */}
      {showGameplay1 && (
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #2d1b4e 100%)' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 40,
            }}
          >
            <h2
              style={{
                fontSize: 60,
                color: '#ffd700',
                margin: 0,
                textAlign: 'center',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              }}
            >
              Gameplay Preview
            </h2>
            <p
              style={{
                fontSize: 24,
                color: '#fff',
                marginTop: 20,
                textAlign: 'center',
              }}
            >
              Battle zombies while learning vocabulary!
            </p>
          </div>
        </AbsoluteFill>
      )}
      
      {/* Transition - 15 to 20 seconds */}
      {showTransition && (
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, #2d1b4e 0%, #1a1a1a 100%)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '60px',
                borderRadius: 20,
                textAlign: 'center',
              }}
            >
              <h2
                style={{
                  fontSize: 60,
                  color: '#ffd700',
                  margin: 0,
                  textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                }}
              >
                Battle Zombies!
              </h2>
              <p
                style={{
                  fontSize: 32,
                  color: '#fff',
                  marginTop: 20,
                }}
              >
                Match words to survive
              </p>
            </div>
          </div>
        </AbsoluteFill>
      )}
      
      {/* Second Gameplay Segment - 20 to 30 seconds */}
      {showGameplay2 && (
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #2d1b4e 100%)' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 40,
            }}
          >
            <h2
              style={{
                fontSize: 60,
                color: '#ffd700',
                margin: 0,
                textAlign: 'center',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              }}
            >
              Earn XP & Level Up!
            </h2>
            <p
              style={{
                fontSize: 24,
                color: '#fff',
                marginTop: 20,
                textAlign: 'center',
              }}
            >
              Collect orbs and defeat enemies
            </p>
          </div>
        </AbsoluteFill>
      )}
      
      {/* End Screen - 30 to 35 seconds */}
      {showEnd && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(180deg, #2d1b4e 0%, #1a1a1a 100%)',
          }}
        >
          <div
            style={{
              opacity: Math.min((frame - 900) / 30, 1),
              transform: `translateY(${Math.max(50 - (frame - 900), 0)}px)`,
            }}
          >
            <h1
              style={{
                fontSize: 80,
                fontWeight: 'bold',
                color: '#fff',
                textShadow: '0 0 30px rgba(138, 43, 226, 0.8)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Play Now!
            </h1>
            <p
              style={{
                fontSize: 40,
                color: '#ffd700',
                fontWeight: '300',
                textAlign: 'center',
                marginTop: 40,
              }}
            >
              advantage-games.com
            </p>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};