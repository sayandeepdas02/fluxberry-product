---
title: '9 Lever integrations across the hiring stack'
description: 'Lever supports 300+ integrations across sourcing, scheduling, assessment, and analytics. Here are the strongest tools in each category.'
date: '2026-09-24'
updated: '2026-09-30'
author: 'Sayandeep Das'
category: 'Integrations'
featured: false
keywords:
  - 'lever integrations'
  - 'tools that integrate with lever'
  - 'lever marketplace'
  - 'lever ats integrations'
  - 'lever api'
takeaways:
  - 'Lever lists 300+ integrations. The useful ones cover sourcing, outreach, scheduling, assessments and reporting.'
  - 'Prefer integrations that write back to the Lever record; a tool you have to check in a separate dashboard defeats the purpose.'
  - 'Lever now screens applicants itself, with AI fit scores and a written justification, so add outside screening only if it works differently.'
  - 'Fluxberry connects to Lever through signed webhooks and an automation tool, not a native app.'
---

Lever is a recruiting-focused ATS and CRM that handles pipeline management, scheduling, and candidate nurturing. Its strength is the candidate relationship layer — tracking touchpoints across time, not just managing a single application. But no ATS does everything, and Lever's [integration marketplace](https://marketplace.lever.co/) of 300+ integrations exists because teams need specialised tools at every stage of the funnel.

This guide covers nine Lever integrations across five categories, chosen for the depth of their integration and the problem they solve. On Greenhouse or Ashby instead? See our [Greenhouse integrations](/blog/tools-that-integrate-with-greenhouse) and [Ashby integrations](/blog/tools-that-integrate-with-ashby) guides.

## Lever integrations at a glance

| Tool | Category | Best for |
|---|---|---|
| Fluxberry | Sourcing and AI screening | Scoring applicants on your own careers page before Lever |
| Gem | Sourcing | High-volume outbound sourcing on LinkedIn |
| Sense | Outreach and engagement | Automated candidate nurturing at scale |
| GoodTime | Scheduling | Multi-round and panel interviews |
| Zoom | Interviews | Video interview links and recordings |
| TestGorilla | Assessment | Skills tests for non-traditional candidates |
| CoderPad | Assessment | Live coding interviews |
| Google Sheets | Analytics | Custom reporting and board dashboards |
| Zapier | Automation | Connecting tools with no native integration |

## How Lever integrations work

Lever integrations connect through its REST API and partner ecosystem. Most fall into two patterns:

1. **Bidirectional sync.** Candidate data flows both ways — a sourcing tool pushes candidates into Lever, and stage changes in Lever trigger actions in the connected tool. This is the strongest integration pattern.

2. **One-way push.** Data flows from the external tool into Lever (or vice versa) but not back. Common for scheduling tools that read availability but do not write pipeline updates.

The best Lever integrations reduce tab-switching without creating data silos. Lever should remain the single view of every candidate's status — external tools feed into it, not around it.

## Sourcing and candidate discovery

### 1. Fluxberry

Fluxberry is an AI-native hiring platform that scores every applicant against your job requirements on arrival. Lever has AI screening of its own: its [AI-powered screening](https://www.lever.co/solutions/ai-powered-screening) gives applicants a fit score with a written justification. Fluxberry works before Lever instead: candidates apply on Fluxberry's careers page and are scored, summarised and ranked there, and only the shortlist moves on to Lever.

**How it connects:** There is no native Lever integration yet. Fluxberry runs its own pipeline and careers page, and sends a signed webhook when a candidate is shortlisted, changes stage or is hired. Route those events into Lever with an automation tool such as Zapier or Make, or a short script against Lever's API, and your shortlist reaches Lever without anyone rereading resumes. Lever stays the pipeline owner; Fluxberry handles the screening work.

**Why it fits Lever teams:**
- Lever's strength is nurturing relationships over time; Fluxberry keeps the first-pass triage out of it, with strengths and concerns written up for every applicant
- Custom application questions and a careers page are included, so there is one fewer tool to run
- Every plan includes unlimited team members, so small teams can add screening without paying per seat

**Pricing:** Starts at {{price:pro:monthly}}/month. [Get started with Fluxberry →](/sign-up)

### 2. Gem

Gem is a sourcing and outreach platform that layers on top of LinkedIn and email. Its Lever integration syncs sourcing activity (who was contacted, when, and what the response was) back to the candidate record, so recruiters do not lose context when a sourced candidate enters the pipeline.

**Best for:** Teams doing high-volume outbound sourcing on LinkedIn who want all touchpoints visible in Lever.

## Outreach and engagement

### 3. Sense

Sense provides candidate engagement automation — drip sequences, event invitations, and re-engagement campaigns. Its Lever integration triggers sequences based on pipeline stage changes and syncs engagement data back to candidate profiles.

**Best for:** High-volume hiring teams (staffing agencies, large talent teams) that need automated nurturing at scale.

## Scheduling and interviews

### 4. GoodTime

[GoodTime](https://goodtime.io/) automates complex interview scheduling — panel interviews, multi-day onsites, interviewer load balancing and automatic replacement when an interviewer drops out. It syncs both ways with Lever, so interview plans come from Lever and booked slots go back to the candidate record. It is priced on the number of candidates a year rather than per user. If you are looking for Prelude, Calendly [acquired it in 2022](https://calendly.com/newsroom/press-release/calendly-acquires-prelude).

**Best for:** Teams with multi-round interview processes and panel interviews where scheduling coordination is a bottleneck.

### 5. Zoom

Zoom's Lever integration generates unique meeting links for every interview and attaches them to the Lever event. When the meeting ends, a recording link is added to the candidate record. Simple, but it removes a manual step from every interview.

**Best for:** Any team conducting video interviews through Lever who wants automatic link generation and recording attachment.

## Assessment and screening

### 6. TestGorilla

TestGorilla provides pre-employment assessments across cognitive ability, personality, language, and role-specific skills. Its Lever integration sends assessments when candidates reach a designated stage and writes scores back to the candidate record.

**Best for:** Teams that want skills-based screening before the interview stage, especially for roles where traditional resume signals are weak (career changers, self-taught candidates, non-traditional backgrounds).

### 7. CoderPad

CoderPad provides collaborative coding environments for technical interviews — live pair programming sessions with a shared editor, test runner, and drawing board. Its Lever integration creates CoderPad sessions linked to Lever interviews and stores session recordings in the candidate record.

**Best for:** Engineering teams that conduct live coding interviews and want session data tied to the Lever pipeline.

## Analytics and automation

### 8. Google Sheets

Lever's Google Sheets integration exports pipeline data for custom reporting. It is not glamorous, but it is the most flexible analytics option for teams that need custom views Lever's built-in reports do not provide.

**Best for:** Hiring managers and ops teams who want custom dashboards, board-level reporting, or analysis that combines hiring data with other business metrics.

### 9. Zapier

Zapier connects Lever to 5,000+ apps through no-code workflows. Common use cases: post a Slack message when an offer is accepted, add new hires to an onboarding checklist in Asana, or update a headcount tracker in Airtable.

**Best for:** Teams that need Lever connected to tools without native integrations, or that want custom automations without engineering resources.

## How to choose the right Lever integrations

Three questions to guide your stack:

1. **Where are your recruiters spending time on work a tool could handle?** If they spend two hours a day reading applications, a screening tool pays for itself immediately. If scheduling is the bottleneck, start there.

2. **Does the integration write back to Lever?** The best integrations enrich the Lever record. A tool that requires you to check a separate dashboard defeats the purpose.

3. **Does it overlap with something Lever already does?** Lever has native scheduling, email sequences, reporting, and AI fit scores for applicants. Only add external tools when they are meaningfully better than the native feature.

## Start with sourcing: add Fluxberry

Most Lever teams have good pipeline management and scheduling. If the pressure is at the top, too many applicants and not enough signal on who to talk to first, Fluxberry takes the first pass: every candidate is scored, with the reasoning written up, before they enter your Lever pipeline.

[Create your Fluxberry workspace](/sign-up) and run it alongside Lever.

## Frequently asked questions

### How many integrations does Lever support?

Lever's [marketplace](https://marketplace.lever.co/) lists 300+ integrations across sourcing, assessment, scheduling, HRIS, background checks, and automation. The depth varies — some are full bidirectional syncs, others are lightweight one-way data transfers.

### Can I use Fluxberry as my ATS and replace Lever?

Yes. Fluxberry includes full pipeline management, a careers page, team collaboration, and analytics. If Lever's pricing is too high for your team's size, Fluxberry covers the full workflow from {{price:pro:monthly}}/month. For more options, see the [best applicant tracking systems for small businesses](/blog/best-applicant-tracking-systems).

### What is the best free Lever integration?

Zoom (for interview links), Google Sheets (for custom reporting), and Zapier's free tier (for basic automations) are all available at no additional cost. AI-powered screening is a paid add-on: [Fluxberry](/sign-up) starts at {{price:pro:monthly}}/month.
