import type { LucideIcon } from 'lucide-react';
import { COMPANY_PROFILES } from '@/lib/founder';
import { Blocks, BookOpen, BriefcaseBusiness, Newspaper, Scale } from 'lucide-react';

/*
 * Landing page copy. The layout (card counts, line lengths) is the Framer
 * design's; the words are Fluxberry's. Each heading and lead wraps to the
 * same number of lines as the Framer text it replaces, at all three
 * breakpoints, so re-check the wrapping when editing one. Keep every claim
 * true to the product. House style: no em dashes in user-facing copy.
 */

/**
 * The product's name on the marketing site. Marketing pages spell it out rather than
 * reading publicConfig.appName, which stays as configured for the app and auth pages.
 */
export const BRAND = 'Fluxberry';

export const HERO = {
  badge: 'Built for fast moving teams',
  title: 'The #1 AI Native Hiring Platform',
  lead: ['Fluxberry is an AI Native hiring tool that is fast, simple.', 'Built for founders & hiring managers.'],
  cta: { label: 'Get Started', href: '/sign-up' },
  /**
   * The product shot: the Fluxberry dashboard alone, edge to edge. The hero draws it live
   * (HeroDashboard, on this image's pixel grid); the sign-in and sign-up pages show the image.
   */
  image: {
    src: '/landing/dashboard.jpg',
    alt: 'Fluxberry dashboard with open jobs, the hiring pipeline, top candidates and the interview schedule',
    width: 1960,
    height: 1208,
  },
  /** Painted sky-and-valley scene behind the hero (decorative). */
  backdrop: '/landing/hero-landscape.webp',
};

/** Which animated scene a Product card shows (see ./product). */
export type ProductVisualKind = 'tracking' | 'analytics' | 'video-forms' | 'sourcing' | 'careers' | 'referrals';

export interface ProductCard {
  title: string;
  body: string;
  visual: ProductVisualKind;
  /** The plan that unlocks it, when it isn't on every plan. */
  plan?: 'Max';
}

/** What Fluxberry is made of: six products, each with its own animated scene. Claims match lib/pricing's plan features. */
export const PRODUCT = {
  pill: 'Product',
  title: 'Everything you need to hire, in one place',
  lead: 'An applicant tracking system with a job board, analytics, video application forms, talent sourcing, a careers site and referrals.',
  cards: [
    {
      title: 'Applicant tracking and job board',
      body: 'Publish a job to your own board, then move every applicant through one pipeline of your own stages, with team notes and an AI match score on each.',
      visual: 'tracking',
    },
    {
      title: 'Analytics',
      body: 'See pipeline conversion, time in each stage and which sources bring your best hires, so you know where hiring slows down.',
      visual: 'analytics',
    },
    {
      title: 'Video application forms',
      body: 'Ask for a recorded video answer, a file upload or a link in your application form, and see the person before the first call.',
      visual: 'video-forms',
    },
    {
      title: 'Talent sourcing (TalentGPT)',
      body: 'Describe who you want in plain English, get matching candidates with a transparent match score, and reach out from the same screen.',
      visual: 'sourcing',
      plan: 'Max',
    },
    {
      title: 'Careers website',
      body: 'A careers page in your brand color, with your own headline and every open role, live without a developer.',
      visual: 'careers',
    },
    {
      title: 'Candidate referrals',
      body: 'Share a referral link for any open role, see who applied through it and track each referrer’s reward.',
      visual: 'referrals',
      plan: 'Max',
    },
  ] satisfies ProductCard[],
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
      a: 'Absolutely. You can upgrade, downgrade, or cancel your plan at any time from the Upgrade page in your dashboard.',
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

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface NavGroup {
  label: string;
  /** `comingSoon` items show a locked "Coming soon" row instead of a link until their page launches. */
  items: (NavLinkItem & { icon: LucideIcon; comingSoon?: boolean })[];
}

/**
 * Nav links (desktop pill + mobile menu). A group opens as a dropdown in the
 * pill and expands in place in the phone menu.
 */
export const NAV_LINKS: (NavLinkItem | NavGroup)[] = [
  { label: 'Product', href: '/#product' },
  { label: 'Pricing', href: '/pricing' },
  {
    label: 'Resources',
    items: [
      { label: 'Blog', href: '/blog', icon: Newspaper },
      { label: 'Careers', href: '/careers', icon: BriefcaseBusiness, comingSoon: true },
      { label: 'Comparisons', href: '/comparisons', icon: Scale, comingSoon: true },
      { label: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, comingSoon: true },
      { label: 'Integrations', href: '/integrations', icon: Blocks, comingSoon: true },
    ],
  },
];

/** The address for support, privacy and refund requests (also listed on the legal pages). */
export const CONTACT_EMAIL = 'sayandeep@fluxberry.in';

/** Legal pages, each backed by a markdown file in `content/legal`. */
export const LEGAL_LINKS: NavLinkItem[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'Refund Policy', href: '/refund-policy' },
];

/**
 * The footer's "Summarize what Fluxberry does with AI" buttons: each opens the
 * assistant with this prompt filled in (the URL ends in its query parameter,
 * the encoded prompt is appended). The prompt names the live site, which the
 * assistants can read; keep its claims true to the product. Gemini's own app
 * can't be prefilled, so its button opens Google's Gemini-powered AI Mode.
 */
export const SUMMARIZE_WITH_AI = {
  label: 'Summarize what Fluxberry does with AI:',
  prompt:
    "I'm a founder or hiring manager building my team. I want to understand how Fluxberry, the AI native hiring platform, helps me post jobs, screen and rank applicants with AI, source candidates with TalentGPT, and run my whole hiring pipeline in one place. Summarize the highlights from Fluxberry's website: https://fluxberry.in/",
  assistants: [
    { name: 'ChatGPT', url: 'https://chatgpt.com/?hints=search&q=' },
    { name: 'Claude', url: 'https://claude.ai/new?q=' },
    { name: 'Perplexity', url: 'https://www.perplexity.ai/search?q=' },
    { name: 'Gemini', url: 'https://www.google.com/search?udm=50&q=' },
  ],
} as const;

/** A footer link. `comingSoon` rows are shown locked, not linked, until their page launches. */
export interface FooterItem extends NavLinkItem {
  comingSoon?: boolean;
}

/**
 * A Resources item from the nav, with its "Coming soon" flag. The footer reads
 * these rather than repeating them, so dropping an item's flag when its page
 * ships turns it into a link in the nav and the footer at once.
 */
function navResource(label: string): FooterItem {
  const group = NAV_LINKS.find((l): l is NavGroup => 'items' in l && l.label === 'Resources');
  const item = group?.items.find((i) => i.label === label);
  if (!item) throw new Error(`No Resources nav item named "${label}"`);
  return { label: item.label, href: item.href, comingSoon: item.comingSoon };
}

export const FOOTER = {
  tagline: 'The AI native hiring platform for founders & hiring managers.',
  /** The link directory: four columns, only pages that exist (or are locked as coming soon). */
  columns: [
    {
      title: 'Product',
      // The six cards of the landing's Product section; none has its own page yet.
      links: [
        { label: 'Applicant Tracking & Job Board', href: '/#product' },
        { label: 'Analytics', href: '/#product' },
        { label: 'Video Application Forms', href: '/#product' },
        { label: 'Talent Sourcing (TalentGPT)', href: '/#product' },
        { label: 'Careers Website', href: '/#product' },
        { label: 'Referrals', href: '/#product' },
      ],
    },
    {
      title: 'Resources',
      links: [
        navResource('Blog'),
        { label: 'Pricing', href: '/pricing' },
        { label: 'FAQ', href: '/#faq' },
        navResource('Knowledge Base'),
        navResource('Comparisons'),
        navResource('Integrations'),
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        navResource('Careers'),
        { label: 'Contact', href: `mailto:${CONTACT_EMAIL}` },
        { label: 'LinkedIn', href: COMPANY_PROFILES.linkedinUrl },
        { label: 'X (Twitter)', href: COMPANY_PROFILES.xUrl },
        { label: 'Log in', href: '/sign-in' },
        { label: 'Get started', href: '/sign-up' },
      ],
    },
    { title: 'Legal', links: LEGAL_LINKS },
  ] satisfies { title: string; links: FooterItem[] }[],
};
