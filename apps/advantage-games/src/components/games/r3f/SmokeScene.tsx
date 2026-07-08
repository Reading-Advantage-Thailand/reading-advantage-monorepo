'use client'

/**
 * Minimal R3F scene used by the test-harness smoke test.
 *
 * Reference pattern for Tier 2 (R3F) games — see "Rendering Tiers" in
 * measure/tech-stack.md:
 * - Scene components render R3F elements only (no <Canvas>); the Canvas
 *   lives in the game component so tests can mount scenes directly with
 *   @react-three/test-renderer (no GPU needed).
 * - Props in, scene graph out: no game logic inside the render layer.
 */
type SmokeSceneProps = {
  position?: [number, number, number]
}

export function SmokeScene({ position = [0, 0, 0] }: SmokeSceneProps) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#22d3ee" />
    </mesh>
  )
}
