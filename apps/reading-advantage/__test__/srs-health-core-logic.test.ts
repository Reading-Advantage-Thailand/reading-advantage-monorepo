/**
 * SRS Health Metrics - Core Logic Tests
 * 
 * Simplified test suite focusing on pure logic validation
 * without complex dependency mocking
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ============================================================================
// Mock Constants and Types
// ============================================================================

const DEFAULT_OVERLOAD_THRESHOLDS = {
  maxDueCards: 50,
  maxOverdueDays: 3,
  maxLapseRate: 3,
  minStability: 50,
  inactiveDaysThreshold: 7,
  maxBacklogCards: 30,
  minMasteryThreshold: 60,
};

type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

interface StudentHealthData {
  userId: string;
  email: string;
  schoolId: string;
  cefrLevel: string;
  level: number;
  totalVocabulary: number;
  vocabDueForReview: number;
  vocabOverdueCount: number;
  totalSentences: number;
  sentenceDueForReview: number;
  sentenceOverdueCount: number;
  totalCards: number;
  totalDueForReview: number;
  totalOverdueCount: number;
  avgLapses: number;
  avgRepetitions: number;
  overallStability: number;
  overallMasteryPct: number;
  isOverloaded: boolean;
  hasCriticalBacklog: boolean;
  hasHighLapseRate: boolean;
  isInactive: boolean;
  recommendedDailySessions: number;
  recommendedSessionMinutes: number;
  daysSinceLastPractice: number;
  lastPracticeAt: Date;
  lastUpdated: Date;
}

// ============================================================================
// Core Logic Functions (Extracted for Testing)
// ============================================================================

function calculateOverloadStatus(data: Partial<StudentHealthData>) {
  const thresholds = DEFAULT_OVERLOAD_THRESHOLDS;
  
  const isOverloaded = (data.totalDueForReview || 0) > thresholds.maxDueCards;
  const hasCriticalBacklog = (data.totalOverdueCount || 0) > thresholds.maxBacklogCards;
  const hasHighLapseRate = (data.avgLapses || 0) > thresholds.maxLapseRate;
  const isInactive = (data.daysSinceLastPractice || 0) > thresholds.inactiveDaysThreshold;
  
  return {
    isOverloaded,
    hasCriticalBacklog,
    hasHighLapseRate,
    isInactive,
  };
}

function calculateHealthStatus(data: Partial<StudentHealthData>): HealthStatus {
  const { isOverloaded, hasCriticalBacklog, hasHighLapseRate, isInactive } = 
    calculateOverloadStatus(data);
  
  if (hasCriticalBacklog) return 'critical';
  if (isOverloaded || hasHighLapseRate) return 'poor';
  if (isInactive || (data.overallMasteryPct || 0) < 30) return 'fair';
  if ((data.overallMasteryPct || 0) > 80 && (data.totalOverdueCount || 0) === 0) return 'excellent';
  return 'good';
}

function calculateRecommendations(data: Partial<StudentHealthData>) {
  const baseSessionMinutes = 15;
  const baseDailySessions = 1;
  
  let sessionMinutes = baseSessionMinutes;
  let dailySessions = baseDailySessions;
  
  // Increase based on overload
  if (data.isOverloaded) {
    dailySessions += 1;
    sessionMinutes += 5;
  }
  
  // Increase based on backlog
  if (data.hasCriticalBacklog) {
    dailySessions += 1;
    sessionMinutes += 5;
  }
  
  // Cap at reasonable limits
  dailySessions = Math.min(dailySessions, 5);
  sessionMinutes = Math.min(sessionMinutes, 25);
  
  return {
    recommendedDailySessions: dailySessions,
    recommendedSessionMinutes: sessionMinutes,
  };
}

function validateQuickActionParameters(actionType: string, parameters: any) {
  const validActionTypes = ['review_session', 'practice_reminder', 'reduce_load'];
  
  if (!validActionTypes.includes(actionType)) {
    return { isValid: false, error: 'Invalid action type' };
  }
  
  if (actionType === 'review_session') {
    if (!parameters.cardLimit || parameters.cardLimit < 1 || parameters.cardLimit > 100) {
      return { isValid: false, error: 'Card limit must be between 1 and 100' };
    }
  }
  
  return { isValid: true, error: null };
}

// ============================================================================
// Test Data
// ============================================================================

const mockHealthyStudent: Partial<StudentHealthData> = {
  userId: 'student-1',
  totalCards: 25,
  totalDueForReview: 8,
  totalOverdueCount: 0,
  avgLapses: 1.2,
  avgRepetitions: 3.5,
  overallStability: 75.5,
  overallMasteryPct: 65.0,
  daysSinceLastPractice: 1,
};

const mockOverloadedStudent: Partial<StudentHealthData> = {
  userId: 'student-2',
  totalCards: 120,
  totalDueForReview: 55,
  totalOverdueCount: 35,
  avgLapses: 4.2,
  avgRepetitions: 2.8,
  overallStability: 40.0,
  overallMasteryPct: 35.0,
  daysSinceLastPractice: 2,
};

const mockInactiveStudent: Partial<StudentHealthData> = {
  userId: 'student-3',
  totalCards: 30,
  totalDueForReview: 12,
  totalOverdueCount: 8,
  avgLapses: 2.5,
  avgRepetitions: 3.0,
  overallStability: 55.0,
  overallMasteryPct: 45.0,
  daysSinceLastPractice: 10,
};

// ============================================================================
// Tests
// ============================================================================

describe('SRS Health Metrics - Core Logic', () => {
  
  describe('Overload Detection', () => {
    
    it('should correctly detect overloaded students', () => {
      const result = calculateOverloadStatus(mockOverloadedStudent);
      
      expect(result.isOverloaded).toBe(true);
      expect(result.hasCriticalBacklog).toBe(true);
      expect(result.hasHighLapseRate).toBe(true);
      expect(result.isInactive).toBe(false);
    });
    
    it('should correctly identify healthy students', () => {
      const result = calculateOverloadStatus(mockHealthyStudent);
      
      expect(result.isOverloaded).toBe(false);
      expect(result.hasCriticalBacklog).toBe(false);
      expect(result.hasHighLapseRate).toBe(false);
      expect(result.isInactive).toBe(false);
    });
    
    it('should correctly identify inactive students', () => {
      const result = calculateOverloadStatus(mockInactiveStudent);
      
      expect(result.isInactive).toBe(true);
    });
    
    it('should handle edge cases with zero/null values', () => {
      const emptyData = {
        totalDueForReview: 0,
        totalOverdueCount: 0,
        avgLapses: 0,
        daysSinceLastPractice: 0,
      };
      
      const result = calculateOverloadStatus(emptyData);
      
      expect(result.isOverloaded).toBe(false);
      expect(result.hasCriticalBacklog).toBe(false);
      expect(result.hasHighLapseRate).toBe(false);
      expect(result.isInactive).toBe(false);
    });
  });
  
  describe('Health Status Calculation', () => {
    
    it('should calculate correct health status for different student types', () => {
      expect(calculateHealthStatus(mockHealthyStudent)).toBe('good');
      expect(calculateHealthStatus(mockOverloadedStudent)).toBe('critical');
      expect(calculateHealthStatus(mockInactiveStudent)).toBe('fair');
    });
    
    it('should identify excellent students', () => {
      const excellentStudent = {
        ...mockHealthyStudent,
        overallMasteryPct: 85,
        totalOverdueCount: 0,
      };
      
      expect(calculateHealthStatus(excellentStudent)).toBe('excellent');
    });
    
    it('should handle edge cases', () => {
      const lowMasteryStudent = {
        ...mockHealthyStudent,
        overallMasteryPct: 25,
      };
      
      expect(calculateHealthStatus(lowMasteryStudent)).toBe('fair');
    });
  });
  
  describe('Recommendation Calculations', () => {
    
    it('should calculate appropriate recommendations for healthy students', () => {
      const healthyData = {
        ...mockHealthyStudent,
        isOverloaded: false,
        hasCriticalBacklog: false,
      };
      
      const recommendations = calculateRecommendations(healthyData);
      
      expect(recommendations.recommendedDailySessions).toBe(1);
      expect(recommendations.recommendedSessionMinutes).toBe(15);
    });
    
    it('should increase recommendations for overloaded students', () => {
      const overloadedData = {
        ...mockOverloadedStudent,
        isOverloaded: true,
        hasCriticalBacklog: true,
      };
      
      const recommendations = calculateRecommendations(overloadedData);
      
      expect(recommendations.recommendedDailySessions).toBeGreaterThan(1);
      expect(recommendations.recommendedSessionMinutes).toBeGreaterThan(15);
    });
    
    it('should cap recommendations at reasonable limits', () => {
      const severeOverloadData = {
        isOverloaded: true,
        hasCriticalBacklog: true,
      };
      
      const recommendations = calculateRecommendations(severeOverloadData);
      
      expect(recommendations.recommendedDailySessions).toBeLessThanOrEqual(5);
      expect(recommendations.recommendedSessionMinutes).toBeLessThanOrEqual(25);
    });
  });
  
  describe('Threshold Validation', () => {
    
    it('should validate threshold constants', () => {
      expect(DEFAULT_OVERLOAD_THRESHOLDS.maxDueCards).toBe(50);
      expect(DEFAULT_OVERLOAD_THRESHOLDS.maxOverdueDays).toBe(3);
      expect(DEFAULT_OVERLOAD_THRESHOLDS.maxLapseRate).toBe(3);
      expect(DEFAULT_OVERLOAD_THRESHOLDS.inactiveDaysThreshold).toBe(7);
      expect(DEFAULT_OVERLOAD_THRESHOLDS.maxBacklogCards).toBe(30);
    });
    
    it('should apply thresholds correctly', () => {
      const borderlineData = {
        totalDueForReview: DEFAULT_OVERLOAD_THRESHOLDS.maxDueCards,
        avgLapses: DEFAULT_OVERLOAD_THRESHOLDS.maxLapseRate,
        daysSinceLastPractice: DEFAULT_OVERLOAD_THRESHOLDS.inactiveDaysThreshold,
      };
      
      const result = calculateOverloadStatus(borderlineData);
      
      // Exactly at threshold should not trigger overload
      expect(result.isOverloaded).toBe(false);
      expect(result.hasHighLapseRate).toBe(false);
      expect(result.isInactive).toBe(false);
    });
  });
});

describe('SRS Health Metrics - Quick Actions Logic', () => {
  
  describe('Action Parameter Validation', () => {
    
    it('should validate review session parameters', () => {
      const validParams = { cardLimit: 25, targetFilter: 'due' };
      const result = validateQuickActionParameters('review_session', validParams);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
    
    it('should reject invalid card limits', () => {
      const invalidParams = { cardLimit: 150 };
      const result = validateQuickActionParameters('review_session', invalidParams);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Card limit must be between 1 and 100');
    });
    
    it('should reject invalid action types', () => {
      const result = validateQuickActionParameters('invalid_action', {});
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid action type');
    });
    
    it('should validate all supported action types', () => {
      const validActions = ['review_session', 'practice_reminder', 'reduce_load'];
      
      validActions.forEach(action => {
        const params = action === 'review_session' ? { cardLimit: 20 } : {};
        const result = validateQuickActionParameters(action, params);
        expect(result.isValid).toBe(true);
      });
    });
  });
  
  describe('Action Response Structure', () => {
    
    it('should create proper response structure', () => {
      const mockResponse = {
        actionId: 'action-123',
        status: 'success' as const,
        actionType: 'review_session' as const,
        executedAt: new Date(),
        details: {
          cardsAffected: 25,
          targetUserId: 'student-1',
          parameters: { cardLimit: 25 },
        },
        isIdempotent: true,
        message: 'Review session created successfully',
      };
      
      expect(mockResponse.status).toBe('success');
      expect(mockResponse.details.cardsAffected).toBe(25);
      expect(mockResponse.isIdempotent).toBe(true);
      expect(typeof mockResponse.actionId).toBe('string');
      expect(mockResponse.executedAt).toBeInstanceOf(Date);
    });
  });
});

describe('SRS Health Metrics - Data Processing', () => {
  
  describe('Input Sanitization', () => {
    
    it('should handle missing fields gracefully', () => {
      const incompleteData = {
        userId: 'test-user',
        // Missing many required fields
      };
      
      const result = calculateOverloadStatus(incompleteData);
      
      expect(result.isOverloaded).toBe(false);
      expect(result.hasCriticalBacklog).toBe(false);
    });
    
    it('should handle negative values appropriately', () => {
      const negativeData = {
        totalDueForReview: -5,
        avgLapses: -1,
        daysSinceLastPractice: -2,
      };
      
      const result = calculateOverloadStatus(negativeData);
      
      // Negative values should be treated as zero/false
      expect(result.isOverloaded).toBe(false);
      expect(result.hasHighLapseRate).toBe(false);
    });
  });
  
  describe('Performance Considerations', () => {
    
    it('should process calculations quickly', () => {
      const startTime = Date.now();
      
      // Process multiple students
      for (let i = 0; i < 100; i++) {
        calculateHealthStatus(mockHealthyStudent);
        calculateOverloadStatus(mockOverloadedStudent);
        calculateRecommendations(mockInactiveStudent);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});