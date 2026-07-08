/**
 * Scene-graph tests for the R3F Abyssal Well scene, following the harness
 * pattern from src/components/games/r3f/__tests__/SmokeScene.test.tsx.
 *
 * drei's <Text> (troika) loads fonts asynchronously, which jsdom can't do,
 * so it is mocked as a named mesh carrying its text in userData.
 */
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { createAbyssalWellState, startGame, type AbyssalWellState, type Enemy } from '@/lib/games/abyssalWell'
import { AbyssalWellScene } from './AbyssalWellScene'
import { WELL, wellPosition } from './wellProjection'

jest.mock('@react-three/drei', () => ({
  Text: ({ name, children, ...props }: { name?: string; children?: string; position?: [number, number, number] }) => (
    <mesh name={name} userData={{ text: children }} position={props.position} />
  ),
}))

const mockSentences = [{ term: 'The cat sits', translation: 'Le chat est assis' }]

function playingState(overrides: Partial<AbyssalWellState> = {}): AbyssalWellState {
  const state = startGame(createAbyssalWellState(mockSentences, { rng: () => 0 }))
  return { ...state, ...overrides }
}

const enemy = (over: Partial<Enemy> = {}): Enemy => ({
  id: 'enemy-1',
  lane: 2,
  depth: 0.4,
  word: 'cat',
  wordIndex: 1,
  type: 'cave-spider',
  ...over,
})

describe('AbyssalWellScene', () => {
  it('renders the well tube with one radial segment per lane', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <AbyssalWellScene state={playingState()} />
    )
    const tube = renderer.scene.findAll(
      (node) => node.instance.name === 'well-tube'
    )
    expect(tube).toHaveLength(1)

    const geometry = tube[0].findByType('CylinderGeometry')
    expect(geometry.props.args[3]).toBe(WELL.lanes)
  })

  it('renders the player at its lane on the rim', async () => {
    const state = playingState()
    state.player.lane = 3
    const renderer = await ReactThreeTestRenderer.create(
      <AbyssalWellScene state={state} />
    )
    const player = renderer.scene.findAll((n) => n.instance.name === 'player')
    expect(player).toHaveLength(1)

    const expected = wellPosition(3, 1)
    expect(player[0].instance.position.toArray()[0]).toBeCloseTo(expected[0])
    expect(player[0].instance.position.toArray()[1]).toBeCloseTo(expected[1])
  })

  it('renders an enemy group at its projected lane/depth position', async () => {
    const e = enemy({ lane: 2, depth: 0.4 })
    const renderer = await ReactThreeTestRenderer.create(
      <AbyssalWellScene state={playingState({ enemies: [e] })} />
    )
    const group = renderer.scene.findAll((n) => n.instance.name === 'enemy-enemy-1')
    expect(group).toHaveLength(1)

    const expected = wellPosition(2, 0.4)
    const actual = group[0].instance.position.toArray()
    expect(actual[0]).toBeCloseTo(expected[0])
    expect(actual[1]).toBeCloseTo(expected[1])
    expect(actual[2]).toBeCloseTo(expected[2])
  })

  it('renders the enemy word label', async () => {
    const e = enemy({ word: 'cat' })
    const renderer = await ReactThreeTestRenderer.create(
      <AbyssalWellScene state={playingState({ enemies: [e] })} />
    )
    const label = renderer.scene.findAll(
      (n) => n.instance.userData?.text === 'cat'
    )
    expect(label.length).toBeGreaterThanOrEqual(1)
  })

  it('highlights the target enemy differently from non-targets', async () => {
    // words: ['The', 'cat', 'sits'], targetIndex 0 → wordIndex 0 is the target
    const target = enemy({ id: 'e-target', lane: 1, wordIndex: 0 })
    const other = enemy({ id: 'e-other', lane: 4, wordIndex: 2 })
    const renderer = await ReactThreeTestRenderer.create(
      <AbyssalWellScene state={playingState({ enemies: [target, other], targetIndex: 0 })} />
    )

    const targetMesh = renderer.scene
      .findAll((n) => n.instance.name === 'enemy-body-e-target')[0]
      .findByType('MeshBasicMaterial')
    const otherMesh = renderer.scene
      .findAll((n) => n.instance.name === 'enemy-body-e-other')[0]
      .findByType('MeshBasicMaterial')

    expect(targetMesh.instance.color.getHexString()).not.toBe(
      otherMesh.instance.color.getHexString()
    )
  })

  it('renders projectiles at their projected positions', async () => {
    const state = playingState({
      projectiles: [{ id: 'proj-1', lane: 5, depth: 0.7 }],
    })
    const renderer = await ReactThreeTestRenderer.create(
      <AbyssalWellScene state={state} />
    )
    const proj = renderer.scene.findAll((n) => n.instance.name === 'projectile-proj-1')
    expect(proj).toHaveLength(1)

    const expected = wellPosition(5, 0.7)
    const actual = proj[0].instance.position.toArray()
    expect(actual[2]).toBeCloseTo(expected[2])
  })

  it('renders nothing gameplay-specific for an empty board without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <AbyssalWellScene state={playingState({ enemies: [], projectiles: [] })} />
    )
    expect(renderer.scene.findAll((n) => n.instance.name.startsWith('enemy-'))).toHaveLength(0)
    expect(renderer.scene.findAll((n) => n.instance.name.startsWith('projectile-'))).toHaveLength(0)
  })
})
