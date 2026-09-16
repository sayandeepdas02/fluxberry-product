import { ShieldCheck, ScrollText, UserCheck, ListChecks, Database, Building2 } from 'lucide-react';
import { Section, SectionIntro, H2Split } from '../frame';
import { Kicker, TextLink } from '../bits';

/**
 * Six claims, each backed by something that actually exists in the codebase:
 * workspace member roles, audit.service.ts, scoring.engine.ts (suggestions, not
 * decisions), interview scorecards, resume/candidate export, workspace scoping.
 */
const items = [
  {
    icon: UserCheck,
    title: 'AI suggests, people decide',
    body: 'Scores and summaries are recommendations attached to a candidate. Every stage change is made by a person on your team.',
  },
  {
    icon: ListChecks,
    title: 'Structured feedback',
    body: 'Interviewers fill in the same scorecard, so decisions rest on comparable notes instead of hallway impressions.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    body: 'Invite your team with roles that decide who can publish jobs, view candidates, and change settings.',
  },
  {
    icon: ScrollText,
    title: 'Audit trail',
    body: 'Stage moves, assessment sends and member changes are recorded, so you can reconstruct how a hire happened.',
  },
  {
    icon: Building2,
    title: 'Workspace isolation',
    body: 'Every job, candidate and file belongs to one workspace, and requests are scoped to it on the server.',
  },
  {
    icon: Database,
    title: 'Your candidate data',
    body: 'Résumés and candidate records stay yours — exportable, and never sold or handed to a third-party hiring pool.',
  },
];

export function TrustSection() {
  return (
    <Section id="analytics">
      <SectionIntro>
        <Kicker>Built for trust</Kicker>
        <H2Split lead="Automated where it helps." muted="Accountable where it counts." className="max-w-[940px]" />
        <TextLink href="/signup" className="mt-7">
          Start for free
        </TextLink>
      </SectionIntro>

      {/*
        * Interior rules are `ink-line`, not `ink-200`: the section's own edge is
        * the heavier weight, and the cells inside it sit a step lighter. The
        * first row's top rule is the exception — it closes the header off, so it
        * carries structural weight.
        */}
      <div className="grid grid-cols-1 border-t border-ink-200 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, body }, i) => (
          <article
            key={title}
            className={[
              'px-8 pb-10 pt-8',
              'border-ink-line',
              i > 0 ? 'border-t sm:[&:nth-child(-n+2)]:border-t-0' : '',
              'lg:[&:nth-child(-n+3)]:border-t-0',
              'sm:[&:not(:nth-child(2n))]:border-r',
              'lg:[&:not(:nth-child(2n))]:border-r-0 lg:[&:not(:nth-child(3n))]:border-r',
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <Icon className="size-[22px] text-[#7a7e86]" strokeWidth={1.5} />
              <span className="font-mono text-[11px] tabular-nums text-ink-300">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="mb-3 mt-4 text-mk-title text-ink">{title}</h3>
            <p className="text-mk-body text-ink-600">{body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
