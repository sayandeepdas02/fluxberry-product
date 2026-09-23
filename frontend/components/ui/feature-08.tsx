'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  {
    title: 'Create engaging hiring forms',
    description:
      'Ask video questions, show your live response rate, and capture rich answers from candidates. Go beyond a plain resume.',
    image: null as string | null,
    gradient: 'from-orange-100 via-pink-100 to-rose-100',
  },
  {
    title: 'Shortlist faster with AI',
    description:
      'Describe your ideal candidate and the AI will surface the best-fit applicants. Spend less time reading, more time talking.',
    image: null as string | null,
    gradient: 'from-pink-200 via-fuchsia-200 to-purple-200',
  },
  {
    title: 'Superfast reading mode',
    description:
      'Review applications with a focused full-screen layout and keyboard shortcuts. Get through your inbox in half the time.',
    image: null as string | null,
    gradient: 'from-sky-100 via-blue-100 to-indigo-100',
  },
  {
    title: 'Analytics, careers page and more',
    description:
      'Track your hiring funnel, create a branded careers page, and manage employee referrals. Everything in one workspace.',
    image: null as string | null,
    gradient: 'from-amber-100 via-orange-100 to-rose-100',
  },
  {
    title: 'Collaborative team review',
    description:
      'Invite your team, assign reviewers, and collect structured feedback in one place. Every hiring decision made together.',
    image: null as string | null,
    gradient: 'from-emerald-100 via-teal-100 to-cyan-100',
  },
  {
    title: 'Your pipeline, your way',
    description:
      'Create custom stages to match your exact hiring process. Move candidates forward, add notes, and keep every hire on track.',
    image: null as string | null,
    gradient: 'from-violet-100 via-purple-100 to-fuchsia-100',
  },
];

const Feature08 = () => {
  return (
    <section
      id="features"
      className="flex w-full flex-col justify-center gap-12 bg-background px-6 py-16 md:px-10 md:py-24"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <Badge
          variant="outline"
          className="rounded-md bg-card/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Features
        </Badge>
        <h2 className="text-mk-h2">
          Everything you need to hire smarter
        </h2>
        <p className="text-mk-lead text-muted-foreground">
          Screening, pipeline, analytics, and your careers page. All in one
          workspace, no extra tools.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br ${feature.gradient} p-6`}
            >
              {feature.image ? (
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center rounded-lg border border-white/60 bg-white/40 text-xs text-muted-foreground backdrop-blur-sm">
                  Image coming soon
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 px-6 pb-7 pt-5">
              <h3 className="text-mk-title text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Feature08;
