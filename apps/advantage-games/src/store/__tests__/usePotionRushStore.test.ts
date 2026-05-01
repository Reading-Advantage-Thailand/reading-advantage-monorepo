import { usePotionRushStore, Customer, CustomerType, Ingredient } from '@/store/usePotionRushStore'

describe('usePotionRushStore discardIngredient', () => {
  const makeIngredient = (id: string): Ingredient => ({
    id,
    word: 'test',
    x: 100,
    y: 200,
    type: 'herb',
    width: 80,
    isDragging: false,
  })

  beforeEach(() => {
    usePotionRushStore.setState({ conveyorItems: [] })
  })

  it('removes the ingredient when discarded', () => {
    const item = makeIngredient('ing-1')
    usePotionRushStore.setState({ conveyorItems: [item] })

    usePotionRushStore.getState().discardIngredient(item.id)

    expect(usePotionRushStore.getState().conveyorItems).toHaveLength(0)
  })

  it('does nothing when the ingredient id does not exist', () => {
    const item = makeIngredient('ing-1')
    usePotionRushStore.setState({ conveyorItems: [item] })

    usePotionRushStore.getState().discardIngredient('missing')

    expect(usePotionRushStore.getState().conveyorItems).toHaveLength(1)
  })
})

describe('usePotionRushStore dragging behavior', () => {
  const makeIngredient = (id: string, x: number, isDragging: boolean): Ingredient => ({
    id,
    word: 'drag',
    x,
    y: 200,
    type: 'herb',
    width: 80,
    isDragging,
  })

  beforeEach(() => {
    usePotionRushStore.setState({
      conveyorItems: [],
      gameState: 'PLAYING',
      beltSpeed: 100,
      baseBeltSpeed: 100,
    })
  })

  it('marks an ingredient as dragging', () => {
    const item = makeIngredient('drag-1', 300, false)
    usePotionRushStore.setState({ conveyorItems: [item] })

    usePotionRushStore.getState().setIngredientDragging(item.id, true)

    const updated = usePotionRushStore.getState().conveyorItems[0]
    expect(updated.isDragging).toBe(true)
  })

  it('does not move dragging ingredients during tick', () => {
    const dragging = makeIngredient('dragging', 500, true)
    const moving = makeIngredient('moving', 500, false)
    usePotionRushStore.setState({ conveyorItems: [dragging, moving] })

    usePotionRushStore.getState().tick(1, 1280)

    const after = usePotionRushStore.getState().conveyorItems
    const dragAfter = after.find(item => item.id === 'dragging')
    const moveAfter = after.find(item => item.id === 'moving')

    expect(dragAfter?.x).toBe(500)
    expect(moveAfter?.x).toBe(400)
  })
})

describe('usePotionRushStore queue logic', () => {
  const makeCustomer = (id: string, state: Customer['state'], leaveTimer?: number): Customer => ({
    id,
    type: 'orc' as CustomerType,
    request: { id: 'v1', term: 'hello', translation: 'hola', category: 'test' },
    patience: 30,
    maxPatience: 30,
    state,
    leaveTimer,
  })

  const vocabList = [{ id: 'v1', term: 'hello', translation: 'hola', category: 'test' }]

  beforeEach(() => {
    usePotionRushStore.setState({
      gameState: 'PLAYING',
      customers: [],
      conveyorItems: [],
      dayTime: 0,
      lives: 3,
    })
  })

  it('spawns customers up to the max of 3', () => {
    const customers = [
      makeCustomer('c1', 'WAITING'),
      makeCustomer('c2', 'WAITING'),
      makeCustomer('c3', 'WAITING'),
    ]
    usePotionRushStore.setState({ customers })

    usePotionRushStore.getState().spawnCustomer(vocabList)

    expect(usePotionRushStore.getState().customers).toHaveLength(3)
  })

  it('does not spawn when the game is not playing', () => {
    usePotionRushStore.setState({ gameState: 'MENU' })

    usePotionRushStore.getState().spawnCustomer(vocabList)

    expect(usePotionRushStore.getState().customers).toHaveLength(0)
  })

  it('removes leaving customers after their leave timer elapses', () => {
    const leaving = makeCustomer('c1', 'LEAVING_HAPPY', 0.5)
    usePotionRushStore.setState({ customers: [leaving] })

    usePotionRushStore.getState().tick(1, 1280)

    const remaining = usePotionRushStore.getState().customers.filter(Boolean)
    expect(remaining).toHaveLength(0)
  })
})

describe('usePotionRushStore effects', () => {
  const makeIngredient = (id: string, word: string): Ingredient => ({
    id,
    word,
    x: 100,
    y: 200,
    type: 'herb',
    width: 80,
    isDragging: false,
  })

  const makeCustomer = (id: string, term: string): Customer => ({
    id,
    type: 'orc' as CustomerType,
    request: { id: `${id}-v`, term, translation: 'hola', category: 'test' },
    patience: 30,
    maxPatience: 30,
    state: 'WAITING',
    leaveTimer: undefined,
  })

  beforeEach(() => {
    usePotionRushStore.setState({
      gameState: 'PLAYING',
      score: 0,
      lives: 3,
      dayTime: 0,
      effects: [],
      cauldrons: [
        { id: 0, state: 'IDLE', targetSentence: null, currentWords: [], shake: false },
        { id: 1, state: 'IDLE', targetSentence: null, currentWords: [], shake: false },
        { id: 2, state: 'IDLE', targetSentence: null, currentWords: [], shake: false },
      ],
      customers: [],
      conveyorItems: [],
    })
  })

  it('adds a splash effect when dropping a valid ingredient', () => {
    const customer = makeCustomer('c1', 'hello world')
    const ingredient = makeIngredient('i1', 'hello')
    usePotionRushStore.setState({
      customers: [customer],
      conveyorItems: [ingredient],
    })

    usePotionRushStore
      .getState()
      .handleDropIngredient(0, ingredient.id, { x: 240, y: 480 })

    const effects = usePotionRushStore.getState().effects
    expect(effects).toHaveLength(1)
    expect(effects[0].type).toBe('SPLASH')
    expect(effects[0].x).toBe(240)
    expect(effects[0].y).toBe(480)
  })

  it('adds smoke when dropping a wrong ingredient', () => {
    const customer = makeCustomer('c1', 'hello world')
    const ingredient = makeIngredient('i1', 'nope')
    usePotionRushStore.setState({
      customers: [customer],
      conveyorItems: [ingredient],
    })

    usePotionRushStore
      .getState()
      .handleDropIngredient(0, ingredient.id, { x: 240, y: 480 })

    const types = usePotionRushStore.getState().effects.map(effect => effect.type).sort()
    expect(types).toEqual(['SMOKE', 'SPLASH'])
    expect(usePotionRushStore.getState().cauldrons[0].state).toBe('WARNING')
  })

  it('adds success effects when serving a customer', () => {
    const customer = makeCustomer('c1', 'hello world')
    usePotionRushStore.setState({
      customers: [customer],
      cauldrons: [
        {
          id: 0,
          state: 'COMPLETED',
          targetSentence: customer.request,
          currentWords: ['hello', 'world'],
          shake: false,
        },
        { id: 1, state: 'IDLE', targetSentence: null, currentWords: [], shake: false },
        { id: 2, state: 'IDLE', targetSentence: null, currentWords: [], shake: false },
      ],
    })

    usePotionRushStore
      .getState()
      .handleServeCustomer(customer.id, 0, { x: 320, y: 140 })

    const types = usePotionRushStore.getState().effects.map(effect => effect.type)
    expect(types).toContain('SUCCESS')
  })

  it('expires effects after their duration', () => {
    usePotionRushStore.getState().spawnEffect('SPLASH', 10, 10)
    const [effect] = usePotionRushStore.getState().effects

    usePotionRushStore.getState().tick(effect.duration + 0.1, 1280)

    expect(usePotionRushStore.getState().effects).toHaveLength(0)
  })
})
