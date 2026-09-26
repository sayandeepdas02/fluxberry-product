import { describe, it, expect } from 'vitest';
import { scoreContact } from '../../src/services/sourcing.scoring';
import { emptySourcingCriteria } from '../../src/shared';

describe('sourcing scoreContact — skills-weight guard', () => {
  it('excludes the skills dimension entirely (does not count it as a miss) when the person has no skills data at all', () => {
    const criteriaWithSkills = { ...emptySourcingCriteria(), skills: ['Rust', 'Tokio'], titles: ['Backend Engineer'] };
    const criteriaWithoutSkills = { ...emptySourcingCriteria(), titles: ['Backend Engineer'] };

    // A freshly Apollo-sourced person: no skills data yet, but a matching title.
    const noSkillsData = scoreContact(criteriaWithSkills, { title: 'Backend Engineer', skills: [] });
    // A PDL-backfilled person with the same title but skills that don't match at all.
    const mismatchedSkills = scoreContact(criteriaWithSkills, { title: 'Backend Engineer', skills: ['Java', 'Spring'] });
    // The same person scored as if the recruiter had never asked for skills at all —
    // this is the exact behavior "excluded from activeWeight" should reproduce.
    const asIfSkillsWerentAsked = scoreContact(criteriaWithoutSkills, { title: 'Backend Engineer', skills: [] });

    expect(noSkillsData.score).toBe(asIfSkillsWerentAsked.score);
    // Missing skills DATA should score no worse than a genuine skills MISMATCH would.
    expect(noSkillsData.score).toBeGreaterThanOrEqual(mismatchedSkills.score);
    // Title-only match with no skills data present should score 100 (title is the only active dimension).
    expect(noSkillsData.score).toBe(100);
  });

  it('still scores a genuine skills mismatch as worse than a match when skills data IS present', () => {
    const criteria = { ...emptySourcingCriteria(), skills: ['Rust', 'Tokio'] };
    const mismatched = scoreContact(criteria, { skills: ['Java'] });
    const matched = scoreContact(criteria, { skills: ['Rust', 'Tokio'] });
    expect(mismatched.score).toBeLessThan(matched.score);
  });
});
