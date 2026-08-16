import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../../src/services/condition-engine';

describe('workflow condition engine', () => {
  it('evaluates numeric >= correctly', () => {
    expect(evaluateCondition({ field: 'screening_score', op: 'gte', value: 7 }, { screening_score: 8 })).toBe(true);
    expect(evaluateCondition({ field: 'screening_score', op: 'gte', value: 7 }, { screening_score: 6.9 })).toBe(false);
  });

  it('supports lt / lte / gt', () => {
    expect(evaluateCondition({ field: 'expected_salary', op: 'lte', value: 2500000 }, { expected_salary: 2000000 })).toBe(true);
    expect(evaluateCondition({ field: 'years_experience', op: 'gt', value: 3 }, { years_experience: 3 })).toBe(false);
  });

  it('treats a missing value as not qualifying for numeric ops', () => {
    expect(evaluateCondition({ field: 'assessment_score', op: 'gte', value: 70 }, {})).toBe(false);
  });

  it('compares strings case-insensitively for eq/neq', () => {
    expect(evaluateCondition({ field: 'location', op: 'eq', value: 'bangalore' }, { location: 'Bangalore' })).toBe(true);
    expect(evaluateCondition({ field: 'stage', op: 'neq', value: 'REJECTED' }, { stage: 'INTERVIEW' })).toBe(true);
  });
});
