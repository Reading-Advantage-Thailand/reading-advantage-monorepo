import { describe, expect, it } from 'vitest';

import {
  studentEnrolledClassSchema,
  studentEnrolledClassesResponseSchema,
} from './student-classes';

const validClass = {
  id: 'class-1',
  name: 'Biology Basics',
  gradeLevel: 5,
  teacherId: 'teacher-1',
  teacherName: 'Ms. Lee',
  enrolledAt: '2025-04-01T12:00:00.000Z',
};

describe('studentEnrolledClassSchema', () => {
  it('accepts a valid enrolled class', () => {
    expect(studentEnrolledClassSchema.parse(validClass)).toEqual(validClass);
  });

  it('rejects a name shorter than 3 characters', () => {
    expect(() =>
      studentEnrolledClassSchema.parse({ ...validClass, name: 'AB' })
    ).toThrow();
  });

  it('rejects a gradeLevel outside 3–6', () => {
    expect(() =>
      studentEnrolledClassSchema.parse({ ...validClass, gradeLevel: 7 })
    ).toThrow();
  });

  it('rejects a non-datetime enrolledAt', () => {
    expect(() =>
      studentEnrolledClassSchema.parse({ ...validClass, enrolledAt: 'not-a-date' })
    ).toThrow();
  });

  it('rejects empty teacherName', () => {
    expect(() =>
      studentEnrolledClassSchema.parse({ ...validClass, teacherName: '' })
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...withoutId } = validClass;
    expect(() => studentEnrolledClassSchema.parse(withoutId)).toThrow();
  });
});

describe('studentEnrolledClassesResponseSchema', () => {
  it('wraps a list of enrolled classes', () => {
    const parsed = studentEnrolledClassesResponseSchema.parse({
      classes: [validClass],
    });
    expect(parsed.classes).toHaveLength(1);
    expect(parsed.classes[0]).toEqual(validClass);
  });

  it('accepts an empty list', () => {
    expect(
      studentEnrolledClassesResponseSchema.parse({ classes: [] })
    ).toEqual({ classes: [] });
  });

  it('rejects when `classes` is missing', () => {
    expect(() => studentEnrolledClassesResponseSchema.parse({})).toThrow();
  });
});
