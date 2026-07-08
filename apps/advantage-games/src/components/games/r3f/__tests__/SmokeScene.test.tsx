/**
 * Smoke test for the R3F test harness (track: r3f_rendering_tier_20260708).
 *
 * Proves that @react-three/test-renderer can mount an R3F scene under Jest
 * without a GPU and make scene-graph assertions. This is the reference
 * pattern for all Tier 2 (R3F) game render-layer tests — see the
 * "Rendering Tiers" section of measure/tech-stack.md.
 */
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { SmokeScene } from '../SmokeScene'

describe('SmokeScene (R3F test harness)', () => {
  it('mounts a mesh into the scene graph without a GPU', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SmokeScene />)

    const mesh = renderer.scene.findByType('Mesh')
    expect(mesh).toBeDefined()
  })

  it('applies position and geometry props to the mesh', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SmokeScene position={[1, 2, 3]} />
    )

    const mesh = renderer.scene.findByType('Mesh')
    expect(mesh.instance.position.toArray()).toEqual([1, 2, 3])

    const geometry = renderer.scene.findByType('BoxGeometry')
    expect(geometry).toBeDefined()
  })

  it('re-renders when props change', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SmokeScene />)
    const mesh = renderer.scene.findByType('Mesh')
    expect(mesh.instance.position.toArray()).toEqual([0, 0, 0])

    await renderer.update(<SmokeScene position={[5, 0, 0]} />)
    expect(mesh.instance.position.toArray()).toEqual([5, 0, 0])
  })
})
