import type { ParsedProfile, SourcingCriteria } from '../../shared';
import type {
  AIProvider,
  JdGenInput,
  JdGenResult,
  ResumeParseInput,
  ResumeParseResult,
  ScreeningInput,
  ScreeningReasoning,
  SourcingQueryInput,
  SourcingQueryResult,
  OutreachDraftInput,
  OutreachDraftResult,
  ProviderMeta,
} from './types';
import { SCORE_DIMENSION_LABELS } from '../../shared';

const KNOWN_SKILLS = [
  'javascript', 'typescript', 'react', 'next.js', 'node.js', 'express', 'python',
  'django', 'flask', 'go', 'rust', 'java', 'spring', 'kotlin', 'swift', 'sql',
  'postgresql', 'mysql', 'mongodb', 'redis', 'kafka', 'rabbitmq', 'aws', 'gcp',
  'azure', 'docker', 'kubernetes', 'terraform', 'graphql', 'rest', 'grpc',
  'tailwind', 'css', 'html', 'figma', 'product design', 'ux', 'ui', 'system design',
  'data structures', 'algorithms', 'machine learning', 'llm', 'ci/cd',
];

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

  async parseSourcingQuery(input: SourcingQueryInput): Promise<SourcingQueryResult> {
    const text = input.prompt;
    const lower = text.toLowerCase();

    const skills = KNOWN_SKILLS.filter((s) =>
      new RegExp(`(^|[^a-z])${escapeRegex(s)}([^a-z]|$)`, 'i').test(lower),
    ).map(titleCaseSkill);

    const yearsMatch = lower.match(/(\d+)\s*\+?\s*(?:years?|yrs?)/);
    const minYears = yearsMatch ? Math.min(40, Number(yearsMatch[1])) : undefined;

    const criteria: SourcingCriteria = {
      titles: detectTitles(lower),
      seniority: detectSeniority(lower),
      skills: skills.slice(0, 20),
      minYears,
      maxYears: undefined,
      locations: detectLocations(text),
      countries: /\bindia\b/i.test(text) ? ['india'] : [],
      companies: [],
      excludeCompanies: [],
      industries: [],
      keywords: [],
    };
    return { criteria, meta: meta('sourcing-v1') };
  }

  async draftOutreachEmail(input: OutreachDraftInput): Promise<OutreachDraftResult> {
    const sender = input.senderName ?? 'the team';
    const subject = `{{firstName}} — ${input.role} at ${input.company}`;
    const body = `Hi {{firstName}},

I came across your work at {{company}} and thought you might be a strong fit for a ${input.role} role we're hiring for at ${input.company}.${
      input.brief ? ` ${input.brief.trim()}` : ' We\'re building something ambitious and looking for people who like real ownership.'
    }

Would you be open to a quick 15-minute chat this week? Happy to work around your schedule.

Best,
${sender}`;
    return { subject, body, meta: meta('outreach-v1') };
  }

}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectSeniority(lower: string): SourcingCriteria['seniority'] {
  const rules: Array<[RegExp, SourcingCriteria['seniority'][number]]> = [
    [/\bintern(ship)?\b/, 'INTERN'],
    [/\b(junior|entry[- ]level|associate)\b/, 'ENTRY'],
    [/\b(senior|sr\.?)\b/, 'SENIOR'],
    [/\b(staff|principal)\b/, 'STAFF'],
    [/\b(tech(nical)? )?lead\b/, 'LEAD'],
    [/\b(engineering )?manager\b/, 'MANAGER'],
    [/\b(director|head of)\b/, 'DIRECTOR'],
    [/\b(vp|vice president)\b/, 'VP'],
    [/\b(cto|ceo|cxo|founder)\b/, 'CXO'],
  ];
  const out = new Set<SourcingCriteria['seniority'][number]>();
  for (const [re, level] of rules) if (re.test(lower)) out.add(level);
  return Array.from(out);
}

function detectTitles(lower: string): string[] {
  const rules: Array<[RegExp, string]> = [
    [/\b(machine learning|ml)\s+engineer\b/, 'Machine Learning Engineer'],
    [/\b(back[- ]?end)\s+(engineer|developer)\b/, 'Backend Engineer'],
    [/\b(front[- ]?end)\s+(engineer|developer)\b/, 'Frontend Engineer'],
    [/\b(full[- ]?stack)\s+(engineer|developer)\b/, 'Full Stack Engineer'],
    [/\b(data)\s+engineer\b/, 'Data Engineer'],
    [/\b(data)\s+scientist\b/, 'Data Scientist'],
    [/\b(devops|platform|site reliability|sre)\s+engineer\b/, 'Platform Engineer'],
    [/\b(mobile|ios|android)\s+(engineer|developer)\b/, 'Mobile Engineer'],
    [/\bproduct\s+manager\b/, 'Product Manager'],
    [/\bproduct\s+designer\b/, 'Product Designer'],
    [/\b(ux|ui)\s+designer\b/, 'Product Designer'],
    [/\bdesigner\b/, 'Product Designer'],
    [/\barchitect\b/, 'Software Architect'],
    [/\b(software|backend|frontend)?\s*(engineer|developer|swe)\b/, 'Software Engineer'],
  ];
  const out: string[] = [];
  for (const [re, title] of rules) {
    if (re.test(lower) && !out.includes(title)) out.push(title);
    if (out.length >= 3) break;
  }
  return out;
}

const KNOWN_CITIES = [
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi', 'hyderabad', 'pune',
  'chennai', 'gurgaon', 'gurugram', 'noida', 'kolkata', 'san francisco', 'new york',
  'seattle', 'austin', 'boston', 'london', 'berlin', 'amsterdam', 'singapore', 'dubai',
  'toronto', 'remote',
];

function detectLocations(text: string): string[] {
  const lower = text.toLowerCase();
  const out = new Set<string>();
  for (const city of KNOWN_CITIES) {
    if (new RegExp(`\\b${escapeRegex(city)}\\b`).test(lower)) {
      out.add(city === 'bengaluru' ? 'Bangalore' : titleCaseWords(city));
    }
  }
  if (out.size === 0) {
    const m = lower.match(/\bbased in ([a-z]+(?: [a-z]+)?)/);
    if (m) out.add(titleCaseWords(m[1]));
  }
  return Array.from(out);
}

function titleCaseWords(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
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
