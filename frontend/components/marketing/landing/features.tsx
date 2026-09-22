import { FileText, Sparkles, Zap, BarChart3, Users, LayoutList } from 'lucide-react';
import { Section, SectionIntro } from '../frame';
import { Divider } from '../divider';

const features = [
  {
    icon: FileText,
    title: 'Create engaging hiring forms',
    body: 'Ask video questions, show your live response rate, and capture rich answers from candidates. Go beyond a plain resume.',
  },
  {
    icon: Sparkles,
    title: 'Shortlist faster with AI',
    body: 'Describe your ideal candidate and the AI will surface the best-fit applicants. Spend less time reading, more time talking.',
  },
  {
    icon: Zap,
    title: 'Superfast reading mode',
    body: 'Review applications with a focused full-screen layout and keyboard shortcuts. Get through your inbox in half the time.',
  },
  {
    icon: BarChart3,
    title: 'Analytics, careers page and more',
    body: 'Track your hiring funnel, create a branded careers page, and manage employee referrals. Everything in one workspace.',
  },
  {
    icon: Users,
    title: 'Collaborative team review',
    body: 'Invite your team, assign reviewers, and collect structured feedback in one place. Every hiring decision made together.',
  },
  {
    icon: LayoutList,
    title: 'Your pipeline, your way',
    body: 'Create custom stages to match your exact hiring process. Move candidates forward, add notes, and keep every hire on track.',
  },
];

export function FeaturesSection() {
  return (
    <>
    <Divider />
    <Section id="features">
      <SectionIntro className="flex flex-col items-center text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">Features</span>
        <h2 className="mt-4 text-mk-h2 text-ink">
          Everything you need
          <br />
          <span className="text-ink-muted">to hire smarter.</span>
        </h2>
        <p className="mt-4 max-w-[480px] text-mk-body text-ink-500">
          Screening, pipeline, analytics, and your careers page. All in one workspace, no extra tools.
        </p>
      </SectionIntro>

      <div className="grid grid-cols-1 border-t border-berry-200 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, body }, i) => (
          <article
            key={title}
            className={[
              'px-8 pb-10 pt-8',
              'border-berry-100',
              i > 0 ? 'border-t sm:[&:nth-child(-n+2)]:border-t-0' : '',
              'lg:[&:nth-child(-n+3)]:border-t-0',
              'sm:[&:not(:nth-child(2n))]:border-r',
              'lg:[&:not(:nth-child(2n))]:border-r-0 lg:[&:not(:nth-child(3n))]:border-r',
            ].join(' ')}
          >
            <div className="mb-5 inline-flex size-10 items-center justify-center rounded-[8px] bg-berry-50">
              <Icon className="size-5 text-berry-600" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-mk-title text-ink">{title}</h3>
            <p className="text-mk-body text-ink-600">{body}</p>
          </article>
        ))}
      </div>
    </Section>
    </>
  );
}
