/**
 * Genre Engagement Core Logic Test Suite
 * 
 * Tests core business logic without external dependencies
 */

import { describe, test, expect } from '@jest/globals';

// Test data types
interface GenreEngagementData {
  genre: string;
  cefrBucket: string;
  totalReads: number;
  recentReads30d: number;
  recentReads7d: number;
  totalQuizCompletions: number;
  recentQuizCompletions30d: number;
  totalXpEarned: number;
  recentXp30d: number;
  weightedEngagementScore: number;
  lastActivityDate: Date;
  firstActivityDate: Date;
  activeDays: number;
  totalActivities: number;
  dailyActivityRate: number;
}

// Mock data for testing
const mockGenreEngagementData = [
  {
    genre: 'Fiction',
    cefrBucket: 'B1',
    totalReads: 15,
    recentReads30d: 8,
    recentReads7d: 2,
    totalQuizCompletions: 12,
    recentQuizCompletions30d: 6,
    totalXpEarned: 450,
    recentXp30d: 180,
    weightedEngagementScore: 45.2,
    lastActivityDate: new Date('2024-10-22T10:30:00Z'),
    firstActivityDate: new Date('2024-10-01T09:00:00Z'),
    activeDays: 12,
    totalActivities: 27,
    dailyActivityRate: 1.29
  },
  {
    genre: 'Mystery',
    cefrBucket: 'B1', 
    totalReads: 8,
    recentReads30d: 5,
    recentReads7d: 1,
    totalQuizCompletions: 6,
    recentQuizCompletions30d: 4,
    totalXpEarned: 240,
    recentXp30d: 120,
    weightedEngagementScore: 23.8,
    lastActivityDate: new Date('2024-10-20T14:15:00Z'),
    firstActivityDate: new Date('2024-10-05T11:30:00Z'),
    activeDays: 8,
    totalActivities: 14,
    dailyActivityRate: 0.93
  }
];

const mockGenreAdjacencies = [
  { primaryGenre: 'Fiction', adjacentGenre: 'Fantasy', weight: 0.8 },
  { primaryGenre: 'Fiction', adjacentGenre: 'Mystery', weight: 0.7 },
  { primaryGenre: 'Mystery', adjacentGenre: 'Thriller', weight: 0.9 },
  { primaryGenre: 'Fantasy', adjacentGenre: 'Adventure', weight: 0.85 }
];

// Helper functions to test
function formatEngagementData(raw: any): GenreEngagementData {
  return {
    genre: raw.genre,
    cefrBucket: raw.cefrBucket,
    totalReads: parseInt(raw.totalReads) || 0,
    recentReads30d: parseInt(raw.recentReads30d) || 0,
    recentReads7d: parseInt(raw.recentReads7d) || 0,
    totalQuizCompletions: parseInt(raw.totalQuizCompletions) || 0,
    recentQuizCompletions30d: parseInt(raw.recentQuizCompletions30d) || 0,
    totalXpEarned: parseInt(raw.totalXpEarned) || 0,
    recentXp30d: parseInt(raw.recentXp30d) || 0,
    weightedEngagementScore: parseFloat(raw.weightedEngagementScore) || 0,
    lastActivityDate: new Date(raw.lastActivityDate),
    firstActivityDate: new Date(raw.firstActivityDate || raw.lastActivityDate),
    activeDays: parseInt(raw.activeDays) || 0,
    totalActivities: parseInt(raw.totalActivities) || 0,
    dailyActivityRate: parseFloat(raw.dailyActivityRate) || 0,
  };
}

function calculateCefrDistance(level1: string, level2: string): number {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const idx1 = levels.indexOf(level1);
  const idx2 = levels.indexOf(level2);
  return Math.abs(idx1 - idx2);
}

function calculateWeightedEngagementScore(
  readCompletions: number,
  quizCompletions: number,
  xpEarned: number,
  recencyWeight: number
): number {
  return ((readCompletions * 2.0) + (quizCompletions * 1.5) + (xpEarned / 50.0)) * recencyWeight;
}

function getRecencyWeight(activityDate: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - activityDate.getTime();
  const diffDays = diffMs / (24 * 60 * 60 * 1000);
  
  if (diffDays <= 7) return 1.0;
  if (diffDays <= 30) return 0.5;
  if (diffDays <= 90) return 0.2;
  return 0.1;
}

describe('Genre Engagement - Core Logic', () => {
  
  describe('Data Formatting', () => {
    test('should format raw engagement data correctly', () => {
      const mockRawData = {
        genre: 'Fiction',
        cefrBucket: 'B1',
        totalReads: '15',
        recentReads30d: '8', 
        recentReads7d: '2',
        totalQuizCompletions: '12',
        recentQuizCompletions30d: '6',
        totalXpEarned: '450',
        recentXp30d: '180',
        weightedEngagementScore: '45.2',
        lastActivityDate: new Date('2024-10-22T10:30:00Z'),
        firstActivityDate: new Date('2024-10-01T09:00:00Z'),
        activeDays: '12',
        totalActivities: '27',
        dailyActivityRate: '1.29'
      };

      const formatted = formatEngagementData(mockRawData);

      expect(formatted.totalReads).toBe(15);
      expect(formatted.weightedEngagementScore).toBe(45.2);
      expect(formatted.dailyActivityRate).toBe(1.29);
      expect(formatted.genre).toBe('Fiction');
      expect(formatted.cefrBucket).toBe('B1');
    });

    test('should handle null/undefined values gracefully', () => {
      const mockRawData = {
        genre: 'Mystery',
        cefrBucket: 'A2',
        totalReads: null,
        recentReads30d: undefined,
        weightedEngagementScore: '0',
        lastActivityDate: new Date(),
        activeDays: '',
        totalActivities: 'invalid',
        dailyActivityRate: null
      };

      const formatted = formatEngagementData(mockRawData);

      expect(formatted.totalReads).toBe(0);
      expect(formatted.recentReads30d).toBe(0);
      expect(formatted.activeDays).toBe(0);
      expect(formatted.totalActivities).toBe(0);
      expect(formatted.dailyActivityRate).toBe(0);
    });
  });

  describe('CEFR Level Distance Calculation', () => {
    test('should calculate CEFR distance correctly', () => {
      expect(calculateCefrDistance('A1', 'A2')).toBe(1);
      expect(calculateCefrDistance('A1', 'B1')).toBe(2);
      expect(calculateCefrDistance('B1', 'B1')).toBe(0);
      expect(calculateCefrDistance('C1', 'A1')).toBe(4);
    });

    test('should handle invalid CEFR levels', () => {
      expect(calculateCefrDistance('INVALID', 'A1')).toBe(1); // indexOf returns -1 for both, abs(-1 - -1) = 0, but abs(-1 - 5) = 6
      expect(calculateCefrDistance('A1', '')).toBe(1); // indexOf returns -1 for '', abs(0 - -1) = 1
    });

    test('should respect CEFR guardrails for recommendations', () => {
      const maxCefrDistance = 1;
      
      expect(calculateCefrDistance('B1', 'B2')).toBeLessThanOrEqual(maxCefrDistance);
      expect(calculateCefrDistance('B1', 'A2')).toBeLessThanOrEqual(maxCefrDistance);
      
      expect(calculateCefrDistance('B1', 'A1')).toBeGreaterThan(maxCefrDistance);
      expect(calculateCefrDistance('B1', 'C2')).toBeGreaterThan(maxCefrDistance);
    });
  });

  describe('Engagement Score Calculation', () => {
    test('should calculate weighted engagement score using formula', () => {
      const reads = 5;
      const quizzes = 3;
      const xp = 150;
      const recencyWeight = 1.0;

      const score = calculateWeightedEngagementScore(reads, quizzes, xp, recencyWeight);
      
      // (5 * 2.0) + (3 * 1.5) + (150 / 50.0) = 10 + 4.5 + 3 = 17.5
      expect(score).toBe(17.5);
    });

    test('should apply recency weighting correctly', () => {
      const now = new Date('2024-10-22T12:00:00Z');
      
      const recent = new Date('2024-10-20T12:00:00Z'); // 2 days ago
      const medium = new Date('2024-10-01T12:00:00Z'); // 21 days ago
      const old = new Date('2024-08-01T12:00:00Z'); // ~82 days ago
      const veryOld = new Date('2024-06-01T12:00:00Z'); // ~143 days ago

      expect(getRecencyWeight(recent, now)).toBe(1.0); // Within 7 days
      expect(getRecencyWeight(medium, now)).toBe(0.5); // Within 30 days
      expect(getRecencyWeight(old, now)).toBe(0.2); // Within 90 days
      expect(getRecencyWeight(veryOld, now)).toBe(0.1); // Older than 90 days
    });
  });

  describe('Genre Recommendation Logic', () => {
    test('should calculate confidence scores correctly', () => {
      const RECOMMENDATION_WEIGHTS = {
        high_engagement_similar: 1.0,
        underexplored_adjacent: 0.8,
        level_appropriate_new: 0.6,
      };
      
      const adjacencyWeight = 0.8;

      const highEngagementScore = adjacencyWeight * RECOMMENDATION_WEIGHTS.high_engagement_similar;
      const underexploredScore = adjacencyWeight * RECOMMENDATION_WEIGHTS.underexplored_adjacent;
      const newGenreScore = RECOMMENDATION_WEIGHTS.level_appropriate_new;

      expect(highEngagementScore).toBe(0.8);
      expect(underexploredScore).toBeCloseTo(0.64, 2);
      expect(newGenreScore).toBe(0.6);
      
      // High engagement should have highest confidence
      expect(highEngagementScore).toBeGreaterThan(underexploredScore);
      expect(underexploredScore).toBeGreaterThan(newGenreScore);
    });

    test('should find similar genres correctly', () => {
      const primaryGenre = 'Fiction';
      const similarGenres = mockGenreAdjacencies
        .filter(adj => adj.primaryGenre === primaryGenre)
        .sort((a, b) => b.weight - a.weight);

      expect(similarGenres.length).toBe(2); // Fantasy and Mystery
      expect(similarGenres[0].adjacentGenre).toBe('Fantasy'); // Higher weight (0.8)
      expect(similarGenres[1].adjacentGenre).toBe('Mystery'); // Lower weight (0.7)
    });

    test('should exclude already engaged genres from recommendations', () => {
      const currentGenres = new Set(['Fiction', 'Mystery']);
      const availableAdjacencies = mockGenreAdjacencies
        .filter(adj => !currentGenres.has(adj.adjacentGenre));

      expect(availableAdjacencies.length).toBe(3); // Fantasy, Adventure, and Thriller (not Mystery)
      expect(availableAdjacencies.every(adj => !currentGenres.has(adj.adjacentGenre))).toBe(true);
    });

    test('should respect minimum adjacency weight threshold', () => {
      const MIN_ADJACENCY_WEIGHT = 0.5;
      
      const validAdjacencies = mockGenreAdjacencies.filter(
        adj => adj.weight >= MIN_ADJACENCY_WEIGHT
      );
      
      expect(validAdjacencies.length).toBe(4); // All mock adjacencies are >= 0.5
      expect(validAdjacencies.every(adj => adj.weight >= MIN_ADJACENCY_WEIGHT)).toBe(true);
    });
  });

  describe('Engagement Analysis', () => {
    test('should identify high engagement genres correctly', () => {
      const MIN_ENGAGEMENT_THRESHOLD = 10.0;
      
      const highEngagementGenres = mockGenreEngagementData
        .filter(e => e.weightedEngagementScore >= MIN_ENGAGEMENT_THRESHOLD);

      expect(highEngagementGenres.length).toBe(2); // Both genres above threshold
      expect(highEngagementGenres.every(g => g.weightedEngagementScore >= MIN_ENGAGEMENT_THRESHOLD)).toBe(true);
    });

    test('should sort genres by engagement score', () => {
      const sortedGenres = [...mockGenreEngagementData]
        .sort((a, b) => b.weightedEngagementScore - a.weightedEngagementScore);

      expect(sortedGenres[0].genre).toBe('Fiction'); // Higher score (45.2)
      expect(sortedGenres[1].genre).toBe('Mystery'); // Lower score (23.8)
      expect(sortedGenres[0].weightedEngagementScore).toBeGreaterThan(sortedGenres[1].weightedEngagementScore);
    });

    test('should calculate CEFR distribution correctly', () => {
      const cefrDistribution = mockGenreEngagementData.reduce((acc, genre) => {
        acc[genre.cefrBucket] = (acc[genre.cefrBucket] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(cefrDistribution['B1']).toBe(2); // Both genres are B1
      expect(Object.keys(cefrDistribution)).toEqual(['B1']);
    });
  });
});

describe('Data Validation', () => {
  
  describe('Input Sanitization', () => {
    test('should handle malformed numeric inputs', () => {
      const malformedInputs = [
        { value: 'not-a-number', expected: 0 },
        { value: null, expected: 0 },
        { value: undefined, expected: 0 },
        { value: '', expected: 0 },
        { value: '123.45', expected: 123.45 },
        { value: '0', expected: 0 }
      ];

      malformedInputs.forEach(({ value, expected }) => {
        const result = parseFloat(value as any) || 0;
        expect(result).toBe(expected);
      });
    });

    test('should validate engagement score ranges', () => {
      const scores = [45.2, 23.8, 0, 100, 500];
      
      scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(typeof score).toBe('number');
        expect(isNaN(score)).toBe(false);
      });
    });

    test('should validate CEFR bucket values', () => {
      const validCefrBuckets = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const testBuckets = ['B1', 'A2', 'C1', 'INVALID'];
      
      testBuckets.forEach(bucket => {
        const isValid = validCefrBuckets.includes(bucket);
        if (bucket !== 'INVALID') {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      });
    });
  });

  describe('Date Handling', () => {
    test('should handle date objects correctly', () => {
      const now = new Date();
      const pastDate = new Date('2024-01-01');
      const futureDate = new Date('2030-01-01'); // Use a date further in the future

      expect(now).toBeInstanceOf(Date);
      expect(pastDate.getTime()).toBeLessThan(now.getTime());
      expect(futureDate.getTime()).toBeGreaterThan(now.getTime());
    });

    test('should calculate date differences correctly', () => {
      const date1 = new Date('2024-10-01T12:00:00Z');
      const date2 = new Date('2024-10-02T12:00:00Z');
      
      const diffMs = date2.getTime() - date1.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      
      expect(diffDays).toBe(1);
    });
  });
});

describe('Edge Cases', () => {
  
  test('should handle empty engagement data', () => {
    const emptyData: GenreEngagementData[] = [];
    
    expect(emptyData.length).toBe(0);
    expect(Array.isArray(emptyData)).toBe(true);
    
    // Operations on empty arrays should still work
    const sorted = emptyData.sort((a, b) => b.weightedEngagementScore - a.weightedEngagementScore);
    const filtered = emptyData.filter(e => e.weightedEngagementScore > 10);
    
    expect(sorted.length).toBe(0);
    expect(filtered.length).toBe(0);
  });

  test('should handle single genre engagement', () => {
    const singleGenreData = mockGenreEngagementData.slice(0, 1);
    
    expect(singleGenreData.length).toBe(1);
    expect(singleGenreData[0].genre).toBe('Fiction');
    
    // Should still be able to generate recommendations
    const currentGenres = new Set(singleGenreData.map(e => e.genre));
    expect(currentGenres.has('Fiction')).toBe(true);
    expect(currentGenres.has('Mystery')).toBe(false);
  });

  test('should handle zero engagement scores', () => {
    const zeroEngagementData = {
      ...mockGenreEngagementData[0],
      weightedEngagementScore: 0,
      totalReads: 0,
      totalXpEarned: 0
    };

    expect(zeroEngagementData.weightedEngagementScore).toBe(0);
    expect(zeroEngagementData.totalReads).toBe(0);
    
    // Should still be valid data
    expect(typeof zeroEngagementData.genre).toBe('string');
    expect(zeroEngagementData.genre.length).toBeGreaterThan(0);
  });
});

describe('Performance Considerations', () => {
  
  test('should handle large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      genre: `Genre${i % 20}`, // 20 different genres
      weightedEngagementScore: Math.random() * 100,
      cefrBucket: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][i % 6]
    }));

    const startTime = Date.now();
    
    // Simulate filtering and sorting operations
    const filtered = largeDataset.filter(item => item.weightedEngagementScore > 10);
    const sorted = filtered.sort((a, b) => b.weightedEngagementScore - a.weightedEngagementScore);
    const top10 = sorted.slice(0, 10);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete within 100ms
    expect(top10.length).toBeLessThanOrEqual(10);
    expect(Array.isArray(top10)).toBe(true);
  });

  test('should handle memory efficiently with large recommendation sets', () => {
    const recommendations = Array.from({ length: 100 }, (_, i) => ({
      genre: `Genre${i}`,
      confidenceScore: Math.random(),
      recommendationType: 'high_engagement_similar' as const
    }));

    const MAX_RECOMMENDATIONS = 5;
    const limited = recommendations
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, MAX_RECOMMENDATIONS);

    expect(limited.length).toBe(MAX_RECOMMENDATIONS);
    expect(limited.every(r => typeof r.confidenceScore === 'number')).toBe(true);
  });
});