import { useScopedI18n, useCurrentLocale, useI18n } from './client'

describe('locales/client', () => {
  describe('useScopedI18n', () => {
    it('returns translation for scoped key', () => {
      const t = useScopedI18n('pages.student.gamesPage.common')
      expect(t('startGame')).toBe('Start Game')
      expect(t('gameOver')).toBe('Game Over')
    })

    it('returns key if translation not found', () => {
      const t = useScopedI18n('pages.student.gamesPage.common')
      expect(t('nonexistent')).toBe('nonexistent')
    })

    it('handles nested scopes', () => {
      const t = useScopedI18n('pages.student.gamesPage.games.dragonFlight')
      expect(t('title')).toBe('Dragon Flight')
    })

    it('interpolates parameters', () => {
      const t = useScopedI18n('pages.student.readPage.article')
      const result = t('scoreText', { score: '10' })
      expect(result).toBe('10')
    })
  })

  describe('useCurrentLocale', () => {
    it('returns en', () => {
      expect(useCurrentLocale()).toBe('en')
    })
  })

  describe('useI18n', () => {
    it('returns translation for full key', () => {
      const t = useI18n()
      expect(t('pages.student.gamesPage.common.startGame')).toBe('Start Game')
    })

    it('returns key if translation not found', () => {
      const t = useI18n()
      expect(t('nonexistent.key')).toBe('nonexistent.key')
    })
  })
})
