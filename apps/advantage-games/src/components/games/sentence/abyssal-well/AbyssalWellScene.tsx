'use client'

import type {} from '@react-three/fiber'
import { Text } from '@react-three/drei'
import type { AbyssalWellState } from '@/lib/games/abyssalWell'
import { WELL, wellPosition } from './wellProjection'

const COLORS = {
  tube: '#22d3ee',
  targetEnemy: '#fbbf24',
  enemy: '#7c3aed',
  projectile: '#22d3ee',
  player: '#06b6d4',
  word: '#ffffff',
} as const

type AbyssalWellSceneProps = {
  state: AbyssalWellState
  /** Accessibility text-size multiplier applied to word labels (default 1). */
  textScale?: number
}

/**
 * Pure R3F render layer for The Abyssal Well (Tier 2 / R3F game).
 *
 * Renders scene elements only — no <Canvas>, no game logic, no effects.
 * The Canvas, camera, bloom and HUD live in AbyssalWellGame; state comes
 * from the deterministic logic module in src/lib/games/abyssalWell.ts.
 * Testable GPU-free via @react-three/test-renderer.
 */
export function AbyssalWellScene({ state, textScale = 1 }: AbyssalWellSceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 2]} intensity={8} color={COLORS.tube} />

      {/* The well: a wireframe tube with one radial segment per lane, so
          the wire edges themselves mark the lane boundaries. */}
      <mesh name="well-tube" position={[0, 0, -WELL.length / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[WELL.radius, WELL.radius, WELL.length, WELL.lanes, 12, true]}
        />
        <meshBasicMaterial color={COLORS.tube} wireframe transparent opacity={0.35} />
      </mesh>

      {/* Depth glow at the far end of the well */}
      <mesh name="well-floor" position={[0, 0, -WELL.length]}>
        <circleGeometry args={[WELL.radius, WELL.lanes]} />
        <meshBasicMaterial color="#0e7490" transparent opacity={0.5} />
      </mesh>

      {state.enemies.map((enemy) => {
        const isTarget = enemy.wordIndex === state.targetIndex
        const position = wellPosition(enemy.lane, enemy.depth)
        // Grow slightly as they approach the rim, like the 2D version did.
        const size = 0.28 + enemy.depth * 0.22
        return (
          <group key={enemy.id} name={`enemy-${enemy.id}`} position={position}>
            <mesh name={`enemy-body-${enemy.id}`}>
              <icosahedronGeometry args={[size, 0]} />
              <meshBasicMaterial color={isTarget ? COLORS.targetEnemy : COLORS.enemy} />
            </mesh>
            <Text
              name={`enemy-word-${enemy.id}`}
              position={[0, size + 0.35, 0]}
              fontSize={0.42 * textScale}
              color={COLORS.word}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#0f172a"
            >
              {enemy.word}
            </Text>
          </group>
        )
      })}

      {state.projectiles.map((projectile) => (
        <mesh
          key={projectile.id}
          name={`projectile-${projectile.id}`}
          position={wellPosition(projectile.lane, projectile.depth)}
        >
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={COLORS.projectile} />
        </mesh>
      ))}

      {/* Player ship on the rim, nose pointing down the well */}
      <group name="player" position={wellPosition(state.player.lane, 1)}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.22, 0.55, 4]} />
          <meshBasicMaterial color={COLORS.player} />
        </mesh>
      </group>
    </>
  )
}
