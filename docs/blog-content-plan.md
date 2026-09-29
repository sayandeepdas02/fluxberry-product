# Blog content plan: the next four posts

**Status (2026-09-30):** all four are written and dated 17, 20, 26 and 28 September 2026. Images are in `frontend/public/blog/<slug>/`; their sources are in `frontend/scripts/blog-images/`.

These are planned 2026-09-29 from a teardown of the pages that rank for the terms we want: SAP, Zapier, greytHR, Metaview, Lever (Ashby and Greenhouse alternatives), People Managing People (PMP; Greenhouse competitors and recruiting software) and SelectSoftware Reviews (SSR). Every post follows [`blog-seo-playbook.md`](blog-seo-playbook.md) and must pass `npm run blog:check`.

Search volumes weren't measured, because no keyword tool was available. The keyword choices follow what the ranking pages target. Confirm them in Google Keyword Planner or Ahrefs, and in Search Console once the posts are live.

## What wins these searches

- **The answer comes in the first screen.** Every ranking page does this: a definition (SAP), quick picks within about 100 words (Zapier, PMP, SSR), or a key-takeaways box and a "Best for" table (Metaview).
- **Labelled blocks repeat for every tool.** Best for, overview, features, pros, cons, pricing, in the same order each time.
- **Trust signals:**
  - a named author with credentials (PMP swapped a content producer's byline for a recruiter's in September 2026)
  - a methodology section
  - dated prices and a visible "Last updated" date
  - a changelog (SSR)
  - first-hand testing evidence (SSR "applied as a candidate through every ATS")
  - candid cons for every tool
- **Fairness beats attack.** Metaview ranks #2 for "Ashby alternatives" by praising Ashby and putting itself first with the same template as everyone else. Lever's one-sided pages rank on domain authority, which we don't have.
- **Gaps nobody fills:**
  - a real guide to switching from the incumbent
  - "when to stay"
  - cost of ownership at realistic team sizes (per-seat vs flat pricing)
  - AI screening explained properly: bias audits, explainability, NYC Local Law 144, the EU AI Act

  These are where a vendor with a transparent AI score can out-write the affiliates.

## Where Fluxberry wins, honestly

Say these, because they're true (see `docs/ai.md` and `lib/pricing.ts`):
- **AI screening you can read.** Every applicant gets a 0–10 score built from fixed weights (skills 35%, experience 20%, relevance 20%, location 10%, compensation 10%, education 5%), with a written summary, strengths and concerns. Ashby's AI marks criteria met or not met and deliberately doesn't rank applicants. Greenhouse's and Lever's rank, but their weights aren't public in this form.
- **Flat price, unlimited team members.** Pro $39/month and Max $59/month (September 2026; `lib/pricing.ts` is the source, and posts write them as `{{price:…}}` tokens), against per-seat or headcount-tier pricing: Ashby's Foundations plan from $300/month (1–10 employees) to $900/month (76–100), Workable from $299/month, Greenhouse quote-only (checked September 2026).
- **One tool for small teams:** ATS, careers page, analytics and Google Calendar interviews. Max adds sourcing and referrals.

Say these as well, because the credibility depends on it:
- no native integrations (webhooks and an automation tool instead)
- no interview recording
- no free plan or trial
- a young product with no customer logos

## Order and cadence

| # | Post | Slug | Why this order |
|---|---|---|---|
| 1 | The 9 best Ashby alternatives | `ashby-alternatives` | The weakest results page of the four (Lever and Metaview on top), and Ashby's buyers (startups) are ours |
| 2 | The 10 best Greenhouse alternatives | `greenhouse-alternatives` | High intent to switch; reuses the research and structure from #1 |
| 3 | The best applicant tracking systems for small businesses | `best-applicant-tracking-systems` | The money page for "ATS software"; by now #1 and #2 can link to it |
| 4 | Recruiting software by type | `recruiting-software` | The pillar for "recruiting / recruitment / hiring software"; links to every other post |

Publish one a week. When each goes live, add links to it from the older posts. For example, once #2 is published, the Greenhouse integrations post should link "Greenhouse alternatives".

After these, next in line:
1. "What is an applicant tracking system?" (SAP's format). Note that job seekers dominate that search, so it's for topical authority more than leads.
2. A "Fluxberry vs Greenhouse / Lever / Ashby" series, which fills the nav's locked Comparisons item.
3. "Lever alternatives".

## Before writing: prerequisites

1. **Screenshots.** Make a seeded Fluxberry workspace, then capture:
   - the pipeline with AI scores
   - a candidate's score breakdown with strengths and concerns
   - the careers page
   - analytics
2. **First-hand competitor evidence.** Sign up for the trials that exist (Workable, Breezy HR, Teamtailor, Zoho Recruit and others) and note what you actually did. Ashby, Greenhouse and Lever are demo-only; describe them from their own pages and say so. Never claim tests that didn't happen.
3. **Migration sections.** CSV import of candidates and jobs exists in the API (`bulk-import.service.ts`) but has no screen in the app. Either ship an import screen, or write the switching sections around running both tools in parallel (new roles in Fluxberry, old ones closing out in the incumbent) and exporting from the incumbent.
4. **Fact-checking.** Check every competitor's price, trial, integration count and AI capability on its own site on the day of writing. Cite it with the date.
5. **The domain.** fluxberry.in is a country-code domain, and Google treats it as aimed at India. All four target searches are dominated by US results. Before investing heavily, decide whether the blog should live on a generic domain (.com, .ai), or stay on .in and add India-specific sections: INR pricing, Naukri, DPDP Act. greytHR ranks in India on exactly that localisation.

---

## Post 1: Ashby alternatives

- **H1:** The 9 best Ashby alternatives for startups and small teams
- **metaTitle:** 9 best Ashby alternatives (2026)
- **Slug:** `ashby-alternatives`
- **Description (draft):** Ashby is powerful but priced for scaling teams. Compare 9 Ashby alternatives, including Fluxberry, Greenhouse, Lever and Workable, with prices and who each suits.
- **Keywords:** ashby alternatives (primary), ashby competitors, ashby pricing, ashby vs greenhouse, ashby vs lever, cheaper alternative to ashby
- **Intent:** commercial investigation, from teams evaluating Ashby or leaving it.
- **Length:** about 3,000–3,500 words.
- **Category:** Hiring Tools.

**Angle.** Ashby is excellent for analytics-led, scaling tech teams; say so first. The alternatives are for three kinds of team:
- teams for whom $300–$900 a month (its Foundations plan, priced by headcount up to 100 employees) is a lot
- teams that don't need its analytics depth
- teams that want AI that ranks applicants rather than marking criteria met or not met

The Lever and Metaview pages don't cover pricing at small-team sizes or migration at all.

**Outline**
1. Intro, 3 sentences: what Ashby does best, and who should look elsewhere.
2. `## The 9 best Ashby alternatives at a glance`: Tool | Best for | Starting price | Pricing model.
3. `## Why teams look for Ashby alternatives`, with sourced reasons:
   - the price floor and add-ons (SMS packs, SSO at $100/month on its pricing page)
   - configuration depth for a small team
   - AI review that doesn't rank
   - teams that want a CRM-first workflow
4. `## How we chose`: the criteria (core ATS, AI screening, price at 3/10/25 users, setup time, integrations), sources and the date checked.
5. `## Ashby alternatives`, one H3 per tool. Proposed list, to be verified:
   1. **Fluxberry**: best for small teams that want ranked, explainable AI screening at a flat price.
   2. **Greenhouse**: best for structured hiring at scale.
   3. **Lever**: best for candidate relationships (ATS plus CRM).
   4. **Workable**: best all-rounder for SMBs with job-board reach ($299/month Standard).
   5. **Gem**: best for sourcing-led teams (ATS, CRM and sourcing).
   6. **Teamtailor**: best for employer branding.
   7. **Pinpoint**: best for in-house talent teams wanting a polished candidate experience.
   8. **Breezy HR**: best on a tight budget.
   9. **Zoho Recruit**: best if you already use Zoho.

   Each entry covers: **Best for:**; a "Compared with Ashby, …" sentence; key features; **Pros:** and **Cons:**; **Pricing:** (source and date); and **Switching from Ashby:**.
6. `## Ashby alternatives by use case`: an "If you want … pick …" table.
7. `## What to match before you leave Ashby`: a parity checklist:
   - analytics and reporting
   - scheduling
   - structured scorecards
   - AI-assisted review
   - CRM and nurture
   - the integrations you rely on
8. `## How to switch from Ashby`: export, what carries over, the parallel-run plan, timeline.
9. `## When to stay on Ashby`.
10. `## Try Fluxberry as your Ashby alternative`: the CTA.
11. FAQ.

**FAQ**
- What is the best alternative to Ashby?
- Is Ashby an ATS?
- How much does Ashby cost?
- Is Ashby good for small startups?
- Does Ashby have AI screening?
- Can I move my candidates from Ashby to another ATS?

**Images**
- `fluxberry-ai-scored-pipeline.webp`: "Fluxberry pipeline with an AI score beside each applicant".
- `fluxberry-score-breakdown.webp`: "Fluxberry candidate score broken down into skills, experience and relevance".
- `ats-monthly-cost-by-team-size.webp`: an original chart of monthly cost at 3, 10 and 25 hiring-team members for each tool with public prices; quote-only tools marked. This is the page's link magnet.
- Our own trial screenshots of 2–3 competitors, credited.

**Links**
- Out to: [tools-that-integrate-with-ashby](/blog/tools-that-integrate-with-ashby), [metaview-alternatives](/blog/metaview-alternatives), [how-to-improve-recruitment-process](/blog/how-to-improve-recruitment-process), and posts 2–4 once they exist.
- Back to this post: the Ashby integrations post, from its "Can I use Fluxberry instead of Ashby?" FAQ.

**Cover:** the lanes scene from the Metaview cover, or a new "Ashby → nine exits" scene. No logos.

---

## Post 2: Greenhouse alternatives

- **H1:** The 10 best Greenhouse alternatives for small and growing teams
- **metaTitle:** 10 best Greenhouse alternatives (2026)
- **Slug:** `greenhouse-alternatives`. PMP ranks with "competitors" in the slug and "alternatives" in the title; we take "alternatives" and cover "competitors" in the body and FAQ.
- **Description (draft):** Greenhouse is the structured-hiring standard, with quote-only pricing. Compare 10 Greenhouse alternatives by price, AI screening and fit for smaller teams.
- **Keywords:** greenhouse alternatives (primary), greenhouse competitors, greenhouse pricing, greenhouse alternatives for small business, cheaper than greenhouse, greenhouse vs lever
- **Length:** about 3,500 words.

**Angle.** Credit Greenhouse's structured hiring, its 400+ integrations and its Real Talent matching. The reasons teams look elsewhere:
- quote-only pricing
- admin overhead for teams without a recruiting-ops person
- paying for depth they don't use

Make this post clearly different from post 1, so the two don't compete for the same searches:
- the parity checklist is about *structured hiring* (interview kits, scorecards, approvals, offer workflows)
- the audience is a 20–200-person company
- the tool mix differs

**Outline:** the same template as post 1, with these changes:
- a `## What is Greenhouse?` definition near the top (PMP does this)
- a longer parity section, `## Greenhouse features to match`
- `## When Greenhouse is still the right choice`

**Tools, to be verified:**
1. Fluxberry: best for small teams replacing Greenhouse with AI screening built in.
2. Ashby: best for analytics-led scaling teams. Don't leave it out; Lever's page omits Ashby and is weaker for it.
3. Lever: best for CRM-led recruiting.
4. Workable: best for SMBs that need job-board reach.
5. Teamtailor: best for employer brand.
6. Pinpoint: best for in-house talent teams.
7. JazzHR: best for budget SMB hiring.
8. Recruitee: best for collaborative hiring in Europe.
9. Breezy HR: best for simple pipelines.
10. Manatal: best for low per-user pricing.

**FAQ**
- What is the best Greenhouse alternative?
- How much does Greenhouse cost?
- Is Greenhouse good for small businesses?
- Does Greenhouse have AI screening? (Yes: Real Talent, June 2025.)
- What is cheaper than Greenhouse?
- How do I migrate from Greenhouse?

**Images**
- the Fluxberry scored pipeline, and structured-feedback screens
- `greenhouse-feature-parity-checklist.webp` (a designed version of the parity table)
- the cost-by-team-size chart, reused with Greenhouse's row marked "quote only"

**Links:** [tools-that-integrate-with-greenhouse](/blog/tools-that-integrate-with-greenhouse) (link the word "Greenhouse" in context), post 1, posts 3–4.

---

## Post 3: Best applicant tracking systems for small businesses

- **H1:** The 10 best applicant tracking systems for small businesses and startups
- **metaTitle:** 10 best ATS for small businesses (2026)
- **Slug:** `best-applicant-tracking-systems` (Zapier's slug, no year)
- **Description (draft):** The 10 best applicant tracking systems for small teams in 2026, compared on price, AI screening and ease of setup, with a buyer's guide to choosing one.
- **Keywords:** best applicant tracking systems (primary), best ats software, ats for small business, applicant tracking system for startups, ai applicant tracking system, ats pricing, hiring software for small business
- **Length:** about 4,000–4,500 words.
- **Category:** Guides.

**Angle.** Zapier's format: one `## Best ATS for <use case>` H2 per tool, which captures "best ATS for X" searches. Around the list sits PMP and SSR's buyer's guide. We own the AI section: how AI screening works, why an explainable score matters, and bias-audit and legal context (NYC Local Law 144, EU AI Act), cited from the official texts.

**Outline**
1. Intro, then quick picks as a jump-link list of "Tool for use case" items.
2. `## The best applicant tracking systems at a glance`: Tool | Best for | Standout feature | Starting price | Pricing model.
3. `## What makes a good ATS for a small team`: the criteria.
4. One H2 and H3 per tool:
   1. Best ATS with explainable AI screening → Fluxberry
   2. Best for structured hiring → Greenhouse
   3. Best for analytics-led startups → Ashby
   4. Best ATS and CRM → Lever
   5. Best all-rounder for SMBs → Workable
   6. Best for employer branding → Teamtailor
   7. Best inside an HR suite → BambooHR
   8. Best for sourcing-heavy teams → Gem
   9. Best on a budget → Breezy HR
   10. Best in the Zoho stack → Zoho Recruit
5. Buyer's guide:
   - `## What is an applicant tracking system?` (a 40–60 word answer)
   - `## ATS features by hiring stage`
   - `## How AI screening works (and what to ask vendors)`
   - `## How much does an ATS cost?`: a table of pricing models and tiers, with sources
   - `## How to choose an ATS`: a Factor | What to consider table
   - `## How to set up an ATS in your first week`: numbered steps
6. CTA, then FAQ.

**FAQ**
- What is the best ATS for a small business?
- How much does an applicant tracking system cost?
- Do small companies need an ATS?
- What is the difference between an ATS and an HRIS?
- Is AI resume screening fair?
- What is the easiest ATS to set up?

**Images**
- one screenshot per tool: ours for Fluxberry, our own trial screenshots or press-kit images for the rest, credited
- `how-an-ats-works.webp`: an original diagram, apply → parse → score → pipeline → interview → offer
- `ats-pricing-models.webp`: per seat, per job, per employee and flat, compared

**Links**
- Out to: posts 1, 2 and 4; all five integration posts (from the "integrations" criterion); the hiring-process guide.
- Back to this post: the hiring-process guide's "move to a proper ATS" line.

---

## Post 4: Recruiting software by type

- **H1:** Recruiting software: the 8 types, what they cost and the best tools for each
- **metaTitle:** Best recruiting software by type (2026)
- **Slug:** `recruiting-software` (the head term, as PMP uses)
- **Description (draft):** What recruiting software does, the 8 types from sourcing to background checks, what each costs, and the best tools for each, for teams building a hiring stack.
- **Keywords:** recruiting software (primary), recruitment software, hiring software, recruiting tools, recruitment platform, types of recruiting software, recruiting software cost
- **Length:** about 3,500–4,500 words.
- **Category:** Guides.

**Angle.** This is the hub. SSR organises its buyer guide by recruiting stage; do the same, and it stays a different kind of page from post 3's ATS-only list. For each type give:
- what it does, in 40–60 words
- when you need it
- 2–3 tools with "Best for" lines
- the typical pricing model
- a link to our deeper post

End with stack recipes by team size. Be honest that Fluxberry isn't built for staffing agencies.

**Outline**
1. Intro, then `## What is recruiting software?` (a 40–60 word definition), then `## The 8 types of recruiting software at a glance` (Type | What it does | Example tools | Typical price model).
2. One H2 per type:
   - sourcing
   - ATS
   - AI screening
   - CRM and nurture
   - interview scheduling
   - assessments
   - interview intelligence (link [metaview-alternatives](/blog/metaview-alternatives))
   - background checks and offers (link the integration posts)
3. `## All-in-one or best-of-breed?`: a decision table by team size and hiring volume.
4. `## Recruiting software stacks by team size`: a 5-person startup, a 50-person company with one recruiter, and a 200-person company with a talent team.
5. `## How much does recruiting software cost?`
6. `## How to choose recruiting software`
7. CTA, then FAQ.

**FAQ**
- What is the best recruiting software?
- What is the difference between recruiting software and an ATS?
- How much does recruiting software cost?
- What recruiting software do small businesses use?
- Can AI replace recruiters?

**Images**
- `recruiting-software-stack-by-stage.webp`: a diagram of the eight types along the hiring funnel
- a stack-recipe graphic per team size
- 3–4 product screenshots

**Links:** every other post. This is the page the rest link up to.

---

## Also fix: the blog index page

The index (`app/(marketing)/blog/page.tsx`) targets none of these terms, and its copy promises content that doesn't exist:
- The H1 is "Insights on hiring AI Talent", which reads as hiring AI engineers.
- The description is "Case Studies, discussions, blogs, notes on hiring the best AI talent with Fluxberry". There are no case studies.
- The `<title>` is just "Blog".

Suggested copy:
- **Title:** "Hiring and recruiting software blog"
- **H1:** "Guides to hiring and recruiting software"
- **Description:** "Guides to applicant tracking systems, recruiting software and running a faster hiring process, from the team building Fluxberry."

This copy is left for the owner to approve, since it is visible marketing copy.
