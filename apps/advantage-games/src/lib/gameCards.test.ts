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
})
