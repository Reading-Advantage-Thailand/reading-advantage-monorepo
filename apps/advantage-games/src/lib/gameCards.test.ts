import fs from 'node:fs'
import path from 'node:path'
import { gameCards } from './gameCards'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Resolves a catalog cover URL to a file under the app `public/` directory.
 * @param cover The `game.cover` path, optionally prefixed by `withBasePath`.
 * @returns Absolute path to the cover file on disk.
 */
function catalogCoverDiskPath(cover: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  let relative = cover
  if (basePath && relative.startsWith(basePath)) {
    relative = relative.slice(basePath.length)
  }
  relative = relative.replace(/^\/+/, '')
  return path.join(process.cwd(), 'public', relative)
}

describe('gameCards — APK catalog routes', () => {
  it('exposes exactly 28 unique playable cards with APK hrefs', () => {
    expect(gameCards).toHaveLength(28)
    expect(new Set(gameCards.map((card) => card.id)).size).toBe(28)
    expect(gameCards.every((card) => card.status === 'playable')).toBe(true)
    expect(
      gameCards.every((card) => card.href === `/student/games/apk/${card.id}`),
    ).toBe(true)
  })

  it('keeps hrefs locale-agnostic', () => {
    expect(gameCards.every((card) => !card.href?.startsWith('/en/'))).toBe(true)
  })

  it('keeps representative catalog IDs on their exact APK routes', () => {
    expect(gameCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'castle-defense',
          href: '/student/games/apk/castle-defense',
          status: 'playable',
        }),
        expect.objectContaining({
          id: 'magic-defense',
          href: '/student/games/apk/magic-defense',
          status: 'playable',
        }),
        expect.objectContaining({
          id: 'dragon-flight',
          href: '/student/games/apk/dragon-flight',
          status: 'playable',
        }),
        expect.objectContaining({
          id: 'astral-mage',
          href: '/student/games/apk/astral-mage',
          status: 'playable',
        }),
        expect.objectContaining({
          id: 'sorcerer-ziggurat',
          href: '/student/games/apk/sorcerer-ziggurat',
          status: 'playable',
        }),
        expect.objectContaining({
          id: 'dungeon-liberator',
          href: '/student/games/apk/dungeon-liberator',
          status: 'playable',
        }),
        expect.objectContaining({
          id: 'gryphon-patrol',
          href: '/student/games/apk/gryphon-patrol',
          status: 'playable',
        }),
      ]),
    )
  })
})

describe('gameCards — catalog cover files', () => {
  it('every game.cover exists under public/ and starts with PNG magic bytes', () => {
    expect(gameCards.length).toBeGreaterThan(0)

    for (const game of gameCards) {
      const filePath = catalogCoverDiskPath(game.cover)
      expect({
        id: game.id,
        cover: game.cover,
        filePath,
        exists: fs.existsSync(filePath),
      }).toEqual(
        expect.objectContaining({
          id: game.id,
          exists: true,
        }),
      )

      const header = Buffer.alloc(PNG_SIGNATURE.length)
      const fd = fs.openSync(filePath, 'r')
      fs.readSync(fd, header, 0, header.length, 0)
      fs.closeSync(fd)

      expect({
        id: game.id,
        filePath,
        magic: Array.from(header),
      }).toEqual({
        id: game.id,
        filePath,
        magic: Array.from(PNG_SIGNATURE),
      })
    }
  })
})

