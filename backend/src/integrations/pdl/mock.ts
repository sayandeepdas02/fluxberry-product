import type { SourcingCriteria } from '../../shared';
import type {
  PeopleSourcingProvider,
  PersonSearchInput,
  PersonSearchResult,
  SourcedPerson,
} from './types';

/**
 * Deterministic, realistic mock of a people-search provider. Generates people
 * that genuinely match the supplied criteria (title, skills, location, years),
 * so the entire Talent Sourcing flow demos convincingly with zero keys and zero
 * PDL spend. Everything is seeded from the criteria + page offset (no
 * Date.now/Math.random — results are stable and reproducible; "load more"
 * returns a fresh page).
 */

const FIRST_NAMES = [
  'Aarav', 'Diya', 'Vihaan', 'Ananya', 'Arjun', 'Ishita', 'Kabir', 'Meera',
  'Rohan', 'Priya', 'Aditya', 'Sneha', 'Karthik', 'Nisha', 'Rahul', 'Tara',
  'Sofia', 'Liam', 'Emma', 'Noah', 'Olivia', 'Ethan', 'Ava', 'Lucas',
  'Mia', 'Daniel', 'Grace', 'Marco', 'Yuki', 'Chen', 'Fatima', 'Omar',
  'Lena', 'Pablo', 'Ingrid', 'Sam', 'Zoe', 'Ravi', 'Anika', 'Dev',
];

const LAST_NAMES = [
  'Sharma', 'Reddy', 'Patel', 'Iyer', 'Nair', 'Khan', 'Mehta', 'Bose',
  'Rao', 'Gupta', 'Singh', 'Das', 'Verma', 'Kapoor', 'Chopra', 'Menon',
  'Silva', 'Costa', 'Muller', 'Rossi', 'Novak', 'Andersson', 'Kim', 'Wang',
  'Lopez', 'Garcia', 'Nguyen', 'Okafor', 'Haddad', 'Fischer', 'Popov', 'Tan',
];

const COMPANIES = [
  { name: 'Stripe', size: '1001-5000', industry: 'financial services' },
  { name: 'Razorpay', size: '1001-5000', industry: 'financial services' },
  { name: 'Cloudflare', size: '1001-5000', industry: 'internet' },
  { name: 'Datadog', size: '1001-5000', industry: 'computer software' },
  { name: 'Atlassian', size: '5001-10000', industry: 'computer software' },
  { name: 'Flipkart', size: '10001+', industry: 'internet' },
  { name: 'Swiggy', size: '5001-10000', industry: 'internet' },
  { name: 'Zerodha', size: '501-1000', industry: 'financial services' },
  { name: 'Postman', size: '501-1000', industry: 'computer software' },
  { name: 'Freshworks', size: '5001-10000', industry: 'computer software' },
  { name: 'Uber', size: '10001+', industry: 'internet' },
  { name: 'Microsoft', size: '10001+', industry: 'computer software' },
  { name: 'Google', size: '10001+', industry: 'internet' },
  { name: 'Confluent', size: '1001-5000', industry: 'computer software' },
  { name: 'HashiCorp', size: '1001-5000', industry: 'computer software' },
  { name: 'Vercel', size: '201-500', industry: 'computer software' },
];

const CITIES = [
  { name: 'Bengaluru, Karnataka, India', country: 'india' },
  { name: 'Hyderabad, Telangana, India', country: 'india' },
  { name: 'Pune, Maharashtra, India', country: 'india' },
  { name: 'Gurgaon, Haryana, India', country: 'india' },
  { name: 'San Francisco, California, United States', country: 'united states' },
  { name: 'Berlin, Germany', country: 'germany' },
  { name: 'London, United Kingdom', country: 'united kingdom' },
  { name: 'Singapore', country: 'singapore' },
];

/** Skills commonly adjacent to a given skill, to flesh out believable profiles. */
const RELATED_SKILLS: Record<string, string[]> = {
  rust: ['Tokio', 'Actix', 'WebAssembly', 'gRPC', 'Systems Programming'],
  go: ['Kubernetes', 'gRPC', 'Docker', 'Microservices', 'PostgreSQL'],
  python: ['Django', 'FastAPI', 'Pandas', 'Airflow', 'PostgreSQL'],
  react: ['TypeScript', 'Next.js', 'Redux', 'GraphQL', 'Tailwind CSS'],
  typescript: ['Node.js', 'React', 'Next.js', 'GraphQL', 'Jest'],
  'node.js': ['Express', 'TypeScript', 'PostgreSQL', 'Redis', 'AWS'],
  java: ['Spring Boot', 'Kafka', 'Microservices', 'PostgreSQL', 'AWS'],
  kubernetes: ['Docker', 'Terraform', 'Helm', 'AWS', 'Prometheus'],
  aws: ['Terraform', 'Docker', 'Kubernetes', 'Lambda', 'CloudFormation'],
  'machine learning': ['PyTorch', 'TensorFlow', 'Python', 'MLOps', 'Pandas'],
};

const GENERIC_SKILLS = ['Git', 'CI/CD', 'REST APIs', 'System Design', 'Agile', 'Docker'];

const SENIORITY_WORDS: Record<string, string> = {
  INTERN: 'Intern',
  ENTRY: 'Junior',
  MID: '',
  SENIOR: 'Senior',
  STAFF: 'Staff',
  LEAD: 'Lead',
  MANAGER: 'Engineering Manager',
  DIRECTOR: 'Director of Engineering',
  VP: 'VP of Engineering',
  CXO: 'CTO',
};

// --- seeded PRNG (pure, no global randomness) ------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length) % arr.length];

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export class MockPeopleSourcingProvider implements PeopleSourcingProvider {
  readonly name = 'mock';

  async search(input: PersonSearchInput): Promise<PersonSearchResult> {
    const { criteria, size } = input;
    const offset = decodeToken(input.scrollToken);
    const seedBase = hashString(JSON.stringify(criteria));

    // A plausible, stable total for this query (drives "load more").
    const total = 40 + (seedBase % 860);

    const remaining = Math.max(0, total - offset);
    const count = Math.min(size, remaining);
    const people: SourcedPerson[] = [];
    for (let i = 0; i < count; i++) {
      people.push(makePerson(criteria, seedBase, offset + i));
    }

    const nextOffset = offset + count;
    const scrollToken = nextOffset < total ? encodeToken(nextOffset) : null;

    return { people, total, scrollToken, creditsUsed: people.length };
  }
}

function makePerson(criteria: SourcingCriteria, seedBase: number, index: number): SourcedPerson {
  const rng = mulberry32(seedBase + index * 2654435761);

  const firstName = pick(rng, FIRST_NAMES);
  const lastName = pick(rng, LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;

  // Title: prefer a requested title, prefixed with a requested seniority word.
  const baseTitle = criteria.titles.length
    ? pick(rng, criteria.titles)
    : deriveTitleFromSkills(criteria.skills);
  const seniorityKey = criteria.seniority.length ? pick(rng, criteria.seniority) : '';
  const seniorityWord = seniorityKey ? SENIORITY_WORDS[seniorityKey] ?? '' : '';
  const title = [seniorityWord, titleCase(baseTitle)].filter(Boolean).join(' ').trim();

  // Company: prefer a requested company; never one that's excluded.
  const companyPool = criteria.companies.length
    ? criteria.companies.map((c) => ({ name: c, size: '501-1000', industry: 'computer software' }))
    : COMPANIES.filter((c) => !criteria.excludeCompanies.some((x) => x.toLowerCase() === c.name.toLowerCase()));
  const company = pick(rng, companyPool.length ? companyPool : COMPANIES);

  // Location: honor a requested location when present.
  const location = criteria.locations.length
    ? { name: pick(rng, criteria.locations), country: criteria.countries[0] ?? 'india' }
    : pick(rng, CITIES);

  // Years of experience within the requested band.
  const minY = criteria.minYears ?? 2;
  const maxY = criteria.maxYears ?? minY + 6;
  const yearsExperience = minY + Math.floor(rng() * Math.max(1, maxY - minY + 1));

  // Skills: the requested skills + a few adjacent + generic filler.
  const skills = buildSkills(rng, criteria.skills);

  const hasWorkEmail = rng() > 0.28;
  const handle = `${firstName}.${lastName}`.toLowerCase();
  const companyDomain = company.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

  return {
    providerId: `mock_${seedBase.toString(16)}_${index}`,
    fullName,
    firstName,
    lastName,
    title,
    seniority: seniorityKey || inferSeniority(yearsExperience),
    company: company.name,
    companySize: company.size,
    industry: criteria.industries[0] ?? company.industry,
    location: titleCase(location.name),
    country: location.country,
    yearsExperience,
    skills,
    linkedinUrl: `https://www.linkedin.com/in/${handle}${index}`,
    githubUrl: rng() > 0.6 ? `https://github.com/${handle}` : undefined,
    workEmail: hasWorkEmail ? `${handle}@${companyDomain}` : undefined,
    personalEmail: rng() > 0.5 ? `${handle}@gmail.com` : undefined,
    phone: undefined,
    experience: buildExperience(rng, title, company.name, yearsExperience),
    education: [buildEducation(rng)],
  };
}

function deriveTitleFromSkills(skills: string[]): string {
  const s = skills.map((x) => x.toLowerCase());
  if (s.some((x) => ['react', 'next.js', 'css', 'tailwind'].includes(x))) return 'Frontend Engineer';
  if (s.some((x) => ['figma', 'ux', 'ui'].includes(x))) return 'Product Designer';
  if (s.some((x) => ['pytorch', 'tensorflow', 'machine learning', 'ml'].includes(x))) return 'Machine Learning Engineer';
  if (s.some((x) => ['kubernetes', 'terraform', 'aws', 'devops'].includes(x))) return 'Platform Engineer';
  if (s.length) return 'Software Engineer';
  return 'Software Engineer';
}

function buildSkills(rng: () => number, requested: string[]): string[] {
  const out = new Set<string>();
  requested.forEach((s) => out.add(titleCaseSkill(s)));
  requested.forEach((s) => {
    const related = RELATED_SKILLS[s.toLowerCase()];
    if (related) related.slice(0, 2).forEach((r) => out.add(r));
  });
  for (const g of GENERIC_SKILLS) {
    if (out.size >= 9) break;
    if (rng() > 0.4) out.add(g);
  }
  return Array.from(out).slice(0, 10);
}

function titleCaseSkill(s: string): string {
  const specials: Record<string, string> = {
    javascript: 'JavaScript', typescript: 'TypeScript', 'node.js': 'Node.js',
    'next.js': 'Next.js', postgresql: 'PostgreSQL', aws: 'AWS', gcp: 'GCP',
    sql: 'SQL', ui: 'UI', ux: 'UX', 'ci/cd': 'CI/CD', llm: 'LLM', css: 'CSS',
    html: 'HTML', grpc: 'gRPC', 'rest apis': 'REST APIs',
  };
  return specials[s.toLowerCase()] ?? titleCase(s);
}

function inferSeniority(years: number): string {
  if (years < 1) return 'INTERN';
  if (years < 3) return 'ENTRY';
  if (years < 6) return 'MID';
  if (years < 9) return 'SENIOR';
  return 'STAFF';
}

function buildExperience(
  rng: () => number,
  currentTitle: string,
  currentCompany: string,
  years: number,
): SourcedPerson['experience'] {
  const now = 2026;
  const startCurrent = now - Math.max(1, Math.floor(years / 2));
  const exp: SourcedPerson['experience'] = [
    { title: currentTitle, company: currentCompany, start: `${startCurrent}`, end: 'Present' },
  ];
  if (years > 3) {
    const prev = pick(rng, COMPANIES);
    exp.push({
      title: currentTitle.replace(/senior |staff |lead /i, '').trim() || 'Software Engineer',
      company: prev.name,
      start: `${startCurrent - Math.max(1, Math.floor(years / 3))}`,
      end: `${startCurrent}`,
    });
  }
  return exp;
}

function buildEducation(rng: () => number): SourcedPerson['education'][number] {
  const schools = ['IIT Bombay', 'IIT Delhi', 'BITS Pilani', 'NIT Trichy', 'IIIT Hyderabad', 'VIT Vellore'];
  const degrees = ['B.Tech', 'B.E.', 'M.Tech', 'B.S.'];
  const majors = ['Computer Science', 'Information Technology', 'Electrical Engineering'];
  return { degree: pick(rng, degrees), school: pick(rng, schools), major: pick(rng, majors) };
}

// Pagination cursor is just a base64 offset (mock-only, opaque to callers).
function encodeToken(offset: number): string {
  return Buffer.from(`off:${offset}`).toString('base64');
}
function decodeToken(token?: string | null): number {
  if (!token) return 0;
  try {
    const s = Buffer.from(token, 'base64').toString('utf8');
    const m = s.match(/^off:(\d+)$/);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}
