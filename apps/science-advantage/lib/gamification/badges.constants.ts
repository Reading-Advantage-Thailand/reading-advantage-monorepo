export type BadgeType =
  | 'FIRST_STEPS'
  | 'PERFECT_SCORE'
  | 'UNIT_CHAMPION'
  | 'SCIENCE_EXPLORER'
  | 'LAB_PARTNER'
  | 'BILINGUAL_SCHOLAR'
  | 'STREAK_WARRIOR'
  | 'DEDICATED_LEARNER'
  | 'QUIZ_MASTER'
  | 'FAST_LEARNER';

export interface BadgeDefinition {
  id: BadgeType;
  name: string;
  description: string;
  icon: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'FIRST_STEPS',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: 'Footprints',
  },
  {
    id: 'PERFECT_SCORE',
    name: 'Perfect Score',
    description: 'Score 100% on any quiz',
    icon: 'Trophy',
  },
  {
    id: 'UNIT_CHAMPION',
    name: 'Unit Champion',
    description: 'Complete all lessons in a curriculum unit',
    icon: 'Crown',
  },
  {
    id: 'SCIENCE_EXPLORER',
    name: 'Science Explorer',
    description: 'Complete 10 lessons',
    icon: 'Compass',
  },
  {
    id: 'LAB_PARTNER',
    name: 'Lab Partner',
    description: 'Complete a lab activity',
    icon: 'FlaskConical',
  },
  {
    id: 'BILINGUAL_SCHOLAR',
    name: 'Bilingual Scholar',
    description: 'Complete a lesson in Thai mode',
    icon: 'Languages',
  },
  {
    id: 'STREAK_WARRIOR',
    name: 'Streak Warrior',
    description: 'Maintain a 7-day activity streak',
    icon: 'Flame',
  },
  {
    id: 'DEDICATED_LEARNER',
    name: 'Dedicated Learner',
    description: 'Maintain a 30-day activity streak',
    icon: 'CalendarCheck',
  },
  {
    id: 'QUIZ_MASTER',
    name: 'Quiz Master',
    description: 'Complete 10 quizzes',
    icon: 'ScrollText',
  },
  {
    id: 'FAST_LEARNER',
    name: 'Fast Learner',
    description: 'Pass 5 quizzes on first attempt with 80%+',
    icon: 'Zap',
  },
];

export interface BadgeTriggerEvent {
  type: 'quiz_completed' | 'lesson_completed';
  score?: number;
  attemptNumber?: number;
  lessonId?: string;
  studentId: string;
}
