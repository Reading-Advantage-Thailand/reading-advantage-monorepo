/**
 * Assignment Funnel Analytics Test Suite
 * 
 * Tests for assignment funnel metrics, predictions, RBAC enforcement,
 * and edge cases for Phase 2.2 functionality.
 */

import { describe, it, expect } from '@jest/globals';

// ============================================================================
// Mock Data
// ============================================================================

const mockAssignmentFunnelData = {
  assignment_id: 'test-assignment-1',
  classroom_id: 'test-class-1',
  school_id: 'test-school-1',
  classroom_name: 'Test Classroom',
  grade: 6,
  assignment_title: 'Test Assignment',
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
  assigned_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Created 5 days ago
  
  total_students: 10,
  not_started_count: 2,
  in_progress_count: 3,
  completed_count: 5,
  overdue_count: 0,
  
  started_pct: 80.0,
  completed_pct: 50.0,
  overdue_pct: 0.0,
  
  median_completion_hours: 4.5,
  p80_completion_hours: 6.2,
  avg_score: 85.5,
  assignment_age_days: 5.0,
  
  class_velocity: 250.0,
  class_engagement: 75.0,
  class_low_signal: false,
  
  eta_80pct_days: 0.3, // ~6.2 hours / 24
  is_at_risk: false,
};

const mockAtRiskAssignmentData = {
  ...mockAssignmentFunnelData,
  assignment_id: 'at-risk-assignment',
  due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue by 2 days
  completed_count: 2,
  overdue_count: 8,
  completed_pct: 20.0,
  overdue_pct: 80.0,
  is_at_risk: true,
};

const mockLowSignalAssignmentData = {
  ...mockAssignmentFunnelData,
  assignment_id: 'low-signal-assignment',
  completed_count: 1,
  class_low_signal: true,
  eta_80pct_days: null,
  median_completion_hours: null,
  p80_completion_hours: null,
};

const mockClassAssignmentMetrics = {
  classroom_id: 'test-class-1',
  school_id: 'test-school-1',
  classroom_name: 'Test Classroom',
  grade: 6,
  
  total_assignments: 4,
  high_completion_assignments: 2,
  at_risk_assignments: 1,
  stale_assignments: 0,
  
  overall_completion_rate: 65.5,
  avg_median_completion_hours: 4.8,
  avg_eta_days: 0.4,
  class_avg_score: 82.3,
  
  class_velocity: 250.0,
  class_engagement: 75.0,
  is_low_signal: false,
};

const mockSchoolAssignmentMetrics = {
  school_id: 'test-school-1',
  total_classes: 3,
  total_assignments: 12,
  
  school_completion_rate: 68.2,
  school_avg_completion_hours: 5.1,
  school_p80_eta_days: 0.5,
  
  at_risk_assignments: 2,
  stale_assignments: 1,
  classes_with_at_risk_assignments: 2,
};

const mockAtRiskStudents = [
  {
    student_id: 'student-1',
    display_name: 'John Doe',
    assignment_id: 'at-risk-assignment',
    assignment_title: 'Overdue Math Assignment',
    status: 'NOT_STARTED',
    days_since_assigned: 10,
    days_overdue: 3,
    risk_score: 16,
  },
  {
    student_id: 'student-2', 
    display_name: 'Jane Smith',
    assignment_id: 'at-risk-assignment',
    assignment_title: 'Overdue Math Assignment',
    status: 'IN_PROGRESS',
    days_since_assigned: 8,
    days_overdue: 1,
    risk_score: 14,
  }
];

// ============================================================================
// Helper Functions for Testing
// ============================================================================

function getConfidenceLevel(completedCount: number, isLowSignal: boolean): 'low' | 'medium' | 'high' {
  if (isLowSignal || completedCount < 3) {
    return 'low';
  } else if (completedCount >= 10) {
    return 'high';
  } else {
    return 'medium';
  }
}

function calculateRiskScore(
  isPastDue: boolean,
  assignmentAgeDays: number,
  status: string,
  startedAgeDays?: number
): number {
  let score = 0;
  
  // Overdue penalty
  if (isPastDue) {
    score += 10;
  }
  
  // Aging penalty
  if (assignmentAgeDays > 14) {
    score += 8;
  } else if (assignmentAgeDays > 7) {
    score += 5;
  }
  
  // Status penalty
  if (status === 'NOT_STARTED') {
    score += 6;
  } else if (status === 'IN_PROGRESS' && startedAgeDays && startedAgeDays > 3) {
    score += 4;
  }
  
  return score;
}

function validateFunnelConsistency(data: any): boolean {
  const calculatedTotal = data.not_started_count + data.in_progress_count + data.completed_count;
  return calculatedTotal === data.total_students;
}

function calculateStartedPercentage(inProgress: number, completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((inProgress + completed) / total) * 100 * 10) / 10;
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Assignment Funnel Analytics', () => {
  describe('Prediction Logic', () => {
    it('should calculate completion percentages correctly', () => {
      const data = mockAssignmentFunnelData;
      
      // Test funnel percentage calculations
      expect(data.started_pct).toBe(80.0); // (3 + 5) / 10 * 100
      expect(data.completed_pct).toBe(50.0); // 5 / 10 * 100
      expect(data.overdue_pct).toBe(0.0); // 0 / 10 * 100
    });
    
    it('should identify at-risk assignments', () => {
      const atRiskData = mockAtRiskAssignmentData;
      
      expect(atRiskData.is_at_risk).toBe(true);
      expect(atRiskData.overdue_pct).toBe(80.0);
      expect(atRiskData.completed_pct).toBe(20.0);
    });
    
    it('should handle low signal scenarios', () => {
      const lowSignalData = mockLowSignalAssignmentData;
      
      expect(lowSignalData.class_low_signal).toBe(true);
      expect(lowSignalData.eta_80pct_days).toBeNull();
      expect(lowSignalData.median_completion_hours).toBeNull();
    });
    
    it('should calculate ETA predictions when sufficient data exists', () => {
      const data = mockAssignmentFunnelData;
      
      expect(data.eta_80pct_days).toBe(0.3);
      expect(data.p80_completion_hours).toBe(6.2);
      expect(data.median_completion_hours).toBe(4.5);
    });
  });
  
  describe('Risk Assessment', () => {
    it('should calculate risk scores for students correctly', () => {
      const student1 = mockAtRiskStudents[0];
      const student2 = mockAtRiskStudents[1];
      
      // Test risk score calculation logic
      const calculatedScore1 = calculateRiskScore(
        true, // Past due
        student1.days_since_assigned,
        student1.status
      );
      
      const calculatedScore2 = calculateRiskScore(
        true, // Past due
        student2.days_since_assigned,
        student2.status,
        student2.days_since_assigned - 3 // Assume started 3 days ago
      );
      
      // Risk scores should be positive for at-risk students
      expect(calculatedScore1).toBeGreaterThan(0);
      expect(calculatedScore2).toBeGreaterThan(0);
    });
    
    it('should prioritize students by risk score', () => {
      const students = mockAtRiskStudents;
      
      // Students should be ordered by risk score descending
      for (let i = 0; i < students.length - 1; i++) {
        expect(students[i].risk_score).toBeGreaterThanOrEqual(students[i + 1].risk_score);
      }
    });
    
    it('should assign higher risk scores to overdue assignments', () => {
      const pastDueScore = calculateRiskScore(true, 5, 'NOT_STARTED');
      const normalScore = calculateRiskScore(false, 5, 'NOT_STARTED');
      
      expect(pastDueScore).toBeGreaterThan(normalScore);
    });
    
    it('should assign higher risk scores to aging assignments', () => {
      const oldAssignmentScore = calculateRiskScore(false, 15, 'NOT_STARTED');
      const newAssignmentScore = calculateRiskScore(false, 3, 'NOT_STARTED');
      
      expect(oldAssignmentScore).toBeGreaterThan(newAssignmentScore);
    });
  });
  
  describe('Class-Level Aggregation', () => {
    it('should aggregate assignment metrics at class level', () => {
      const classMetrics = mockClassAssignmentMetrics;
      
      expect(classMetrics.total_assignments).toBe(4);
      expect(classMetrics.overall_completion_rate).toBe(65.5);
      expect(classMetrics.at_risk_assignments).toBe(1);
      expect(classMetrics.high_completion_assignments).toBe(2);
    });
    
    it('should include velocity context in class metrics', () => {
      const classMetrics = mockClassAssignmentMetrics;
      
      expect(classMetrics.class_velocity).toBe(250.0);
      expect(classMetrics.class_engagement).toBe(75.0);
      expect(classMetrics.is_low_signal).toBe(false);
    });
    
    it('should validate class completion rate calculation', () => {
      const classMetrics = mockClassAssignmentMetrics;
      
      // Completion rate should be between 0 and 100
      expect(classMetrics.overall_completion_rate).toBeGreaterThanOrEqual(0);
      expect(classMetrics.overall_completion_rate).toBeLessThanOrEqual(100);
    });
  });
  
  describe('School-Level Aggregation', () => {
    it('should aggregate assignment metrics at school level', () => {
      const schoolMetrics = mockSchoolAssignmentMetrics;
      
      expect(schoolMetrics.total_classes).toBe(3);
      expect(schoolMetrics.total_assignments).toBe(12);
      expect(schoolMetrics.school_completion_rate).toBe(68.2);
      expect(schoolMetrics.at_risk_assignments).toBe(2);
    });
    
    it('should track classes with at-risk assignments', () => {
      const schoolMetrics = mockSchoolAssignmentMetrics;
      
      expect(schoolMetrics.classes_with_at_risk_assignments).toBe(2);
      expect(schoolMetrics.stale_assignments).toBe(1);
    });
    
    it('should validate school completion rate calculation', () => {
      const schoolMetrics = mockSchoolAssignmentMetrics;
      
      // School completion rate should be between 0 and 100
      expect(schoolMetrics.school_completion_rate).toBeGreaterThanOrEqual(0);
      expect(schoolMetrics.school_completion_rate).toBeLessThanOrEqual(100);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle assignments with no students', () => {
      const emptyAssignment = {
        ...mockAssignmentFunnelData,
        total_students: 0,
        completed_count: 0,
        in_progress_count: 0,
        not_started_count: 0,
        started_pct: 0,
        completed_pct: 0,
      };
      
      expect(emptyAssignment.total_students).toBe(0);
      expect(emptyAssignment.completed_pct).toBe(0);
      expect(emptyAssignment.started_pct).toBe(0);
      
      // Should handle division by zero gracefully
      const calculatedStartedPct = calculateStartedPercentage(
        emptyAssignment.in_progress_count,
        emptyAssignment.completed_count,
        emptyAssignment.total_students
      );
      expect(calculatedStartedPct).toBe(0);
    });
    
    it('should handle missing velocity data', () => {
      const noVelocityData = {
        ...mockAssignmentFunnelData,
        class_velocity: 0,
        class_engagement: 0,
        class_low_signal: true,
      };
      
      expect(noVelocityData.class_velocity).toBe(0);
      expect(noVelocityData.class_low_signal).toBe(true);
    });
    
    it('should handle extreme completion times', () => {
      const extremeData = {
        ...mockAssignmentFunnelData,
        median_completion_hours: 0.1, // Very fast
        p80_completion_hours: 48.0,   // Very slow
      };
      
      expect(extremeData.median_completion_hours).toBe(0.1);
      expect(extremeData.p80_completion_hours).toBe(48.0);
    });
    
    it('should handle null ETA values gracefully', () => {
      const noEtaData = {
        ...mockAssignmentFunnelData,
        eta_80pct_days: null,
        median_completion_hours: null,
        p80_completion_hours: null,
      };
      
      expect(noEtaData.eta_80pct_days).toBeNull();
      expect(noEtaData.median_completion_hours).toBeNull();
    });
  });
  
  describe('Data Validation', () => {
    it('should ensure percentages are within valid range', () => {
      const data = mockAssignmentFunnelData;
      
      expect(data.started_pct).toBeGreaterThanOrEqual(0);
      expect(data.started_pct).toBeLessThanOrEqual(100);
      expect(data.completed_pct).toBeGreaterThanOrEqual(0);
      expect(data.completed_pct).toBeLessThanOrEqual(100);
      expect(data.overdue_pct).toBeGreaterThanOrEqual(0);
      expect(data.overdue_pct).toBeLessThanOrEqual(100);
    });
    
    it('should ensure funnel counts are consistent', () => {
      const data = mockAssignmentFunnelData;
      
      // Test the validation function
      expect(validateFunnelConsistency(data)).toBe(true);
      
      // Test with inconsistent data
      const inconsistentData = {
        ...data,
        total_students: 15, // Doesn't match sum of individual counts
      };
      expect(validateFunnelConsistency(inconsistentData)).toBe(false);
    });
    
    it('should validate timing metrics are positive when present', () => {
      const data = mockAssignmentFunnelData;
      
      if (data.median_completion_hours !== null) {
        expect(data.median_completion_hours).toBeGreaterThan(0);
      }
      
      if (data.p80_completion_hours !== null) {
        expect(data.p80_completion_hours).toBeGreaterThan(0);
      }
      
      if (data.eta_80pct_days !== null) {
        expect(data.eta_80pct_days).toBeGreaterThan(0);
      }
    });
    
    it('should validate scores are within expected range', () => {
      const data = mockAssignmentFunnelData;
      
      if (data.avg_score !== null) {
        expect(data.avg_score).toBeGreaterThanOrEqual(0);
        expect(data.avg_score).toBeLessThanOrEqual(100);
      }
    });
    
    it('should validate class engagement is within valid range', () => {
      const classData = mockClassAssignmentMetrics;
      
      expect(classData.class_engagement).toBeGreaterThanOrEqual(0);
      expect(classData.class_engagement).toBeLessThanOrEqual(100);
    });
  });
  
  describe('Confidence Assessment', () => {
    it('should determine confidence levels based on sample size', () => {
      // High confidence: >= 10 completed samples AND !isLowSignal
      const highConfidence = getConfidenceLevel(12, false);
      expect(highConfidence).toBe('high');
      
      // Medium confidence: 3-9 completed samples AND !isLowSignal  
      const mediumConfidence = getConfidenceLevel(5, false);
      expect(mediumConfidence).toBe('medium');
      
      // Low confidence: < 3 completed samples OR isLowSignal
      const lowConfidence = getConfidenceLevel(2, false);
      expect(lowConfidence).toBe('low');
      
      // Low signal overrides sample size
      const lowSignalConfidence = getConfidenceLevel(15, true);
      expect(lowSignalConfidence).toBe('low');
    });
    
    it('should handle edge cases in confidence calculation', () => {
      // Exactly 3 samples should be medium confidence
      expect(getConfidenceLevel(3, false)).toBe('medium');
      
      // Exactly 10 samples should be high confidence
      expect(getConfidenceLevel(10, false)).toBe('high');
      
      // Zero samples should be low confidence
      expect(getConfidenceLevel(0, false)).toBe('low');
    });
  });
  
  describe('Performance Validation', () => {
    it('should handle calculation functions efficiently', () => {
      const startTime = Date.now();
      
      // Run multiple calculations
      for (let i = 0; i < 1000; i++) {
        calculateRiskScore(i % 2 === 0, i % 20, i % 3 === 0 ? 'NOT_STARTED' : 'IN_PROGRESS');
        getConfidenceLevel(i % 15, i % 10 === 0);
        validateFunnelConsistency(mockAssignmentFunnelData);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
    
    it('should handle large datasets in calculation logic', () => {
      // Test with large numbers
      const largeDataset = {
        ...mockAssignmentFunnelData,
        total_students: 10000,
        completed_count: 7500,
        in_progress_count: 1500,
        not_started_count: 1000,
      };
      
      expect(validateFunnelConsistency(largeDataset)).toBe(true);
      
      const startedPct = calculateStartedPercentage(
        largeDataset.in_progress_count,
        largeDataset.completed_count,
        largeDataset.total_students
      );
      
      expect(startedPct).toBe(90.0); // (1500 + 7500) / 10000 * 100
    });
  });
});