'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Catalog identifiers that have a dedicated `/sounds/music/{id}.mp3` track. */
export const GAME_MUSIC_IDS = [
  'castle-defense',
  'dragon-rider',
  'magic-defense',
  'rpg-battle',
  'dragon-flight',
  'wizard-vs-zombie',
  'enchanted-library',
  'rune-match',
  'alchemists-synthesis',
  'potion-rush',
  'dungeon-liberator',
  'spellweavers-run',
  'shadow-gate-dungeon',
  'rune-forge-chamber',
  'village-guardian',
  'labyrinth-goblin-king',
  'abyssal-well',
  'archers-revenge',
  'storm-castle-tower',
  'griffin-sky-joust',
  'realm-carver',
  'paladins-twin-soul',
  'griffin-riders-escape',
  'astral-mage',
  'devourer-slime',
  'babel-architect',
  'sorcerer-ziggurat',
  'haunted-library',
  'gryphon-patrol',
] as const

/** Catalog identifier for a looping APK background track. */
export type GameMusicId = (typeof GAME_MUSIC_IDS)[number]

const GAME_MUSIC_ID_SET: ReadonlySet<string> = new Set(GAME_MUSIC_IDS)

const GAME_MUSIC_FALLBACK_ID: GameMusicId = 'dragon-flight'

/**
 * Reports whether a catalog identifier has a dedicated music file.
 * @param value Candidate cartridge or catalog identifier.
 * @returns True when the identifier is a known game music id.
 */
export function isGameMusicId(value: string): value is GameMusicId {
  return GAME_MUSIC_ID_SET.has(value)
}

/**
 * Maps a cartridge id onto a looping catalog music track.
 * @param cartridgeId Public catalog identifier for the cartridge.
 * @returns The matching GameMusicId, or a stable fallback when the id is unknown.
 */
export function resolveGameMusicId(cartridgeId: string): GameMusicId {
  return isGameMusicId(cartridgeId) ? cartridgeId : GAME_MUSIC_FALLBACK_ID
}

function getMusicPath(gameId: GameMusicId): string {
  return `/sounds/music/${gameId}.mp3`
}

/**
 * Loads looping catalog music for one game id and exposes start, stop, and pause.
 * @param gameId Catalog identifier whose mp3 lives at /sounds/music/{id}.mp3.
 * @returns Playback controls and whether the track is currently playing.
 */
export function useBackgroundMusic(gameId: GameMusicId) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayingRef = useRef(false)

  useEffect(() => {
    const audio = new Audio(getMusicPath(gameId))
    audio.loop = true
    audio.volume = 0.5
    audioRef.current = audio
    isPlayingRef.current = false
    setIsPlaying(false)

    return () => {
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
      isPlayingRef.current = false
      setIsPlaying(false)
    }
  }, [gameId])

  const start = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || isPlayingRef.current) return

    isPlayingRef.current = true
    try {
      await audio.play()
      setIsPlaying(true)
    } catch {
      isPlayingRef.current = false
      // Autoplay policy may block; user gesture required
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    isPlayingRef.current = false
    setIsPlaying(false)
  }, [])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    isPlayingRef.current = false
    setIsPlaying(false)
  }, [])

  return { start, stop, pause, isPlaying }
}