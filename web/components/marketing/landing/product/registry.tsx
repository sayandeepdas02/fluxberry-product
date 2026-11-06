'use client';

import type { CoverSpec } from '@/components/marketing/blog/covers/registry';
import type { ProductVisualKind } from '../content';
import { AnalyticsScene } from './analytics';
import { CareersScene } from './careers';
import { ReferralsScene } from './referrals';
import { SourcingScene } from './sourcing';
import { TrackingScene } from './tracking';
import { VideoFormsScene } from './video-forms';

export interface ProductCoverSpec extends CoverSpec {
  /** The scene's text alternative: what a sighted visitor sees, for assistive tech and image search. */
  label: string;
}

/**
 * The Product cards' covers: the blog's cover frame (painted sky, cover line, one live scene)
 * with a scene per product. The cover line adds to the card's title, so it never repeats it.
 * No em dashes in a cover line.
 */
export const PRODUCT_COVERS: Record<ProductVisualKind, ProductCoverSpec> = {
  tracking: {
    lines: ['Every candidate,', 'one pipeline.'],
    sky: { x: 50, y: 0, zoom: 1.3 },
    Scene: TrackingScene,
    label:
      'A live job on the job board and its hiring pipeline: a new applicant with an AI match score of 92 moves from Applied through Screening and Interview to Offer.',
  },
  analytics: {
    lines: ['Know where', 'hiring slows down.'],
    sky: { x: 20, y: 0, zoom: 1.6, flip: true },
    Scene: AnalyticsScene,
    label:
      'A hiring analytics dashboard with applicants, time to hire and offer rate, a pipeline conversion funnel from Applied to Offer, and a rising weekly applicants chart.',
  },
  'video-forms': {
    lines: ['Hear them out', 'before the call.'],
    sky: { x: 80, y: 0, zoom: 1.5 },
    Scene: VideoFormsScene,
    label:
      'An application form asking a video question: the candidate records a 42 second answer with a live timer, and the form shows the video answer as saved.',
  },
  sourcing: {
    lines: ['Describe the hire,', 'meet the match.'],
    sky: { x: 35, y: 0, zoom: 1.45 },
    Scene: SourcingScene,
    label:
      'A talent sourcing search typed in plain English, returning three matching engineers with match scores of 94, 89 and 85 percent and a Reach out button.',
  },
  careers: {
    lines: ['Your brand,', 'your careers page.'],
    sky: { x: 65, y: 0, zoom: 1.7, flip: true },
    Scene: CareersScene,
    label:
      'A company careers page in a browser window with open roles and Apply buttons, whose brand color changes between blue, violet, teal and orange.',
  },
  referrals: {
    lines: ['Your network,', 'your next hire.'],
    sky: { x: 100, y: 0, zoom: 1.4 },
    Scene: ReferralsScene,
    label:
      'A referral link for a Senior Designer role being copied, then a referred candidate appearing in the referrals list with a reward that goes from pending payout to paid.',
  },
};
