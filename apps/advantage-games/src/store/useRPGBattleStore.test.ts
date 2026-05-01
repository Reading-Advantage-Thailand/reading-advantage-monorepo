import { useRPGBattleStore } from './useRPGBattleStore'

describe('useRPGBattleStore', () => {
  it('should initialize with default values', () => {
    const state = useRPGBattleStore.getState()
    
    expect(state.playerHealth).toBe(100)
    expect(state.playerMaxHealth).toBe(100)
    expect(state.enemyHealth).toBe(100)
    expect(state.enemyMaxHealth).toBe(100)
    expect(state.turn).toBe('player')
    expect(state.status).toBe('idle')
    expect(state.battleLog).toEqual([])
    expect(state.streak).toBe(0)
    expect(state.xpEarned).toBe(0)
    expect(state.selectionStep).toBe('hero')
    expect(state.selectedHeroId).toBeNull()
    expect(state.selectedLocationId).toBeNull()
    expect(state.selectedEnemyId).toBeNull()
  })

  it('should initialize battle correctly', () => {
    const { initializeBattle } = useRPGBattleStore.getState()
    initializeBattle()
    
    const state = useRPGBattleStore.getState()
    expect(state.status).toBe('playing')
    expect(state.battleLog).toHaveLength(1)
    expect(state.battleLog[0].text).toBe('A wild monster appears!')
  })

  it('should initialize battle with scaled enemy health', () => {
    const { initializeBattle } = useRPGBattleStore.getState()
    initializeBattle({ enemyMaxHealth: 150 })

    const state = useRPGBattleStore.getState()
    expect(state.enemyMaxHealth).toBe(150)
    expect(state.enemyHealth).toBe(150)
  })

  it('should add log entries correctly', () => {
    const { addLogEntry } = useRPGBattleStore.getState()
    addLogEntry('Test message', 'player')
    
    const state = useRPGBattleStore.getState()
    expect(state.battleLog).toContainEqual({ text: 'Test message', type: 'player' })
  })

  it('should transition turns correctly', () => {
    const { initializeBattle, setTurn } = useRPGBattleStore.getState()
    initializeBattle()
    
    setTurn('enemy')
    expect(useRPGBattleStore.getState().turn).toBe('enemy')
    
    setTurn('player')
    expect(useRPGBattleStore.getState().turn).toBe('player')
  })

  it('should update battle status correctly', () => {
    const { setStatus } = useRPGBattleStore.getState()
    
    setStatus('victory')
    expect(useRPGBattleStore.getState().status).toBe('victory')
    
    setStatus('defeat')
    expect(useRPGBattleStore.getState().status).toBe('defeat')
  })

  it('should apply damage to the player and handle defeat', () => {
    const { initializeBattle, damagePlayer } = useRPGBattleStore.getState()
    initializeBattle()

    damagePlayer(30)
    expect(useRPGBattleStore.getState().playerHealth).toBe(70)
    expect(useRPGBattleStore.getState().status).toBe('playing')

    damagePlayer(200)
    expect(useRPGBattleStore.getState().playerHealth).toBe(0)
    expect(useRPGBattleStore.getState().status).toBe('defeat')
  })

  it('should apply damage to the enemy and handle victory', () => {
    const { initializeBattle, damageEnemy } = useRPGBattleStore.getState()
    initializeBattle()

    damageEnemy(45)
    expect(useRPGBattleStore.getState().enemyHealth).toBe(55)
    expect(useRPGBattleStore.getState().status).toBe('playing')

    damageEnemy(200)
    expect(useRPGBattleStore.getState().enemyHealth).toBe(0)
    expect(useRPGBattleStore.getState().status).toBe('victory')
  })

  it('should reveal the correct translation for 2 seconds on incorrect input', () => {
    jest.useFakeTimers()
    const { initializeBattle, submitAnswer } = useRPGBattleStore.getState()
    initializeBattle()

    const result = submitAnswer('wrong', 'Correct')
    expect(result).toBe(false)
    expect(useRPGBattleStore.getState().inputLocked).toBe(true)
    expect(useRPGBattleStore.getState().revealedTranslation).toBe('Correct')
    expect(useRPGBattleStore.getState().streak).toBe(0)

    jest.advanceTimersByTime(2000)
    expect(useRPGBattleStore.getState().inputLocked).toBe(false)
    expect(useRPGBattleStore.getState().revealedTranslation).toBeNull()
    jest.useRealTimers()
  })

  it('should keep input unlocked and increment streak on correct input', () => {
    const { initializeBattle, submitAnswer } = useRPGBattleStore.getState()
    initializeBattle()

    const result = submitAnswer('correct', 'Correct')
    expect(result).toBe(true)
    expect(useRPGBattleStore.getState().inputLocked).toBe(false)
    expect(useRPGBattleStore.getState().revealedTranslation).toBeNull()
    expect(useRPGBattleStore.getState().streak).toBe(1)
  })

  it('should update player pose on damage and defeat', () => {
    const { initializeBattle, damagePlayer } = useRPGBattleStore.getState()
    initializeBattle()

    damagePlayer(5)
    expect(useRPGBattleStore.getState().playerPose).toBe('hurt')

    damagePlayer(500)
    expect(useRPGBattleStore.getState().status).toBe('defeat')
    expect(useRPGBattleStore.getState().playerPose).toBe('defeat')
  })

  it('should update enemy and player poses on enemy damage and victory', () => {
    const { initializeBattle, damageEnemy } = useRPGBattleStore.getState()
    initializeBattle()

    damageEnemy(5)
    expect(useRPGBattleStore.getState().enemyPose).toBe('hurt')

    damageEnemy(500)
    expect(useRPGBattleStore.getState().status).toBe('victory')
    expect(useRPGBattleStore.getState().enemyPose).toBe('defeat')
    expect(useRPGBattleStore.getState().playerPose).toBe('victory')
  })

  it('should update player pose based on answer result', () => {
    const { initializeBattle, submitAnswer } = useRPGBattleStore.getState()
    initializeBattle()

    submitAnswer('wrong', 'Correct')
    expect(useRPGBattleStore.getState().playerPose).toBe('miss')

    submitAnswer('Correct', 'Correct', 'power')
    expect(useRPGBattleStore.getState().playerPose).toBe('power-attack')

    submitAnswer('Correct', 'Correct', 'basic')
    expect(useRPGBattleStore.getState().playerPose).toBe('basic-attack')
  })

  it('should execute enemy attack on enemy turn', () => {
    const { initializeBattle, setTurn, enemyAttack } = useRPGBattleStore.getState()
    initializeBattle()
    setTurn('enemy')

    enemyAttack(12)

    const state = useRPGBattleStore.getState()
    expect(state.playerHealth).toBe(88)
    expect(state.turn).toBe('player')
    expect(state.enemyPose).toBe('basic-attack')
  })

  it('should ignore enemy attack when not in enemy turn', () => {
    const { initializeBattle, setTurn, enemyAttack } = useRPGBattleStore.getState()
    initializeBattle()
    setTurn('player')

    enemyAttack(12)

    const state = useRPGBattleStore.getState()
    expect(state.playerHealth).toBe(100)
    expect(state.enemyPose).toBe('idle')
  })

  it('should enforce selection order', () => {
    const { selectHero, selectLocation, selectEnemy } = useRPGBattleStore.getState()
    useRPGBattleStore.setState({
      selectionStep: 'hero',
      selectedHeroId: null,
      selectedLocationId: null,
      selectedEnemyId: null,
    })

    selectLocation('forest-clearing')
    expect(useRPGBattleStore.getState().selectedLocationId).toBeNull()
    expect(useRPGBattleStore.getState().selectionStep).toBe('hero')

    selectHero('female')
    expect(useRPGBattleStore.getState().selectedHeroId).toBe('female')
    expect(useRPGBattleStore.getState().selectionStep).toBe('location')

    selectEnemy('slime')
    expect(useRPGBattleStore.getState().selectedEnemyId).toBeNull()
    expect(useRPGBattleStore.getState().selectionStep).toBe('location')

    selectLocation('magic-arena')
    expect(useRPGBattleStore.getState().selectedLocationId).toBe('magic-arena')
    expect(useRPGBattleStore.getState().selectionStep).toBe('enemy')

    selectEnemy('elemental')
    expect(useRPGBattleStore.getState().selectedEnemyId).toBe('elemental')
    expect(useRPGBattleStore.getState().selectionStep).toBe('ready')
  })

  it('should reset selection state', () => {
    const { resetSelection, selectHero, selectLocation, selectEnemy } = useRPGBattleStore.getState()
    useRPGBattleStore.setState({
      selectionStep: 'hero',
      selectedHeroId: null,
      selectedLocationId: null,
      selectedEnemyId: null,
    })

    selectHero('male')
    selectLocation('ruined-road')
    selectEnemy('spectre')

    resetSelection()

    const state = useRPGBattleStore.getState()
    expect(state.selectionStep).toBe('hero')
    expect(state.selectedHeroId).toBeNull()
    expect(state.selectedLocationId).toBeNull()
    expect(state.selectedEnemyId).toBeNull()
  })
})
