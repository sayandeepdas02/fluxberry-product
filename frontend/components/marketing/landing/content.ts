import type { LucideIcon } from 'lucide-react';
import { ChartNoAxesCombined, Lock, Settings, Timer, Users, Zap } from 'lucide-react';

/*
 * Landing page copy. The layout (card counts, line lengths) is the Framer
 * design's; the words are Fluxberry's. Each heading and lead wraps to the
 * same number of lines as the Framer text it replaces, at all three
 * breakpoints, so re-check the wrapping when editing one. Keep every claim
 * true to the product. House style: no em dashes in user-facing copy.
 */

export const HERO = {
  badge: 'Built for fast moving teams',
  title: 'The #1 AI Native Hiring Platform',
  lead: ['Fluxberry AI is an AI Native hiring tool that is fast, simple.', 'Built for founders & hiring managers.'],
  cta: { label: 'Get Started', href: '/sign-up' },
  /** The product shot: the dashboard alone, edge to edge (8:5). */
  image: {
    src: '/landing/dashboard.jpg',
    alt: 'SaaS dashboard interface with task management and performance metrics',
    width: 1944,
    height: 1215,
  },
  /** Painted sky-and-valley scene behind the hero (decorative). */
  backdrop: '/landing/hero-landscape.webp',
};

export interface ProductCard {
  icon: LucideIcon;
  title: string;
  body: string;
}

export const PRODUCT = {
  pill: 'Product',
  title: 'Great hires without the busywork',
  lead: 'Fluxberry takes care of the repetitive parts of hiring, so your whole team can focus on the right people.',
  cards: [
    {
      icon: Zap,
      title: 'Live in Minutes',
      body: 'Create a job, publish it to your careers page and start collecting applications the same day.',
    },
    {
      icon: Users,
      title: 'Built for Teams',
      body: 'Invite your whole team at no extra cost. Share candidates, leave notes and decide together.',
    },
    {
      icon: ChartNoAxesCombined,
      title: 'Scales With You',
      body: 'From your first hire to your fiftieth, unlimited jobs and candidates grow with your company.',
    },
    {
      icon: Lock,
      title: 'Private & Secure',
      body: 'Candidate data stays in your workspace, with role-based access for every member of the team.',
    },
    {
      icon: Settings,
      title: 'Made to Fit',
      body: 'Custom pipeline stages, application forms and a careers page that matches your brand.',
    },
    {
      icon: Timer,
      title: 'Fast Decisions',
      body: 'AI scores applicants against your job the moment they apply, so the strongest rise to the top.',
    },
  ] satisfies ProductCard[],
};

export interface SolutionCard {
  title: string;
  body: string;
  image: string;
  /** Intrinsic size of the image, for next/image. */
  width: number;
  height: number;
  /** Wide cards take 750px of the 1300px row; narrow ones 530px. */
  wide: boolean;
}

export const SOLUTIONS = {
  pill: 'Solutions',
  title: 'Everything you need to run your hiring',
  lead: 'All the core tools you need to attract, screen and hire great candidates as a team, without the complexity of an enterprise ATS.',
  cards: [
    {
      title: 'Hiring Dashboard',
      body: 'See every open role, new applicants and pipeline progress at a glance in one simple view.',
      image: '/landing/feature-smart-dashboard.jpg',
      width: 866,
      height: 660,
      wide: false,
    },
    {
      title: 'Team Collaboration',
      body: 'Review candidates together, share notes and move people through stages as a team.',
      image: '/landing/feature-team-collaboration.jpg',
      width: 1254,
      height: 660,
      wide: true,
    },
    {
      title: 'AI Screening',
      body: 'Every resume is parsed and scored against your job, with clear strengths and concerns.',
      image: '/landing/feature-automated-workflows.jpg',
      width: 1254,
      height: 660,
      wide: true,
    },
    {
      title: 'Hiring Analytics',
      body: 'Track pipeline conversion, time in each stage and the sources that bring your best hires.',
      image: '/landing/feature-advanced-analytics.jpg',
      width: 866,
      height: 660,
      wide: false,
    },
    {
      title: 'Secure by Default',
      body: 'Role-based access, per-job permissions and GDPR tools keep candidate data private.',
      image: '/landing/feature-secure-by-default.jpg',
      width: 866,
      height: 660,
      wide: false,
    },
    {
      title: 'Works With Your Tools',
      body: 'Check availability in Google Calendar, share roles on LinkedIn and email candidates directly.',
      image: '/landing/feature-integrations.jpg',
      width: 1254,
      height: 660,
      wide: true,
    },
  ] satisfies SolutionCard[],
};

export const PRICING_COPY = {
  pill: 'Pricing',
  title: 'Built to help teams hire faster',
  lead: ['The best investment for hiring the best talent.', 'Select the one which suits you.'],
};

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ = {
  pill: 'FAQ',
  title: 'Frequently asked questions',
  lead: 'Everything you need to know before getting started.',
  items: [
    {
      q: 'How does pricing work?',
      a: 'Choose Pro or Max, billed monthly or yearly. Every plan includes unlimited jobs, candidates and team members.',
    },
    {
      q: 'Can I change my plan later?',
      a: 'Absolutely. You can upgrade, downgrade, or cancel your plan at any time from your billing settings.',
    },
    {
      q: 'What are AI credits?',
      a: 'Credits power AI actions like talent sourcing and outreach drafts. Pro includes 250 a month, Max 500.',
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. Every workspace is private, access is role-based, and candidate data can be anonymized or deleted on request.',
    },
    {
      q: 'Can I use this for my team?',
      a: 'Yes. Every plan includes unlimited team members, so everyone who hires can join at no extra cost.',
    },
    {
      q: 'Does it work on all devices?',
      a: 'Yes, it’s fully responsive and works seamlessly on desktop, tablet, and mobile devices.',
    },
    {
      q: 'Do you offer customer support?',
      a: 'Yes. Email us anytime and we’ll help you get set up. Max plans include priority support.',
    },
  ] satisfies FaqItem[],
};

export const FOOTER = {
  tagline: 'The AI native hiring platform for founders & hiring managers.',
  links: [
    { label: 'Home', href: '/' },
    { label: 'Product', href: '/#why-us' },
    { label: 'Solutions', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'FAQ', href: '/#faq' },
    { label: 'Blog', href: '/blog' },
    { label: 'Log in', href: '/sign-in' },
    { label: 'Get started', href: '/sign-up' },
  ],
};

/** Nav links (desktop pill + mobile menu). */
export const NAV_LINKS = [
  { label: 'Products', href: '/#why-us' },
  { label: 'Solutions', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Resources', href: '/blog' },
];
