import { gameCards } from './gameCards'

/**
 * Phase 5 — Group 5E: `gameCards.ts` hrefs must be locale-agnostic.
 *
 * Provenance: `phase-5-decisions.md` Decision 5.1 §3 and Decision 5.2.
 */

describe('gameCards — locale-agnostic hrefs', () => {
  it('has no /en/-prefixed hrefs (D-07)', () => {
    const bad = gameCards.filter((card) => card.href?.startsWith('/en/'))
    expect(bad).toHaveLength(0)
  })

  it('positive control: every playable card has a non-empty href', () => {
    const playable = gameCards.filter((card) => card.status === 'playable')
    const withHref = playable.filter(
      (card) => typeof card.href === 'string' && card.href.length > 0,
    )
    expect(withHref.length).toBe(playable.length)
  })

  it('publishes the exact nine APK cartridges through production arcade routes', () => {
    const apkIds = [
      'dragon-flight',
      'dungeon-liberator',
      'magic-defense',
      'astral-mage',
      'sorcerer-ziggurat',
      'dragon-rider',
      'spellweavers-run',
      'griffin-riders-escape',
      'storm-castle-tower',
    ]
    const apkCards = gameCards.filter((card) =>
      apkIds.includes(card.id)
    )

    expect(apkCards).toHaveLength(9)
    for (const card of apkCards) {
      expect(card).toEqual(expect.objectContaining({
        status: 'playable',
        href: `/student/arcade/${card.id}`,
      }))
    }
  })
})
