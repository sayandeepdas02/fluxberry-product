import { Sparkles, BarChart3, Share2, Users, ShieldCheck, ScrollText } from 'lucide-react';
import { Section, SectionIntro } from '../frame';

const features = [
  {
    icon: Sparkles,
    title: 'AI applicant screening',
    body: 'Every application scored and summarised on arrival. Start from a ranked shortlist, not a flooded inbox.',
  },
  {
    icon: Users,
    title: 'Collaborative pipeline',
    body: 'Custom stages, team notes, and activity history — every move tracked so nothing falls through the cracks.',
  },
  {
    icon: Share2,
    title: 'Hosted careers page',
    body: 'A branded job board that lives on your domain. Post jobs and collect applications without touching your website.',
  },
  {
    icon: BarChart3,
    title: 'Hiring analytics',
    body: "Funnel drop-off, source performance, time-to-hire. Know what's working before the next hire cycle.",
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    body: 'Invite your whole team with the right permissions. Control who can publish jobs, view candidates, or change settings.',
  },
  {
    icon: ScrollText,
    title: 'Full audit trail',
    body: 'Stage moves, emails sent, and member changes are logged so you can reconstruct how any hire happened.',
  },
];

export function FeaturesSection() {
  return (
    <Section id="features">
      <SectionIntro className="flex flex-col items-center text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">Features</span>
        <h2 className="mt-4 text-mk-h2 text-ink">
          Everything you need
          <br />
          <span className="text-ink-muted">to hire smarter.</span>
        </h2>
        <p className="mt-4 max-w-[480px] text-mk-body text-ink-500">
          Screening, pipeline, analytics, and your careers page — all in one workspace. No stitching tools together.
        </p>
      </SectionIntro>

      <div className="grid grid-cols-1 border-t border-ink-200 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, body }, i) => (
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
            <div className="mb-5 inline-flex size-10 items-center justify-center rounded-[8px] bg-berry-50">
              <Icon className="size-5 text-berry-600" strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-mk-title text-ink">{title}</h3>
            <p className="text-mk-body text-ink-600">{body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
