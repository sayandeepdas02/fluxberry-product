import type { JdGenInput, ResumeParseInput, ScreeningInput, SourcingQueryInput, OutreachDraftInput } from './types';

export interface PromptSpec {
  system: string;
  user: string;
  version: string;
}

const FAIRNESS = `You are a hiring decision-support assistant. Ground everything strictly in job-relevant qualifications, skills, and experience. Never infer, mention, or use race, religion, gender, age, sexual orientation, disability, health, national origin, or any other protected or sensitive characteristic. Do not use names or locations as proxies for such attributes.`;

export function jobDescriptionPrompt(input: JdGenInput): PromptSpec {
  const facts = [
    `Title: ${input.title}`,
    input.employmentType && `Employment type: ${input.employmentType}`,
    input.workMode && `Work mode: ${input.workMode}`,
    input.location && `Location: ${input.location}`,
    input.experience && (input.experience.min != null || input.experience.max != null)
      ? `Experience: ${input.experience.min ?? 0}–${input.experience.max ?? '+'} years`
      : null,
    input.salary && (input.salary.min != null || input.salary.max != null)
      ? `Salary: ${input.salary.min ?? ''}–${input.salary.max ?? ''} ${input.salary.currency ?? ''}`
      : null,
    input.skills?.length ? `Skills to consider: ${input.skills.join(', ')}` : null,
    input.userPrompt ? `Hiring manager notes: ${input.userPrompt}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    version: 'jd-v1',
    system: `${FAIRNESS}\nYou write clear, concise, inclusive job descriptions for startups. Avoid clichés and buzzwords.`,
    user: `Write a job description using these details:\n\n${facts}\n\nReturn ONLY JSON with this exact shape:
{
  "description": "markdown string with sections: ## About the role, ## What you'll do, ## What we're looking for, ## Nice to have",
  "structuredRequirements": {
    "requiredSkills": ["..."],
    "preferredSkills": ["..."],
    "responsibilities": ["..."],
    "education": ["..."],
    "experience": { "min": number, "max": number }
  }
}`,
  };
}

export function resumeParsingPrompt(input: ResumeParseInput): PromptSpec {
  return {
    version: 'resume-v1',
    system: `${FAIRNESS}\nYou extract structured data from resumes accurately. Only use information present in the text. Do not fabricate.`,
    user: `Extract a structured profile from this resume text. Return ONLY JSON:
{
  "summary": "2-3 sentence professional summary",
  "yearsExperience": number,
  "skills": ["..."],
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "workExperience": [{ "title": "", "company": "", "start": "", "end": "", "description": "" }],
  "projects": [{ "name": "", "description": "" }]
}

RESUME TEXT:
"""
${input.resumeText.slice(0, 15000)}
"""`,
  };
}

export function candidateScreeningPrompt(input: ScreeningInput): PromptSpec {
  const req = input.job.structuredRequirements;
  const jobFacts = [
    `Role: ${input.job.title}`,
    req?.requiredSkills?.length ? `Required skills: ${req.requiredSkills.join(', ')}` : null,
    req?.preferredSkills?.length ? `Preferred skills: ${req.preferredSkills.join(', ')}` : null,
    input.job.experience ? `Experience wanted: ${input.job.experience.min ?? 0}–${input.job.experience.max ?? '+'} yrs` : null,
    req?.responsibilities?.length ? `Responsibilities: ${req.responsibilities.slice(0, 6).join('; ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const p = input.candidate.parsedProfile;
  const candFacts = [
    p?.summary ? `Summary: ${p.summary}` : null,
    p?.yearsExperience != null ? `Years experience: ${p.yearsExperience}` : null,
    p?.skills?.length ? `Skills: ${p.skills.join(', ')}` : null,
    p?.workExperience?.length
      ? `Experience: ${p.workExperience
          .slice(0, 5)
          .map((w) => `${w.title ?? ''} @ ${w.company ?? ''}`)
          .join('; ')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    version: 'screening-v1',
    system: `${FAIRNESS}\nYou assess fit between a candidate and a role. Be specific, evidence-based, and fair. Your output assists a human recruiter who makes the final decision.`,
    user: `Assess this candidate for the role. Cite concrete evidence.

JOB:
${jobFacts}

CANDIDATE:
${candFacts || '(limited profile data)'}

Return ONLY JSON:
{
  "summary": "2-3 sentences on overall fit",
  "strengths": ["specific, evidence-based matches"],
  "concerns": ["specific, job-relevant gaps"],
  "relevanceScore": number  // 0-10, how relevant their actual experience/projects are to THIS role
}`,
  };
}

export function sourcingQueryPrompt(input: SourcingQueryInput): PromptSpec {
  return {
    version: 'sourcing-v1',
    system: `${FAIRNESS}\nYou convert a recruiter's natural-language description of an ideal candidate into a structured people-search filter. Extract only what is stated or clearly implied. Do not invent constraints.`,
    user: `Turn this sourcing request into structured search criteria.

REQUEST:
"""
${input.prompt.slice(0, 1200)}
"""

Rules:
- "titles": canonical role titles, e.g. ["Software Engineer", "Backend Engineer"]. Expand abbreviations (SWE -> Software Engineer).
- "seniority": zero or more of exactly ["INTERN","ENTRY","MID","SENIOR","STAFF","LEAD","MANAGER","DIRECTOR","VP","CXO"].
- "skills": concrete technologies/skills, e.g. ["Rust","Kubernetes"]. Do not include soft skills.
- "minYears"/"maxYears": integers when a range or floor is stated ("4+ years" -> minYears 4). Omit if unstated.
- "locations": cities/regions as written, e.g. ["Bangalore"]. "countries": lowercased country names when stated, e.g. ["india"].
- "companies": target current employers. "excludeCompanies": employers to avoid.
- "industries": lowercased, e.g. ["computer software"]. "keywords": anything meaningful that did not fit above.

Return ONLY JSON with this exact shape (use [] for empty arrays, omit unknown numbers):
{
  "titles": [], "seniority": [], "skills": [],
  "minYears": number, "maxYears": number,
  "locations": [], "countries": [],
  "companies": [], "excludeCompanies": [],
  "industries": [], "keywords": []
}`,
  };
}

export function outreachEmailPrompt(input: OutreachDraftInput): PromptSpec {
  const facts = [
    `Role being pitched: ${input.role}`,
    `Hiring company: ${input.company}`,
    input.senderName && `Sender: ${input.senderName}`,
    input.tone && `Tone: ${input.tone}`,
    input.contactSample?.title && `Recipient is typically a ${input.contactSample.title}${input.contactSample.company ? ` at ${input.contactSample.company}` : ''}`,
    input.brief && `Notes: ${input.brief}`,
    input.refine && `Improve this existing draft rather than starting over:\n"""\n${input.refine.slice(0, 2000)}\n"""`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    version: 'outreach-v1',
    system: `${FAIRNESS}\nYou write short, personable cold-outreach recruiting emails that get replies. Be specific and human, never spammy or over-formal. One clear ask (a quick chat). Keep the body under ~130 words. Use the merge tags {{firstName}} and {{company}} where natural so each email personalizes. Do not fabricate specific facts about the recipient.`,
    user: `Write a cold outreach email using these details:\n\n${facts}\n\nReturn ONLY JSON with this exact shape:
{
  "subject": "short, specific subject line (may use {{firstName}} or {{company}})",
  "body": "the email body, plain text with line breaks, using {{firstName}} where natural, ending with a clear ask and a sign-off"
}`,
  };
}

