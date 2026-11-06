/*
 * Copy and facts for the "Zliptal vs X" comparison pages (/comparisons).
 *
 * Positioning: Zliptal is the cheaper, simpler ATS for small, fast-hiring teams. Claims about
 * the other products come from their own public pricing and product pages (checked
 * November 2026) and from the blog's alternatives guides; where a number isn't public we say
 * "quote only" rather than guess. Zliptal's own gaps (no interview kits, scorecards, approvals or
 * integration marketplace yet) are shown plainly, because a comparison that hides them isn't trusted.
 *
 * We never link to another company's site from these pages: it would hand them a backlink.
 * House style: no em dashes in user-facing copy. `{pro}` and `{max}` are filled with the live
 * monthly prices from lib/pricing when a page renders, so a price change can't leave a stale number.
 */

export type CellStatus = 'yes' | 'partial' | 'no' | 'info';
export interface Cell {
  s: CellStatus;
  t: string;
}

export const ROWS = [
  { key: 'price', label: 'Pricing' },
  { key: 'trial', label: 'Free trial' },
  { key: 'built', label: 'Built for' },
  { key: 'ats', label: 'Applicant tracking and job board' },
  { key: 'scoring', label: 'AI scoring of every applicant' },
  { key: 'sourcing', label: 'Talent sourcing' },
  { key: 'crm', label: 'Recruiting CRM' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'setup', label: 'Time to set up' },
  { key: 'depth', label: 'Enterprise depth (scorecards, approvals, integrations)' },
] as const;
export type RowKey = (typeof ROWS)[number]['key'];

const y = (t: string): Cell => ({ s: 'yes', t });
const p = (t: string): Cell => ({ s: 'partial', t });
const n = (t: string): Cell => ({ s: 'no', t });
const i = (t: string): Cell => ({ s: 'info', t });

/** Zliptal's side of every table. Each line is true to the product and its plans (see lib/pricing). */
export const ZLIPTAL_CELLS: Record<RowKey, Cell> = {
  price: y('{pro}/month (Pro) or {max}/month (Max). Flat, published, with unlimited jobs, candidates and team members.'),
  trial: p('No free trial. Monthly billing, cancel any time.'),
  built: i('Founders and small, fast-hiring teams'),
  ats: y('Job board, your own pipeline stages, team notes and Google Calendar interviews.'),
  scoring: y('Every applicant scored against the job, with a written summary, strengths and concerns.'),
  sourcing: y('TalentGPT: describe who you want in plain English and get matches with a transparent score (Max).'),
  crm: p('Outreach from the sourcing screen (Max). No separate nurture CRM.'),
  analytics: y('Pipeline conversion, time in each stage and which sources bring your best hires.'),
  setup: y('Live the same day. Publish a job and your careers page without a developer.'),
  depth: n('No interview kits, scorecards, approval chains or integration marketplace yet.'),
};

export interface Competitor {
  /** URL key: the page lives at /comparisons/zliptal-vs-{slug}. */
  slug: string;
  name: string;
  /** Short label for the hub card. */
  category: string;
  /** One line for the hub card. */
  blurb: string;
  /** The page's H1. */
  headline: string;
  lead: string;
  metaDescription: string;
  /** Three short points under the hero buttons. */
  glance: [string, string, string];
  /** The competitor's column, in ROWS order. */
  cells: Record<RowKey, Cell>;
  /** Blog posts worth reading next, best first. */
  posts: string[];
  /** FAQ answers; the generic questions are added around them. */
  why: string;
  pricing: string;
  setup: string;
  stay: string;
  /** One question specific to this competitor. */
  extra: { q: string; a: string };
}

type CellList = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
const cells = (list: CellList): Record<RowKey, Cell> =>
  Object.fromEntries(ROWS.map((row, index) => [row.key, list[index]])) as Record<RowKey, Cell>;

export const COMPETITORS: Competitor[] = [
  {
    slug: 'greenhouse',
    name: 'Greenhouse',
    category: 'Structured-hiring ATS',
    blurb: 'Quote-only pricing and a sales-led setup. Zliptal is flat-priced and live the same day.',
    headline: 'The Greenhouse alternative built for small teams',
    lead: 'Greenhouse is the standard for structured hiring at scale. If you make a handful of hires a year, Zliptal gives you a scored shortlist, a pipeline and a careers page at a flat price you can see.',
    metaDescription:
      'Zliptal vs Greenhouse: compare pricing, AI applicant scoring, sourcing and setup. A simpler, cheaper ATS with a flat price for small hiring teams.',
    glance: ['Flat price, published on the site', 'Every applicant scored with reasons', 'Live the same day, no sales call'],
    cells: cells([
      n('Quote only across Core, Plus and Pro.'),
      n('Demo only, no trial.'),
      i('Scaling companies running structured hiring at volume'),
      y('Full ATS with interview plans, scorecards and offers.'),
      y('Talent Matching prioritises applicants against weighted criteria, on every plan.'),
      p('Sourcing CRM for managing prospects.'),
      y('Sourcing CRM included.'),
      y('Built-in reporting; some features start on higher plans.'),
      p('Sales-led buying, then onboarding.'),
      y('Interview kits, scorecards, approvals and 400+ integrations.'),
    ]),
    posts: ['greenhouse-alternatives', 'tools-that-integrate-with-greenhouse', 'best-applicant-tracking-systems'],
    why: 'Greenhouse is built for companies running many interview loops, and its price and process reflect that. Zliptal is built for the opposite case: a small team whose bottleneck is reading applications. It scores every applicant against the job, explains the score, runs your pipeline and careers page, and costs {pro}/month with no sales process.',
    pricing:
      'Greenhouse prices Core, Plus and Pro by quote, shaped by plan, hiring volume and complexity, so you cannot see a price before talking to sales. Zliptal publishes both plans: Pro at {pro}/month and Max at {max}/month, with unlimited jobs, candidates and team members.',
    setup:
      'Yes. Greenhouse is sold through a demo and a sales-led rollout, and some automation such as auto-reject starts on Plus. With Zliptal you sign up, post a job and your careers page goes live the same day.',
    stay: 'Stay with Greenhouse if your process depends on structured interviewing: interview kits, scorecards, approval chains or its 400+ integrations. Zliptal does not have those yet. If your real problem is triaging applicants quickly and affordably, Zliptal fits better.',
    extra: {
      q: 'Does Zliptal have scorecards and interview kits like Greenhouse?',
      a: 'Not yet. Zliptal focuses on scoring applicants, running the pipeline and scheduling interviews on Google Calendar. If scorecards for every interviewer are central to how you hire, Greenhouse is the closer match today.',
    },
  },
  {
    slug: 'ashby',
    name: 'Ashby',
    category: 'All-in-one ATS with analytics',
    blurb: 'Priced by headcount from $300 a month. Zliptal is a flat price from {pro} a month.',
    headline: 'A simpler, cheaper alternative to Ashby',
    lead: 'Ashby is a strong all-in-one ATS with deep analytics, priced by company headcount. Zliptal covers the core of hiring for a flat {pro} a month, with unlimited team members.',
    metaDescription:
      'Zliptal vs Ashby: compare headcount-based pricing with a flat {pro}/month, AI applicant scoring, analytics and sourcing for small, fast-hiring teams.',
    glance: ['Flat price, not tied to headcount', 'Unlimited team members on every plan', 'AI score on every applicant'],
    cells: cells([
      p('Foundations from $300/month for 1 to 10 employees, rising with headcount. Higher plans by quote.'),
      n('Demo only.'),
      i('Scaling companies that want analytics without a BI tool'),
      y('Full ATS with scheduling and offers.'),
      p('Checks each resume against criteria you write. No overall score.'),
      p('Sourcing and outreach through its CRM.'),
      y('CRM included.'),
      y('Unusually deep; custom reports and dashboards start above Foundations.'),
      p('Demo and onboarding; more to configure.'),
      y('Approvals, custom fields and 250+ integrations on higher plans.'),
    ]),
    posts: ['ashby-alternatives', 'tools-that-integrate-with-ashby', 'best-applicant-tracking-systems'],
    why: 'Ashby is priced for a growing company: $300 to $900 a month on Foundations as headcount rises, with the features that make it powerful on higher, quote-only plans. Zliptal does not scale its price with your headcount. You pay {pro} or {max} a month and everyone on your team can use it.',
    pricing:
      "Ashby's Foundations plan runs from $300 a month for 1 to 10 employees up to $900 a month at 76 to 100 employees, with custom fields, custom reports and approvals on Plus, which is quote only. Zliptal is {pro}/month on Pro and {max}/month on Max, however many people you employ.",
    setup:
      'Zliptal is lighter to adopt. Ashby has more to configure because it does more: scheduling, a CRM, analytics and approvals. Zliptal has a single pipeline, a careers page and AI scoring that start working as soon as the first application arrives.',
    stay: "Stay with Ashby if analytics are central to how you run hiring, or you need custom reports, approvals and its integration directory. Zliptal's analytics cover pipeline conversion, time in stage and source quality, but not custom report building.",
    extra: {
      q: "Does Zliptal score applicants the way Ashby's AI review does?",
      a: 'Slightly differently. Ashby marks each resume as meeting or not meeting criteria you write, with no overall score. Zliptal gives each applicant a 0 to 10 score built from weighted factors, with a written summary, strengths and concerns, so you can sort a long list at a glance.',
    },
  },
  {
    slug: 'lever',
    name: 'Lever',
    category: 'ATS with recruiting CRM',
    blurb: 'Pricing on request and demo only. Zliptal publishes its price and is live the same day.',
    headline: 'The easier, cheaper alternative to Lever',
    lead: 'Lever pairs an ATS with a recruiting CRM for long-running talent pipelines. If you want to score applicants, publish jobs and hire fast without a quote, Zliptal is the lighter choice.',
    metaDescription:
      'Zliptal vs Lever: compare pricing, AI fit scoring, sourcing and setup. A cheaper, simpler ATS for small hiring teams, from {pro}/month.',
    glance: ['Price published, no quote needed', 'Sourcing and scoring in one product', 'Unlimited jobs and candidates'],
    cells: cells([
      n('Pricing on request; onboarding and some add-ons quoted separately.'),
      n('Demo only, no trial.'),
      i('Teams that nurture candidates over time'),
      y('Full ATS with scheduling and offers.'),
      y('AI fit score with a written justification.'),
      p('Sourced prospects tracked in the CRM.'),
      y('Recruiting CRM for nurturing candidates.'),
      y('Reporting and dashboards.'),
      p('Migrations typically take about six weeks, per Lever.'),
      y('300+ integrations in its marketplace.'),
    ]),
    posts: ['tools-that-integrate-with-lever', 'greenhouse-alternatives', 'best-applicant-tracking-systems'],
    why: 'Lever is a full-lifecycle platform sold on custom pricing with a demo-led process. Zliptal gives a small team what it uses every day (scored applicants, a clean pipeline, a branded careers page, analytics and sourcing) at {pro} or {max} a month, with nothing to negotiate.',
    pricing:
      'Lever prices on request and quotes onboarding and some add-ons separately, so the total depends on a sales conversation. Zliptal has two public plans: Pro at {pro}/month and Max at {max}/month, each with unlimited jobs, candidates and team members.',
    setup:
      'Yes. Lever says typical migrations take about six weeks. Zliptal needs no migration project for a new role: create the job, share the careers page and applicants are scored as they arrive.',
    stay: 'Stay with Lever if nurturing a large talent pool over months is central to your hiring, or you rely on its 300+ marketplace integrations. Zliptal has outreach on Max but not a full nurture CRM.',
    extra: {
      q: 'Does Zliptal have a CRM like Lever?',
      a: 'Zliptal has talent sourcing and outreach on the Max plan: search people in plain English, add them to lists and send emails from the same screen, then convert them into candidates. It does not yet have the long-term nurture workflows of a dedicated recruiting CRM.',
    },
  },
  {
    slug: 'workable',
    name: 'Workable',
    category: 'All-round ATS',
    blurb: 'From $299 a month for up to 20 employees. Zliptal is {pro} a month, flat.',
    headline: 'A cheaper alternative to Workable',
    lead: 'Workable is an all-round ATS that posts to 200+ job boards, priced by company size. Zliptal gives small teams AI scoring, sourcing and a careers site for a lot less.',
    metaDescription:
      'Zliptal vs Workable: compare $299/month company-size pricing with Zliptal at {pro}/month, plus AI scoring, sourcing and analytics for small teams.',
    glance: ['{pro}/month, not $299', 'AI score on every applicant', 'Sourcing built in on Max'],
    cells: cells([
      p('Standard is $299/month billed annually ($360 monthly) for 1 to 20 employees.'),
      y('15-day free trial.'),
      i('Growing companies that want wide job-board reach'),
      y('Full ATS posting to 200+ job boards, with a careers page builder.'),
      y('Workable Agent scores candidates on up to 14 criteria.'),
      p('Sourcing tools; AI agent work is billed in credits.'),
      i('Talent pool of past candidates.'),
      y('Reporting included.'),
      y('Quick to start, with a trial.'),
      y('Interview kits, scorecards, e-signed offers and 270+ integrations.'),
    ]),
    posts: ['greenhouse-alternatives', 'best-applicant-tracking-systems', 'recruiting-software'],
    why: "Workable's Standard plan starts at $299 a month billed annually for companies up to 20 people, and AI agent work is billed in credits on top. Zliptal is {pro} a month for the Pro plan, with unlimited jobs, candidates and team members and an AI score on every applicant.",
    pricing:
      "Workable's Standard plan is $299 a month billed annually ($360 billed monthly) for 1 to 20 employees and $419 a month billed annually for 21 to 50, with texting, video and assessments as add-ons. Zliptal is {pro}/month on Pro and {max}/month on Max, whatever your headcount.",
    setup:
      'Both are quick to start, and Workable offers a 15-day trial where Zliptal does not. Zliptal has fewer settings to configure, so a small team can post a job and have scored applicants the same day.',
    stay: "Stay with Workable if you need broad job-board posting, interview kits and scorecards, e-signed offers, a trial before buying, or its integration marketplace. Zliptal doesn't have those yet.",
    extra: {
      q: 'Does Zliptal post to job boards like Workable?',
      a: 'Zliptal publishes jobs to your own job board and branded careers page, which is where most small teams start. It does not yet syndicate to hundreds of third-party job boards the way Workable does.',
    },
  },
  {
    slug: 'workday-recruiting',
    name: 'Workday Recruiting',
    category: 'Enterprise HR suite module',
    blurb: 'Part of an enterprise HR suite with months-long rollouts. Zliptal is live the same day.',
    headline: 'The lightweight alternative to Workday Recruiting',
    lead: 'Workday Recruiting is a module of an enterprise HR suite, built for large companies already running Workday. If you are a small team that needs to hire, you do not need a suite. You need an ATS.',
    metaDescription:
      'Zliptal vs Workday Recruiting: an ATS you can start today at {pro}/month, instead of an enterprise HR suite module with a long implementation.',
    glance: ['No suite, no implementation project', 'Published flat pricing', 'Built for small hiring teams'],
    cells: cells([
      n('Quote only, sold with the Workday suite.'),
      n('Demo through sales.'),
      i('Large enterprises already on Workday HCM'),
      y('Recruiting inside the Workday suite.'),
      p('Varies by Workday package.'),
      p('Varies by Workday package.'),
      p('Varies by Workday package.'),
      y('Workday reporting across HR and hiring.'),
      n('Implementation is a project, not a sign-up.'),
      y('Compliance, security and global reach of the full HCM suite.'),
    ]),
    posts: ['best-applicant-tracking-systems', 'recruiting-software', 'tools-that-integrate-with-sap-successfactors'],
    why: 'Workday Recruiting makes sense when the rest of your HR already runs on Workday. For a small team it is a lot of suite to buy and implement just to post jobs and review applicants. Zliptal does that job directly, with AI scoring on every applicant, for {pro} a month.',
    pricing:
      'Workday does not publish prices for Recruiting; it is sold by quote as part of the wider suite. Zliptal is public: Pro at {pro}/month and Max at {max}/month, with unlimited jobs, candidates and team members and no implementation fee.',
    setup:
      'Yes. Workday is an implementation project, usually run with an administrator or partner. Zliptal is a sign-up: add your job, share your careers page and start receiving scored applicants the same day.',
    stay: 'Stay with Workday Recruiting if you already run Workday HCM and need hiring tied to one employee record, enterprise compliance and global rollout. Zliptal is not an HR suite and has no payroll or core HR.',
    extra: {
      q: 'Can Zliptal replace Workday for a small company?',
      a: 'For hiring, yes. If you are small enough that you do not run Workday for core HR, Zliptal covers jobs, applicants, scoring, interviews and offers. It does not do payroll, benefits or employee records.',
    },
  },
  {
    slug: 'smartrecruiters',
    name: 'SmartRecruiters',
    category: 'Enterprise ATS with CRM',
    blurb: 'Enterprise ATS now part of SAP. Zliptal is simple, flat-priced and made for small teams.',
    headline: 'A simpler alternative to SmartRecruiters',
    lead: 'SmartRecruiters is an enterprise ATS and CRM for high-volume hiring, now part of SAP. Zliptal gives growing teams a faster, cheaper way to hire without an enterprise rollout.',
    metaDescription:
      'Zliptal vs SmartRecruiters: compare quote-only enterprise pricing with Zliptal at {pro}/month, AI scoring, sourcing and a same-day setup.',
    glance: ['Public price, no annual contract needed', 'No enterprise rollout', 'AI scoring and sourcing included'],
    cells: cells([
      n('Quote only, based on company size.'),
      n('Demo only.'),
      i('Growing enterprises and high-volume hiring'),
      y('Full ATS with job distribution and an agency portal.'),
      y('AI talent matching and an AI recruiting companion.'),
      p('Job distribution and CRM-led sourcing.'),
      y('Built-in recruiting CRM.'),
      y('Analytics included.'),
      p('Sales-led enterprise rollout.'),
      y('Dynamic scheduling, agency portal and SAP backing.'),
    ]),
    posts: ['best-applicant-tracking-systems', 'tools-that-integrate-with-sap-successfactors', 'recruiting-software'],
    why: 'SmartRecruiters is designed for enterprises and high-volume hiring, and it is sold by quote with headcount-based pricing. Zliptal is designed for the team that has no recruiting department: a flat price, AI scoring on every applicant and no rollout to plan.',
    pricing:
      'SmartRecruiters does not publish prices; its pricing page directs you to book a demo. Zliptal publishes both plans: Pro at {pro}/month and Max at {max}/month, with unlimited jobs, candidates and team members.',
    setup:
      'Yes. SmartRecruiters is sold through a demo and rolled out to enterprise teams. Zliptal is self-serve: sign up, create a job and your careers page is ready the same day.',
    stay: "Stay with SmartRecruiters if you hire at high volume across many locations, need an agency portal or conversational apply over SMS and WhatsApp, or you're standardising on SAP. Zliptal is built for far smaller teams.",
    extra: {
      q: 'Is SmartRecruiters still independent now that SAP owns it?',
      a: 'SAP completed its acquisition of SmartRecruiters in September 2025 and has said it continues as a standalone product. Zliptal is independent and focused on one thing: helping small teams hire quickly.',
    },
  },
  {
    slug: 'icims',
    name: 'iCIMS',
    category: 'Enterprise talent cloud',
    blurb: 'Enterprise suite sold as separate modules. Zliptal puts it all in one plan.',
    headline: 'The right-sized alternative to iCIMS',
    lead: 'iCIMS is an enterprise talent cloud sold as separate products for hiring, sourcing and employer branding. Zliptal puts an ATS, analytics, sourcing and a careers site in one simple plan.',
    metaDescription:
      'Zliptal vs iCIMS: an ATS, careers site, analytics and sourcing in one plan from {pro}/month, instead of an enterprise suite sold module by module.',
    glance: ['One plan, not separate modules', 'Careers site included', 'No long rollout'],
    cells: cells([
      n('Quote only; products such as Hire, Engage and Employer Branding are sold separately.'),
      n('Demo through sales.'),
      i('Enterprises in retail, healthcare, manufacturing and finance'),
      y('Configurable ATS with text recruiting and high-volume tools.'),
      p('iCIMS AI features across the suite.'),
      p('Engage for sourcing and nurture campaigns.'),
      y('CRM and nurture campaigns in Engage.'),
      y('Reporting included.'),
      n('Configuration-heavy rollout.'),
      y('High-volume hiring tools and a large integration marketplace.'),
    ]),
    posts: ['best-applicant-tracking-systems', 'recruiting-software', 'greenhouse-alternatives'],
    why: 'iCIMS is built for large talent acquisition teams and is sold as separate modules by quote. Zliptal is the opposite: one plan includes the ATS, job board, careers site and analytics, with sourcing and referrals on Max, at {pro} or {max} a month.',
    pricing:
      'iCIMS does not publish its prices, and its hiring, sourcing and employer-branding products are sold separately. Zliptal is public and simple: Pro at {pro}/month and Max at {max}/month, with unlimited jobs, candidates and team members.',
    setup:
      'Yes. iCIMS is highly configurable, which means more to set up and manage. Zliptal has one pipeline you can shape with your own stages, and it is ready to use as soon as you publish a job.',
    stay: 'Stay with iCIMS if you hire at very high volume, need text recruiting at scale or rely on its enterprise integration marketplace. Zliptal is built for small teams, not large talent acquisition departments.',
    extra: {
      q: 'Is iCIMS too big for a 10 to 50 person company?',
      a: 'It is designed for enterprise talent acquisition teams, so most small companies use only a fraction of it. A smaller ATS such as Zliptal usually covers what a 10 to 50 person team needs for far less effort and money.',
    },
  },
  {
    slug: 'gem',
    name: 'Gem',
    category: 'Sourcing, CRM and ATS',
    blurb: 'Priced by headcount with AI behind paid seats. Zliptal has no per-seat AI charge.',
    headline: 'A simpler, cheaper alternative to Gem',
    lead: 'Gem combines sourcing, a recruiting CRM and an ATS for startups and enterprises. Zliptal gives you scoring and sourcing in one product with flat pricing and unlimited team members.',
    metaDescription:
      'Zliptal vs Gem: compare headcount-based pricing and AI seats with Zliptal at {pro}/month, flat, including AI applicant scoring and talent sourcing.',
    glance: ['Flat price, no AI seats', 'Sourcing built in on Max', 'Unlimited team members'],
    cells: cells([
      p('Custom, by employee count. Listed from $130/month on a yearly plan for 1 to 10 employees.'),
      p('No trial. Companies under 30 employees get a free period.'),
      i('Startups to enterprise that want sourcing, CRM and ATS together'),
      y('All-in-One plan with its own ATS.'),
      y('AI Application Review Agent scores and ranks inbound applications.'),
      y('Sourcing agent searching 800M+ profiles.'),
      y('Recruiting CRM included.'),
      y('Analytics included.'),
      p('Sales-led; AI features need paid seats.'),
      y('Panel and multi-day interview scheduling.'),
    ]),
    posts: ['ashby-alternatives', 'recruiting-software', 'metaview-alternatives'],
    why: 'Gem is a powerful sourcing and CRM platform, priced by company size and with its AI features on paid seats. Zliptal is deliberately smaller: AI scoring on every applicant, talent sourcing on Max and a careers page, for a flat {pro} or {max} a month.',
    pricing:
      'Gem prices by employee count and shows a listed starting price for the smallest companies, with higher tiers by quote and AI features limited to AI-Powered seats. Zliptal is {pro}/month on Pro and {max}/month on Max, with unlimited team members and no seat tiers.',
    setup:
      'Zliptal is lighter. Gem is a sales-led platform that you assemble around sourcing, CRM and scheduling. Zliptal gives you a pipeline, a careers page and AI scoring that run from your first job.',
    stay: "Stay with Gem if outbound sourcing at scale is your main motion, you need its 800M+ profile search, or you need advanced interview scheduling. Zliptal's TalentGPT is a more compact tool for smaller sourcing needs.",
    extra: {
      q: 'Is Zliptal a good fit if I already use Gem for sourcing?',
      a: 'Zliptal includes its own sourcing on Max, so most small teams do not need both. If you keep Gem for outbound, Zliptal can still be your system for jobs, applicants and scoring.',
    },
  },
  {
    slug: 'juicebox',
    name: 'Juicebox',
    category: 'AI sourcing tool',
    blurb: 'Juicebox finds people but is not an ATS. Zliptal sources and runs your hiring.',
    headline: 'An ATS and sourcing tool in one, instead of Juicebox',
    lead: 'Juicebox is an AI people-search tool. It finds candidates, but you still need a separate ATS to run hiring. Zliptal includes TalentGPT sourcing, your pipeline, a careers page and AI scoring in one product.',
    metaDescription:
      'Zliptal vs Juicebox: PeopleGPT-style sourcing plus a full ATS in one product from {pro}/month, instead of a per-seat search tool that needs another ATS.',
    glance: ['Sourcing and an ATS in one', 'No per-seat search pricing', 'Applicants and prospects in one place'],
    cells: cells([
      p('Free plan; paid plans from $99 per seat/month billed yearly, with credits.'),
      y('Free plan with limited searches.'),
      i('Recruiters and sourcers who need people search'),
      n('Not an ATS. You still need one.'),
      p('Shortlists sourced people, not inbound applicants.'),
      y('Natural-language people search (PeopleGPT).'),
      p('Email outreach; ATS and CRM sync only on the custom Business plan.'),
      n('No hiring pipeline to report on.'),
      y('Quick to start with the free plan.'),
      n('ATS integration limited to its custom Business tier.'),
    ]),
    posts: ['recruiting-software', 'best-applicant-tracking-systems', 'metaview-alternatives'],
    why: 'Juicebox finds candidates, but then you need an ATS to track them, a careers page to attract applicants and a way to review whoever applies. Zliptal does all of it. On Max, TalentGPT lets you describe who you want in plain English and reach out from the same screen where you manage your pipeline.',
    pricing:
      'Juicebox is priced per seat with contact and export credits, from $99 per seat/month billed yearly on Starter, and its ATS and CRM integration is on a custom Business plan. Zliptal is a flat {pro}/month on Pro or {max}/month on Max, with sourcing on Max and unlimited team members.',
    setup:
      'Both are quick to start. The difference is what happens next: with Juicebox you still have to choose, buy and connect an ATS. With Zliptal the applicant tracking is already there.',
    stay: "Stay with Juicebox if you're a dedicated sourcer who needs the deepest people-search and automated outreach agents, and you already have an ATS you are happy with. Zliptal's sourcing is built for a small team's own roles.",
    extra: {
      q: 'Can Zliptal search for candidates the way Juicebox does?',
      a: 'On the Max plan, yes. TalentGPT turns a plain-English description into search filters you can edit, then ranks matching people with a transparent match score. You can add them to lists, email them and convert them into candidates.',
    },
  },
  {
    slug: 'binary',
    name: 'Binary',
    category: 'AI-first ATS for startups',
    blurb: 'Both are built for startups. Zliptal adds sourcing, analytics and referrals.',
    headline: 'Looking beyond Binary? Try Zliptal',
    lead: 'Binary is an AI-first ATS for startups and small teams. Zliptal goes further on the rest of the funnel, with built-in talent sourcing, analytics, video application forms and referrals.',
    metaDescription:
      'Zliptal vs Binary: two ATS options for startups compared on price, AI screening, sourcing and analytics. See what Zliptal adds from {pro}/month.',
    glance: ['Sourcing built in (Max)', 'Analytics and video forms', 'Referral tracking included'],
    cells: cells([
      y('From $49/month with unlimited seats; 25% off yearly.'),
      y('Free plan available.'),
      i('Startups and small to mid-sized teams'),
      y('AI-first ATS with hiring forms.'),
      y('AI screening and review.'),
      p('Lighter sourcing, through a Chrome extension.'),
      p('Lighter CRM and sourcing tools.'),
      i('Not detailed on its pricing page.'),
      y('Migration in about 48 hours, per Binary.'),
      i('Integrations not listed on its pricing page.'),
    ]),
    posts: ['best-applicant-tracking-systems', 'recruiting-software', 'greenhouse-alternatives'],
    why: 'Binary and Zliptal are aimed at the same kind of team, so the choice comes down to what is built in. Zliptal includes TalentGPT sourcing, pipeline analytics, video application forms and candidate referrals, and costs {pro} a month on Pro.',
    pricing:
      'Binary starts at $49 a month with unlimited seats and has a free plan. Zliptal Pro is {pro} a month and Max is {max} a month, with unlimited jobs, candidates and team members, and sourcing and referrals on Max.',
    setup:
      'Both are quick to adopt. Zliptal goes from sign-up to a live job and careers page on the same day, and its AI scores applicants as they arrive without extra configuration.',
    stay: "Stay with Binary if its free plan, its migration help or its MCP server matter to you, or if you only need a light ATS. Zliptal is the better fit when you also want built-in sourcing, analytics and referrals.",
    extra: {
      q: 'How is Zliptal different from other startup ATS tools like Binary?',
      a: 'Zliptal combines applicant scoring with talent sourcing (TalentGPT), pipeline analytics, video application forms, a branded careers page and referrals, so a small team can stay in one product from sourcing to hire.',
    },
  },
  {
    slug: 'seekout',
    name: 'SeekOut',
    category: 'AI talent search',
    blurb: 'SeekOut is a sourcing platform, not an ATS. Zliptal does both for less.',
    headline: 'An ATS with sourcing built in, instead of SeekOut',
    lead: 'SeekOut is an AI talent search platform for sourcers. It does not run your hiring pipeline. Zliptal combines sourcing, applicant scoring, your pipeline and a careers site in one product.',
    metaDescription:
      'Zliptal vs SeekOut: compare a sourcing-only platform with an ATS that includes TalentGPT sourcing, AI scoring and analytics from {pro}/month.',
    glance: ['Sourcing plus an ATS', 'Flat price, unlimited candidates', 'Unlimited team members'],
    cells: cells([
      p('Sourcing Core is $149/month billed annually; higher tiers are quote only.'),
      y('14-day trial of Sourcing Core.'),
      i('Sourcers and recruiting teams'),
      n('Not an ATS. You still need one.'),
      p('AI screening add-on for inbound applicants.'),
      y('AI talent search with contact and export credits.'),
      p('Rediscovery of ATS data on higher tiers.'),
      p('Market intelligence on higher plans.'),
      y('Self-serve trial for Sourcing Core.'),
      p('ATS integration on higher, quote-only tiers.'),
    ]),
    posts: ['recruiting-software', 'best-applicant-tracking-systems', 'metaview-alternatives'],
    why: 'SeekOut is a sourcing platform, so you pair it with an ATS and pay for both. Zliptal is the ATS, the job board, the careers site and, on Max, the sourcing tool, at {pro} or {max} a month.',
    pricing:
      'SeekOut Sourcing Core is $149 a month billed annually for 3 seats with monthly contact and export limits, and the plans that add ATS integration and AI screening are custom and annual. Zliptal Pro is {pro}/month and Max is {max}/month, with unlimited team members.',
    setup:
      'Both are quick to start. With SeekOut you then need an ATS and a way to connect them. With Zliptal, anyone you source can become a candidate in the same pipeline.',
    stay: "Stay with SeekOut if you are a dedicated sourcing team that needs its depth, market intelligence and ATS rediscovery at scale. Zliptal's TalentGPT suits smaller, role-by-role sourcing.",
    extra: {
      q: 'Do I still need an ATS if I use SeekOut?',
      a: 'Yes. SeekOut finds and engages people; it is not where you manage jobs, applications and offers. Zliptal includes both the ATS and sourcing on the Max plan.',
    },
  },
  {
    slug: 'hireez',
    name: 'hireEZ',
    category: 'Outbound sourcing and CRM',
    blurb: 'Outbound sourcing from $494 a month on top of your ATS. Zliptal includes both.',
    headline: 'A simpler alternative to hireEZ',
    lead: 'hireEZ is an outbound sourcing platform that sits on top of your ATS. Zliptal gives a small team the ATS and the sourcing together, for a fraction of the cost.',
    metaDescription:
      'Zliptal vs hireEZ: compare $494/month outbound sourcing with an ATS plus TalentGPT sourcing and AI scoring from {pro}/month.',
    glance: ['{max}/month, not $494', 'Sourcing and ATS together', 'Nothing to integrate'],
    cells: cells([
      p('Solo tier starts at $494/month; enterprise by quote.'),
      y('7-day trial on the solo tier.'),
      i('Recruiters who want outbound sourcing on top of an ATS'),
      n('Sits on top of your ATS; not a standalone ATS.'),
      p('AI screening module.'),
      y('1B+ profiles across 45+ channels, per hireEZ.'),
      y('CRM and ATS rediscovery.'),
      y('Analytics module.'),
      p('Broad module set to configure.'),
      y('40+ native ATS integrations.'),
    ]),
    posts: ['recruiting-software', 'best-applicant-tracking-systems', 'metaview-alternatives'],
    why: 'hireEZ is built for recruiters who already have an ATS and want a large outbound machine on top. If you are a small team without one, Zliptal gives you both for {pro} or {max} a month: your pipeline and careers page, plus TalentGPT sourcing on Max.',
    pricing:
      'hireEZ lists its solo tier from $494 a month and quotes enterprise pricing. Zliptal Max, which adds talent sourcing, is {max}/month and Pro is {pro}/month, each with unlimited jobs, candidates and team members.',
    setup:
      'Zliptal is lighter. hireEZ has many modules to configure and works alongside an ATS. Zliptal is one product with its pipeline, careers page and scoring ready from your first job.',
    stay: "Stay with hireEZ if you run high-volume outbound across many channels, or need 1B+ profile coverage and native integrations with a large ATS. Zliptal's sourcing is scoped for small teams.",
    extra: {
      q: 'Can Zliptal handle outbound recruiting?',
      a: 'On Max, yes at a small-team scale: describe the person you want, review the matches, build lists and send outreach drafted with AI credits. For heavy multi-channel outbound campaigns, a dedicated platform goes further.',
    },
  },
  {
    slug: 'loxo',
    name: 'Loxo',
    category: 'ATS and CRM for agencies',
    blurb: 'Per-user pricing built for agencies. Zliptal is flat and unlimited.',
    headline: 'The flat-priced alternative to Loxo',
    lead: 'Loxo is an ATS and recruiting CRM built for agencies and in-house teams, priced per user. Zliptal is built for companies hiring for themselves, with one flat price for the whole team.',
    metaDescription:
      'Zliptal vs Loxo: compare per-user ATS and CRM pricing with Zliptal at a flat {pro}/month, including AI scoring and sourcing for in-house teams.',
    glance: ['Flat price, not per user', 'Unlimited team members', 'Built for in-house hiring'],
    cells: cells([
      p('Core from $149 per user/month billed annually; fuller plans by demo.'),
      y('7-day trial of the Professional plan.'),
      i('Recruiting agencies and in-house teams'),
      y('ATS and CRM in one.'),
      p('AI search and agents; the fuller set is on Professional.'),
      p('Loxo Source (850M+ talent graph) on Professional.'),
      y('Recruiting CRM included.'),
      i('Not detailed on its pricing page.'),
      y('Free migration for teams of 3 or more seats.'),
      p('API and SSO on higher tiers.'),
    ]),
    posts: ['best-applicant-tracking-systems', 'recruiting-software', 'greenhouse-alternatives'],
    why: 'Loxo is priced per user, so the bill grows with every recruiter, and its sourcing and fuller AI agents sit on a demo-only plan. Zliptal charges one flat price and includes unlimited team members, so founders, hiring managers and interviewers can all use it.',
    pricing:
      'Loxo Core starts at $149 per user per month billed annually, so a team of three is about $447 a month before moving to Professional. Zliptal Pro is {pro} a month and Max is {max} a month for the whole team, with unlimited team members.',
    setup:
      'Yes, for small in-house teams. Loxo is designed around agency workflows and has more to configure. Zliptal is a straightforward pipeline with AI scoring, ready when you publish your first job.',
    stay: "Stay with Loxo if you are a recruiting agency or staffing firm that needs client and placement workflows. Zliptal is for companies hiring for themselves and is not built for agency work.",
    extra: {
      q: 'Is Zliptal suitable for a recruiting agency like Loxo is?',
      a: 'No. Zliptal is designed for in-house hiring, such as founders and hiring managers filling their own roles. It does not have client portals or placement tracking that agencies need.',
    },
  },
  {
    slug: 'teamtailor',
    name: 'Teamtailor',
    category: 'Employer-brand ATS',
    blurb: 'Quote-only and brand-led. Zliptal is flat-priced with a careers page included.',
    headline: 'A simpler, cheaper alternative to Teamtailor',
    lead: 'Teamtailor puts the career site and employer brand first, with pricing by quote. Zliptal gives you a branded careers page, AI applicant scoring and a pipeline for a flat price you can see.',
    metaDescription:
      'Zliptal vs Teamtailor: compare quote-only pricing with Zliptal at {pro}/month, including a branded careers page, AI scoring and sourcing.',
    glance: ['Careers page included', 'Flat, published price', 'AI scoring included'],
    cells: cells([
      n('Quote only.'),
      n('No advertised trial.'),
      i('Companies that compete on employer brand'),
      y('ATS with a career site builder in 50+ languages.'),
      p('AI features such as the Co-pilot add-on.'),
      p('Talent CRM for people who are not ready to apply.'),
      y('Talent CRM included.'),
      y('Reporting included.'),
      p('Demo, then sales-led setup.'),
      y('Interview kits and e-signed offers.'),
    ]),
    posts: ['greenhouse-alternatives', 'best-applicant-tracking-systems', 'recruiting-software'],
    why: 'Teamtailor is a good fit when employer branding is the point, but it is priced by quote and its AI is a separately activated add-on. Zliptal includes a careers page in your brand colours and scores every applicant with written reasons, from {pro} a month.',
    pricing:
      'Teamtailor does not publish its prices and AI Co-pilot is a separately activated add-on. Zliptal publishes both plans: Pro at {pro}/month and Max at {max}/month, with AI scoring on every applicant and unlimited jobs, candidates and team members.',
    setup:
      'Zliptal is lighter to start. Teamtailor is a sales-led product with deep career-site tooling to configure. Zliptal gives you a careers page with your brand colour and open roles live without a developer.',
    stay: 'Stay with Teamtailor if a rich, multilingual career site with employer-brand content is central to how you hire. Zliptal has a clean branded careers page, not a full employer-brand content platform.',
    extra: {
      q: 'Does Zliptal have a careers page like Teamtailor?',
      a: 'Yes. Zliptal includes a careers page in your brand colour with your own headline and every open role, live without a developer. It is simpler than Teamtailor, which is a full career-site builder in 50+ languages.',
    },
  },
  {
    slug: 'jobvite',
    name: 'Jobvite',
    category: 'Talent acquisition suite',
    blurb: 'Modular add-ons built for compliance-heavy teams. Zliptal is one simple plan.',
    headline: 'A simpler, cheaper alternative to Jobvite',
    lead: 'Jobvite is a modular talent acquisition suite for teams with complex compliance needs. Zliptal is one simple plan with an ATS, analytics, a careers site and AI scoring.',
    metaDescription:
      'Zliptal vs Jobvite: compare a quote-only modular suite with one flat plan from {pro}/month, including AI scoring, a careers page and analytics.',
    glance: ['One plan, no add-on stack', 'Published flat price', 'Unlimited team members'],
    cells: cells([
      n('Quote only; a base ATS plus add-ons.'),
      n('Demo and quote form.'),
      i('Talent acquisition teams in regulated industries'),
      y('ATS with automation and a career site.'),
      y('AI candidate matching.'),
      p('Recruitment marketing and CRM tools.'),
      y('Recruiting CRM included.'),
      y('60+ analytics dashboards, per Jobvite.'),
      n('Modular rollout with add-ons.'),
      y('Onboarding with I-9 and E-Verify, referrals and compliance tooling.'),
    ]),
    posts: ['best-applicant-tracking-systems', 'recruiting-software', 'greenhouse-alternatives'],
    why: 'Jobvite is modular: a base ATS plus add-ons, priced by quote, built for teams with complex compliance needs. Zliptal gives a small team the parts it uses every day in one plan, at {pro} or {max} a month, with no add-on stack to price out.',
    pricing:
      'Jobvite does not publish prices; it sells a base ATS with add-ons through a quote form. Zliptal is public: Pro at {pro}/month and Max at {max}/month, with unlimited jobs, candidates and team members.',
    setup:
      'Yes. Jobvite is a modular suite that you configure module by module. Zliptal has one pipeline, a careers page and AI scoring ready from your first job.',
    stay: 'Stay with Jobvite if you need compliance-heavy onboarding such as I-9 and E-Verify, or a broad analytics suite for a large talent acquisition team. Zliptal does not cover onboarding compliance.',
    extra: {
      q: 'Does Zliptal have referrals like Jobvite?',
      a: 'Yes, on the Max plan. Share a referral link for any open role, see who applied through it and track each referrer’s reward.',
    },
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.slug === slug);
}

export const compareSlug = (slug: string) => `zliptal-vs-${slug}`;
export const comparePath = (slug: string) => `/comparisons/${compareSlug(slug)}`;
export const COMPARE_CHECKED = 'November 2026';
