# Blog SEO playbook

How every post in `frontend/content/blog` is built so it can rank in Google and be quoted by AI answers. The rules come from a teardown (2026-09-29) of the pages that rank for "ATS software", "recruiting software", "Ashby alternatives" and "Greenhouse alternatives": SAP, Zapier, greytHR, Metaview, Lever (×2), People Managing People (×2) and SelectSoftware Reviews. The next posts are planned in [`blog-content-plan.md`](blog-content-plan.md).

Run `npm run blog:check` (in `frontend/`) before publishing. It enforces the mechanical rules below: errors exit 1, warnings are targets.

## What the article page already does

You only write markdown. `app/(marketing)/blog/[slug]/page.tsx` adds:

- **Structured data**, one server-rendered `@graph`:
  - `BlogPosting`: author as a `Person` with LinkedIn and X `sameAs` links, `datePublished`, `dateModified`, share image, keywords and word count.
  - `BreadcrumbList`.
  - `ItemList` from numbered H3s ("1. Fluxberry"), with no ratings: review markup on a vendor's own list breaks Google's review-snippet rules.
  - `FAQPage` from the "Frequently asked questions" section.
- **A disclosure under the byline** whenever a numbered H3 is "Fluxberry".
- **"Key takeaways"** from `takeaways`, and **"In this article"** (the table of contents inside the column) on screens without room for the minimap.
- **The author box and "Keep reading"** (three related posts: same category first, then shared keywords).
- **An "Updated" date** when `updated` is later than `date`, and the sitemap's `lastModified` from `updated`.
- **Images** as `<figure>` through next/image, with their size read from the file.

## Front matter

```yaml
title: 'The 9 best Ashby alternatives for startups'   # H1: the reader's words
metaTitle: '9 best Ashby alternatives (2026)'         # <title>, ≤ 48 chars (" · Fluxberry" is added)
description: '120–160 chars, primary keyword early, names 3–5 tools including Fluxberry'
date: '2026-10-06'                                    # first published
updated: '2026-10-06'                                 # bump on every substantive revision
author: 'Sayandeep Das'
category: 'Hiring Tools'                              # Hiring Tools | Integrations | Hiring Tips | Guides
featured: false
keywords: ['ashby alternatives', 'ashby competitors', 'ashby pricing']   # primary first
takeaways:
  - 'Answer-first bullets, 3–5 of them, each a complete sentence that stands on its own.'
```

- The slug is the exact primary keyword, with **no year** (`ashby-alternatives`), so the URL keeps its links across yearly refreshes. Put the year in `metaTitle` for "best" and "alternatives" posts. Evergreen guides ("what is an ATS") skip the year and rely on `updated`.
- Write every Fluxberry price as a token (`{{price:pro:monthly}}`). Never write "free" about Fluxberry: it is paid-only.

## On-page rules (all post types)

1. **The answer comes in the first screen.** Open with 2–3 sentences, then the answer: a definition, a quick-picks list or an at-a-glance table. Never open with a long preamble.
2. **Use the primary keyword** in the title, the first 120 words and at least one H2. Use synonyms elsewhere (ATS / applicant tracking system / recruiting software / hiring software / recruitment platform). Don't repeat the exact phrase unnaturally.
3. **Keep the heading hierarchy H2 → H3, and never H4.** H4s drop out of the table of contents and the minimap. Use question headings where a reader would ask one ("What does an ATS do?"), each answered in the first 40–60 words beneath it.
4. **Repeat labelled blocks.** In lists, every entry uses the same labels in the same order (**Best for:**, **Pricing:**, pros and cons). Machines parse repeated labels well, and readers skim them.
5. **Use one real table at least.** At a glance for lists; Factor | What to consider for guides. Keep cells short and uniform.
6. **Link to at least 2 other posts in context**, not just in "Keep reading". Link competitor names to our integration or alternatives post about that competitor.
7. **Cite what you claim.** Link every competitor capability, price or integration count to the vendor's own page, and date prices ("as of October 2026"). No unsourced statistics. If you can't source it, cut it or say it plainly without numbers.
8. **Say what's true of competitors today.** Before publishing, check each claim that a competitor "doesn't" do something against its current product pages. In September 2026 four of our posts said Greenhouse, Ashby, Lever and SuccessFactors had no AI screening; all four do.
9. **Include Fluxberry honestly.** Place it where it genuinely fits a segment. Say what it doesn't do (no interview recording, no native integrations yet; hires reach other systems through webhooks and an automation tool). Never invent customers, integrations, assessments, test results or scale.
10. **Answer 4–6 questions in the FAQ**, each an H3 under `## Frequently asked questions`. The first sentence answers directly. Include the "What is the best X?" question, answered with named picks for named situations.
11. **End with one CTA section** ("Try Fluxberry for …") before the FAQ, linking `/sign-up`. Don't sprinkle CTAs through the body.

## Images

The pages that rank use real product screenshots (Zapier, SSR, Metaview) and the occasional diagram (SAP). Our covers are coded scenes, hidden from assistive tech and invisible to image search, so each post needs its own images in the body.

- **Where:** `frontend/public/blog/<slug>/<descriptive-kebab-name>.webp`. WebP, about 1600px wide, under 200 KB.
- **Markdown:** `![Alt text describing what is on screen](/blog/<slug>/name.webp "Visible caption, optional")`, on its own line.
- **Alt text** says what the image shows, in under 125 characters: "Candidate pipeline inside Fluxberry with AI scores beside each applicant". Don't keyword-stuff ("X screenshot - 10 best …"), and never leave it empty.
- **What to use:**
  1. Fluxberry screenshots from a seeded workspace.
  2. Our own screenshots of competitors taken in trials or demos. Say so in the caption: first-hand evidence is the strongest trust signal.
  3. Original diagrams and charts, for example "cost of a per-seat ATS vs a flat plan at 5, 15 and 50 users". Original data earns links.
  4. Vendor press-kit images, credited in the caption.
- **Don't** hotlink vendor images, or use third-party logos in covers (see the covers registry rule).
- Add every new post to `components/marketing/blog/covers/registry.tsx`, or it gets the fallback cover.

## Templates by post type

### "X alternatives" (Ashby, Greenhouse, Lever, Metaview)
Modelled on Metaview's Ashby page (depth, fairness) and PMP's Greenhouse page (shortlist, methodology, switching reasons), plus the gaps they leave.

1. **Intro:** one fair sentence on what X does well, who should switch and who shouldn't.
2. `## The N best X alternatives at a glance`: a table (Tool | Best for | Starting price | Pricing model).
3. `## Why teams look for X alternatives`: 4–5 sourced reasons, and credit X's real strengths.
4. `## How we chose`: the criteria, where facts came from (vendor pages, docs, trials), the date checked.
5. One `### N. Tool` per entry. **Best for:**, an overview with a "Compared with X, …" sentence, key features, **Pros:** and **Cons:** (Fluxberry included), **Pricing:** with source and date, and a switching note.
6. `## X alternatives by use case`: an "If you want … → pick …" table.
7. `## What to match before you switch`: X's key features as a parity checklist.
8. `## How to switch from X`: what exports, what doesn't, the timeline, running both in parallel. None of the ranking pages have this.
9. `## When to stay on X`: the honest counterweight.
10. The CTA section, then the FAQ ("Is X an ATS?", "How much does X cost?", "What is the best X alternative for a small team?", "Can I migrate from X?").

### "Best X software" (ATS, recruiting software)
Modelled on Zapier (a "Best for …" H2 per tool) and PMP and SSR (buyer's guide around the list).

1. **Intro** (2–3 sentences, who it's for), then a quick-picks list of "Tool for use case" jump links.
2. `## The best X at a glance`: Tool | Best for | Standout feature | Starting price | Pricing model.
3. `## What makes a good X`: the criteria.
4. One `## Best X for <use case>` H2 per tool, each with a `### Tool` H3 (Zapier's pattern, which captures "best X for Y" long tails).
5. Buyer's guide: what it is (40–60 words), features by hiring stage, a pricing table by tier, how to choose (Factor | What to consider), how to implement (numbered steps).
6. FAQ, CTA.

### Pillar guide ("What is an ATS")
Modelled on SAP.

1. A one-sentence definition straight under the H1, then a 40–60 word definition under the first H2.
2. Question H2s, in People Also Ask order: what it does, who uses it, why it matters, how it works, ATS vs CRM vs HRIS, what to look for, when to get one, when to switch.
3. One process diagram. Link out to every spoke post.

### Integrations ("Tools that integrate with X")
The existing seven posts use this template.

1. Intro, `## X integrations at a glance` table, `## How X integrations work`.
2. Category H2s with tool H3s. **Best for:** on each.
3. CTA, FAQ.

## Refreshing

- **Re-check prices, counts and capability claims every quarter**, and whenever a vendor ships something big. Bump `updated` only for substantive changes: Google compares the date with what changed.
- **Regenerate charts with prices baked in** (`ats-monthly-cost-comparison.webp`, from `frontend/scripts/blog-images/chart.py`) whenever a price changes, including Fluxberry's.
- **Keep the slug and H1 stable.** Change `metaTitle` for the new year.
- **After a refresh, confirm the Vercel production deployment finished**, then request reindexing of the URL in Search Console.
