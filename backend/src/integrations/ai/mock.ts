import type { ParsedProfile } from '@fluxberry/shared';
import type {
  AIProvider,
  JdGenInput,
  JdGenResult,
  ResumeParseInput,
  ResumeParseResult,
  ScreeningInput,
  ScreeningReasoning,
  InterviewEvalInput,
  InterviewEvaluation,
  ProviderMeta,
} from './types';
import { SCORE_DIMENSION_LABELS } from '@fluxberry/shared';

const KNOWN_SKILLS = [
  'javascript', 'typescript', 'react', 'next.js', 'node.js', 'express', 'python',
  'django', 'flask', 'go', 'rust', 'java', 'spring', 'kotlin', 'swift', 'sql',
  'postgresql', 'mysql', 'mongodb', 'redis', 'kafka', 'rabbitmq', 'aws', 'gcp',
  'azure', 'docker', 'kubernetes', 'terraform', 'graphql', 'rest', 'grpc',
  'tailwind', 'css', 'html', 'figma', 'product design', 'ux', 'ui', 'system design',
  'data structures', 'algorithms', 'machine learning', 'llm', 'ci/cd',
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const meta = (v: string): ProviderMeta => ({ provider: 'mock', model: 'mock', promptVersion: v });

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async generateJobDescription(input: JdGenInput): Promise<JdGenResult> {
    const skills = input.skills?.length ? input.skills : deriveSkillsFromTitle(input.title);
    const required = skills.slice(0, Math.max(1, Math.ceil(skills.length * 0.6)));
    const preferred = skills.slice(required.length);
    const expMin = input.experience?.min ?? 2;
    const expMax = input.experience?.max ?? expMin + 3;
    const loc = input.location ? ` in ${input.location}` : '';

    const description = `## About the role

We're hiring a ${input.title}${loc}. ${input.userPrompt ? input.userPrompt.trim() : `You'll own meaningful problems end to end and help us move fast without breaking what matters.`}

## What you'll do

- Own features from idea to production
- Collaborate closely with a small, senior team
- Write clean, well-tested, maintainable code
- Contribute to technical decisions and product direction

## What we're looking for

- ${expMin}+ years of relevant experience
${required.map((s) => `- Strong experience with ${s}`).join('\n')}
- A pragmatic, ownership-driven mindset

## Nice to have

${preferred.length ? preferred.map((s) => `- Familiarity with ${s}`).join('\n') : '- Startup experience'}`;

    return {
      description,
      structuredRequirements: {
        requiredSkills: required,
        preferredSkills: preferred,
        responsibilities: [
          'Own features end to end',
          'Collaborate with a small senior team',
          'Write clean, tested code',
        ],
        education: [],
        experience: { min: expMin, max: expMax },
      },
      meta: meta('jd-v1'),
    };
  }

  async parseResume(input: ResumeParseInput): Promise<ResumeParseResult> {
    const text = input.resumeText || '';
    const lower = text.toLowerCase();
    const skills = KNOWN_SKILLS.filter((s) => lower.includes(s)).map(titleCaseSkill);
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const yearMatches = text.match(/\b(19|20)\d{2}\b/g)?.map(Number) ?? [];
    const yearsExperience = estimateYears(yearMatches, text);

    const profile: ParsedProfile = {
      summary:
        text.trim().slice(0, 220).replace(/\s+/g, ' ') ||
        `Experienced professional with a background relevant to ${input.fileName ?? 'the role'}.`,
      yearsExperience,
      skills: skills.length ? skills.slice(0, 15) : ['Communication', 'Problem solving'],
      education: extractEducation(text),
      workExperience: extractExperience(text),
      projects: [],
    };
    if (input.hints?.email && !emailMatch) {
      // keep hint email available to caller via candidate record; profile stays clean
    }
    return { profile, meta: meta('resume-v1') };
  }

  async screenCandidate(input: ScreeningInput): Promise<ScreeningReasoning> {
    const b = input.deterministic;
    const entries = Object.entries(b) as Array<[keyof typeof b, number]>;
    const strong = entries.filter(([, v]) => v >= 6.5).sort((a, c) => c[1] - a[1]);
    const weak = entries.filter(([, v]) => v < 5).sort((a, c) => a[1] - c[1]);
    const skills = input.candidate.parsedProfile?.skills ?? [];
    const req = input.job.structuredRequirements?.requiredSkills ?? [];
    const overlap = req.filter((r) => skills.some((s) => s.toLowerCase() === r.toLowerCase()));

    const strengths = strong.map(([k]) => `Good ${SCORE_DIMENSION_LABELS[k].toLowerCase()}`);
    if (overlap.length) strengths.unshift(`Matches key skills: ${overlap.join(', ')}`);
    const concerns = weak.map(([k]) => `Limited ${SCORE_DIMENSION_LABELS[k].toLowerCase()}`);

    const relevanceScore = overlap.length && req.length ? (overlap.length / req.length) * 10 : b.relevance;

    return {
      summary: `Candidate for ${input.job.title}: ${strong.length} strong area${strong.length === 1 ? '' : 's'}${
        weak.length ? `, ${weak.length} potential gap${weak.length === 1 ? '' : 's'}` : ''
      }.`,
      strengths: strengths.length ? strengths.slice(0, 5) : ['Meets baseline requirements'],
      concerns: concerns.slice(0, 5),
      relevanceScore: Math.round(relevanceScore * 10) / 10,
      meta: meta('screening-v1'),
    };
  }

  async evaluateInterview(input: InterviewEvalInput): Promise<InterviewEvaluation> {
    const seed = hash(input.transcript) % 30;
    const base = 6 + (seed % 3);
    return {
      communicationScore: base + 0.5,
      technicalScore: base,
      confidenceScore: base - 0.5,
      problemSolvingScore: base + 0.3,
      overallScore: base + 0.1,
      summary: `Solid interview for ${input.jobTitle}. Communicates clearly and reasons through problems.`,
      strengths: ['Clear communication', 'Structured problem solving'],
      concerns: ['Could go deeper on system design'],
      meta: meta('interview-v1'),
    };
  }
}

function deriveSkillsFromTitle(title: string): string[] {
  const t = title.toLowerCase();
  if (t.includes('backend')) return ['Node.js', 'PostgreSQL', 'AWS', 'REST', 'Docker'];
  if (t.includes('frontend')) return ['React', 'TypeScript', 'CSS', 'Next.js', 'HTML'];
  if (t.includes('design')) return ['Figma', 'UX', 'UI', 'Product design'];
  if (t.includes('full')) return ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'];
  return ['Communication', 'Problem solving', 'Ownership'];
}

function titleCaseSkill(s: string): string {
  const specials: Record<string, string> = {
    javascript: 'JavaScript', typescript: 'TypeScript', 'node.js': 'Node.js',
    'next.js': 'Next.js', postgresql: 'PostgreSQL', aws: 'AWS', gcp: 'GCP',
    sql: 'SQL', ui: 'UI', ux: 'UX', 'ci/cd': 'CI/CD', llm: 'LLM', css: 'CSS', html: 'HTML',
  };
  return specials[s] ?? s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function estimateYears(years: number[], text: string): number {
  const explicit = text.match(/(\d+)\+?\s*years?/i);
  if (explicit) return Math.min(40, Number(explicit[1]));
  if (years.length >= 2) {
    const min = Math.min(...years);
    const max = Math.max(...years, new Date().getUTCFullYear());
    return Math.max(0, Math.min(40, max - min));
  }
  return 3;
}

function extractEducation(text: string): ParsedProfile['education'] {
  const line = text.split('\n').find((l) => /b\.?s\.?|b\.?tech|m\.?s\.?|bachelor|master|phd/i.test(l));
  return line ? [{ degree: line.trim().slice(0, 80) }] : [];
}

function extractExperience(text: string): ParsedProfile['workExperience'] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /engineer|developer|designer|manager|lead|intern|analyst/i.test(l))
    .slice(0, 4);
  return lines.map((l) => ({ title: l.slice(0, 80) }));
}
