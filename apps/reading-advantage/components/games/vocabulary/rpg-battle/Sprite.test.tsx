import { render, screen } from '@testing-library/react'
import { Sprite } from './Sprite'

describe('Sprite', () => {
  it('positions the pose within the 3x3 sheet', () => {
    render(
      <Sprite
        src="/games/rpg-battle/hero_male_pose_sheet_3x3.png"
        pose="casting"
        alt="Hero"
        size={120}
      />
    )

    const sprite = screen.getByRole('img', { name: 'Hero' })
    expect(sprite).toHaveStyle({ backgroundPosition: '50% 0%' })
    expect(sprite).toHaveStyle({ width: '120px', height: '120px' })
  })

  it('flips the sprite horizontally when requested', () => {
    render(
      <Sprite
        src="/games/rpg-battle/hero_male_pose_sheet_3x3.png"
        pose="idle"
        alt="Hero"
        flip
      />
    )

    const sprite = screen.getByRole('img', { name: 'Hero' })
    expect(sprite).toHaveStyle({ transform: 'scaleX(-1)' })
  })
})
