import type { VocabularyItem } from '@/store/useGameStore'

export type { VocabularyItem }

export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme'

export type RankingEntry = {
  userId: string
  name: string
  image?: string | null
  xp: number
}

export type RankingsByDifficulty = {
  easy: RankingEntry[]
  normal: RankingEntry[]
  hard: RankingEntry[]
  extreme: RankingEntry[]
}

export type CompleteRequest = {
  xp?: number
  accuracy: number
  correctAnswers: number
  totalAttempts: number
  difficulty?: Difficulty
  score?: number
  gameTime?: number
  dragonCount?: number
  bossPower?: number
  victory?: boolean
}

export type CompleteResponse = {
  message: string
  xpEarned: number
  activityId?: string
  status: number
}

export type VocabularyResponse = {
  vocabulary: VocabularyItem[]
  message?: string
  warning?: string
  requiredCount?: number
  currentCount?: number
  status: number
}

export type SentencesResponse = {
  sentences: VocabularyItem[]
  message?: string
  warning?: string
  requiredCount?: number
  currentCount?: number
  status: number
}

export type RankingResponse = {
  rankings: RankingsByDifficulty
}
