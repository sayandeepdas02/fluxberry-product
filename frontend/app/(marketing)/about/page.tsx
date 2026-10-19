import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { publicConfig } from '@/lib/config';
import { COMPANY_PROFILES, FOUNDER } from '@/lib/founder';
import { jsonLdScript, publicPageMetadata } from '@/lib/seo';
import { Appear } from '@/components/marketing/landing/motion';
import { GradientButton, GridBackdrop, Pill, TYPE } from '@/components/marketing/landing/primitives';
import { BRAND } from '@/components/marketing/landing/content';
import { articleInter } from '@/components/marketing/blog/article-font';

const description =
  'Fluxberry is the simplest ATS for lean teams, built by indie hacker Sayandeep Das. Post jobs, run a careers page and source candidates.';

export const metadata: Metadata = publicPageMetadata({
  title: 'About: an indie-built ATS for lean teams',
  description,
  path: '/about',
  ownImage: true,
  siteName: BRAND,
});

/** One line per feature, in the order a hire moves through the product. */
const FEATURES = [
  { name: 'Job board', line: 'Post a job once and start collecting applications the same day.' },
  { name: 'Applicant tracking', line: 'Every candidate in one pipeline, with stages and notes your whole team can see.' },
  { name: 'Custom careers page', line: 'A careers page that matches your brand, with no developer needed.' },
  { name: 'AI scoring', line: 'Applicants are scored against your job the moment they apply, so the strongest rise to the top.' },
  { name: 'Talent sourcing with TalentGPT', line: 'Find and reach out to candidates who haven’t applied yet.' },
  { name: 'Candidate referrals', line: 'Let your network send you people worth meeting.' },
  { name: 'Analytics', line: 'See where candidates come from and where your pipeline slows down.' },
  { name: 'Unlimited team members', line: 'Invite everyone who hires, at no extra cost.' },
];

const shareText = 'Just tried Fluxberry, the simplest ATS for lean teams and founders hiring their first people, built by @deepmaxxing.';
const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(publicConfig.appUrl)}`;

const jsonLd = {
  '@graph': [
    {
      '@type': 'AboutPage',
      name: `About ${BRAND}`,
      url: `${publicConfig.appUrl}/about`,
      description,
      mainEntity: {
        '@type': 'Organization',
        name: BRAND,
        url: publicConfig.appUrl,
        foundingDate: '2026-10-01',
        founder: {
          '@type': 'Person',
          name: FOUNDER.name,
          jobTitle: 'Founder',
          sameAs: [FOUNDER.xUrl, FOUNDER.linkedinUrl],
        },
        sameAs: [COMPANY_PROFILES.xUrl, COMPANY_PROFILES.linkedinUrl],
      },
    },
  ],
};

const linkClass =
  'rounded-sm text-lp-blue-500 underline decoration-lp-blue-500/30 underline-offset-[3px] outline-none transition-colors hover:text-lp-blue-600 hover:decoration-lp-blue-600 focus-visible:ring-2 focus-visible:ring-lp-blue-400';

/** About page: who builds Fluxberry, why, what it does, and how to try it. */
export default function AboutPage() {
  return (
    <article className={articleInter.variable}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <header className="relative px-5 pb-[50px] pt-[140px] tablet:px-[50px] tablet:pb-[60px] tablet:pt-[200px] desktop:px-[70px]">
        <GridBackdrop />
        <Appear className="relative mx-auto flex max-w-[760px] flex-col items-center text-center">
          <Pill>About</Pill>
          <h1 className={cn('mt-2.5 text-balance text-black', TYPE.h2)}>Built by an indie hacker, for lean teams</h1>
          <p className={cn('mt-6 max-w-[560px] text-pretty text-lp-gray-700', TYPE.body)}>
            Fluxberry is the simplest ATS you’ll come across, made for founders hiring their early teams.
          </p>
        </Appear>
      </header>

      <div className="px-5 pb-[70px] tablet:px-[50px] tablet:pb-[100px] desktop:px-[70px]">
        <div className="mx-auto flex max-w-[680px] flex-col gap-12 border-t border-lp-gray-150 pt-[50px] font-inter text-[16px] leading-[26px] text-lp-gray-800">
          <section className="flex flex-col gap-4" aria-labelledby="story">
            <h2 id="story" className="font-manrope text-[24px] font-semibold leading-8 tracking-[-0.02em] text-black">
              The story
            </h2>
            <p>
              Fluxberry is built by an indie hacker, <a href={FOUNDER.xUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>Sayandeep</a>.
            </p>
            <p>
              I had zero idea about coding. In May 2025 I started exploring web development at random, and I taught myself to code from there. Once
              AI agents made building software much simpler, I decided in February 2026 to work on Fluxberry.
            </p>
            <p>
              It took six months of monthly iteration: talking to recruiters and testing multiple products. Fluxberry went live on 1 October 2026.
              It’s my first SaaS. I hope everyone likes it, and I’ll keep pushing updates and improving the platform.
            </p>
          </section>

          <section className="flex flex-col gap-4" aria-labelledby="what-it-does">
            <h2 id="what-it-does" className="font-manrope text-[24px] font-semibold leading-8 tracking-[-0.02em] text-black">
              What Fluxberry does
            </h2>
            <p>
              Fluxberry is built for lean teams and for founders hiring their early teams. Here is what it does, in a line each:
            </p>
            <ul className="flex flex-col gap-3">
              {FEATURES.map(({ name, line }) => (
                <li key={name} className="flex gap-3">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-lp-blue-500" />
                  <span>
                    <strong className="font-semibold text-black">{name}.</strong> {line}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-5 rounded-[15px] bg-lp-blue-50 px-6 py-7" aria-labelledby="try-it">
            <h2 id="try-it" className="font-manrope text-[24px] font-semibold leading-8 tracking-[-0.02em] text-black">
              Give it a try
            </h2>
            <p>
              If you’re a founder or a recruiter, I’d love for you to try it. And if you like the product, I’d really appreciate a small post on X
              sharing your experience.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <GradientButton href="/sign-up">Sign up</GradientButton>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-[40px] bg-black px-[18px] py-[10px] text-white outline-none',
                  'focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
                  TYPE.button,
                )}
              >
                <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden className="fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </a>
            </div>
          </section>

          <p className="text-[15px] text-lp-gray-600">
            Follow along on <a href={COMPANY_PROFILES.xUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>X</a> or{' '}
            <a href={COMPANY_PROFILES.linkedinUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>LinkedIn</a>.
          </p>
        </div>
      </div>
    </article>
  );
}
