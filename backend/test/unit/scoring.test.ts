import { describe, it, expect } from 'vitest';
import { computeScreeningScore } from '../../src/services/scoring.engine';

const baseJob = {
  requiredSkills: ['Node.js', 'PostgreSQL'],
  preferredSkills: ['AWS'],
  experienceMin: 3,
  experienceMax: 6,
  location: 'Bangalore',
  workMode: 'HYBRID',
  salaryMin: 1_000_000,
  salaryMax: 3_000_000,
  education: [] as string[],
};

describe('scoring engine', () => {
  it('rewards a strong, on-target candidate', () => {
    const { breakdown, total } = computeScreeningScore({
      job: baseJob,
      candidate: { skills: ['Node.js', 'PostgreSQL', 'AWS'], yearsExperience: 4, location: 'Bangalore', expectedSalary: 2_500_000, hasEducation: true },
      aiRelevance: 9,
    });
    expect(breakdown.skills).toBeGreaterThanOrEqual(7);
    expect(breakdown.experience).toBe(10);
    expect(breakdown.location).toBe(10);
    expect(breakdown.compensation).toBe(10);
    expect(total).toBeGreaterThan(7);
    expect(total).toBeLessThanOrEqual(10);
  });

  it('penalizes a poor skill match', () => {
    const { breakdown, total } = computeScreeningScore({
      job: baseJob,
      candidate: { skills: ['Photoshop', 'Illustrator'], yearsExperience: 1, location: 'Remote', expectedSalary: 5_000_000, hasEducation: false },
      aiRelevance: 2,
    });
    expect(breakdown.skills).toBeLessThan(3);
    expect(breakdown.compensation).toBeLessThan(10); // expects above range
    expect(total).toBeLessThan(6);
  });

  it('keeps the total within 0-10', () => {
    const { total } = computeScreeningScore({
      job: baseJob,
      candidate: { skills: [], yearsExperience: null, location: null, expectedSalary: null, hasEducation: false },
      aiRelevance: 0,
    });
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(10);
  });

  it('flags overqualified experience gently, not as a failure', () => {
    const { breakdown } = computeScreeningScore({
      job: baseJob,
      candidate: { skills: ['Node.js'], yearsExperience: 12, location: 'Bangalore', expectedSalary: 2_000_000, hasEducation: true },
      aiRelevance: 5,
    });
    expect(breakdown.experience).toBeGreaterThanOrEqual(7);
  });
});
