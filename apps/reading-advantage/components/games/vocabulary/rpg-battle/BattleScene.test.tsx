import { render, screen } from '@testing-library/react'
import { BattleScene } from './BattleScene'

describe('BattleScene', () => {
  it('renders the player, enemy, and UI slots in the layout', () => {
    render(
      <BattleScene
        player={<div>Player Sprite</div>}
        enemy={<div>Enemy Sprite</div>}
        playerHealth={<div>Player HP</div>}
        enemyHealth={<div>Enemy HP</div>}
        actionMenu={<div>Action Menu</div>}
        battleLog={<div>Battle Log</div>}
      />
    )

    const stage = screen.getByTestId('battle-stage')
    expect(stage).toContainElement(screen.getByText('Player Sprite'))
    expect(stage).toContainElement(screen.getByText('Enemy Sprite'))
    expect(stage).toContainElement(screen.getByText('Player HP'))
    expect(stage).toContainElement(screen.getByText('Enemy HP'))

    const ui = screen.getByTestId('battle-ui')
    expect(ui).toContainElement(screen.getByText('Action Menu'))
    expect(ui).toContainElement(screen.getByText('Battle Log'))
  })

  it('applies a background image when provided', () => {
    render(
      <BattleScene
        player={<div>Player Sprite</div>}
        enemy={<div>Enemy Sprite</div>}
        playerHealth={<div>Player HP</div>}
        enemyHealth={<div>Enemy HP</div>}
        actionMenu={<div>Action Menu</div>}
        battleLog={<div>Battle Log</div>}
        backgroundImage="/games/rpg-battle/background_forest_clearing.png"
      />
    )

    const stage = screen.getByTestId('battle-stage')
    expect(stage).toHaveStyle({
      backgroundImage: 'url(/games/rpg-battle/background_forest_clearing.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    })
  })
})
