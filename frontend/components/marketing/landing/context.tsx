import {
  Sparkles,
  GitBranch,
  BarChart3,
  Share2,
  Users,
  Mail,
} from 'lucide-react';
import { Section, H2Split, PanelHeader, Sup } from '../frame';
import { Kicker, TextLink } from '../bits';

/** Capabilities that exist in the product today — nothing aspirational. */
const capabilities = [
  { icon: Sparkles, label: 'AI screening' },
  { icon: GitBranch, label: 'Workflows' },
  { icon: Mail, label: 'Email automation' },
  { icon: Users, label: 'Referrals' },
  { icon: Share2, label: 'Careers page' },
  { icon: BarChart3, label: 'Analytics' },
];

export function ContextSection() {
  return (
    <Section className="grid items-center gap-10 border-t px-6 py-16 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-14 lg:py-20">
      <div>
        <Kicker>One workspace</Kicker>
        <H2Split lead="Every applicant." muted="One clear pipeline." />
        <p className="my-6 max-w-[370px] text-mk-body text-ink-600">
          Screening, referrals and your job board all sit in one place, so
          nothing about a candidate lives in someone&apos;s inbox.
        </p>
        <TextLink href="/signup">Create your workspace</TextLink>
      </div>

      <div>
        <PanelHeader>
          <span>
            In the box
            <Sup>({capabilities.length})</Sup>
          </span>
          <span className="normal-case tracking-normal">Included on every plan</span>
        </PanelHeader>

        {/*
         * The 1px gutters are the parent's background showing through a `gap-px`
         * grid of white cells — chanhdai's trick. It gives perfectly even rules
         * without every cell having to reason about which edges to draw.
         */}
        <div className="grid grid-cols-3 gap-px bg-ink-line">
          {capabilities.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex min-h-[104px] flex-col items-center justify-center gap-2.5 bg-white px-2 text-center text-[13px] leading-5 text-ink-500"
            >
              <Icon className="size-[22px] text-berry-600" strokeWidth={1.5} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
