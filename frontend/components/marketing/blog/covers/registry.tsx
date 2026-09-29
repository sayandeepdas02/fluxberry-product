'use client';

import type { ReactNode } from 'react';
import type { VisualState } from '@/components/marketing/landing/stage';
import { HiringProcessScene } from './hiring-process';
import { ToolSortScene } from './tool-sort';
import { HubScene } from './hub';
import { FunnelScene } from './funnel';
import { EventStreamScene } from './event-stream';
import { StackScene } from './stack';
import { SystemOfRecordScene } from './system-of-record';
import { FallbackScene } from './fallback';
import { SwitchScene, type SwitchPick } from './switch';
import { ShortlistScene } from './shortlist';
import { StackTypesScene } from './stack-types';
import { ChartNoAxesColumn, ClipboardList, HeartHandshake, Megaphone, Sparkles } from 'lucide-react';

/**
 * Which part of the painting a cover shows: `x`/`y` are the object-position
 * (and zoom origin) in percent, `zoom` scales in from there, `flip` mirrors it.
 * Covers zoom in from the top (y 0) so they stay on the blue sky and its
 * clouds; the valley would wash out the white cards and wires.
 */
export interface Sky {
  x: number;
  y: number;
  zoom: number;
  flip?: boolean;
}

export interface CoverSpec {
  /** The cover line, two short lines. It adds to the post's title (shown under the cover), so never repeats it. No em dashes. */
  lines: readonly [string, string];
  /** Cover line size in canvas px (66 by default); only the fallback shrinks it, to fit a long title. */
  size?: number;
  sky: Sky;
  Scene: (props: { v: VisualState }) => ReactNode;
}

/** The shortlists on the two "alternatives" covers, with each pick's "best for" tag from the article. */
const ASHBY_PICKS: readonly SwitchPick[] = [
  { name: 'Fluxberry', tag: 'Flat price', hue: 'blue', icon: Sparkles },
  { name: 'Greenhouse', tag: 'Structured hiring', hue: 'violet', icon: ClipboardList },
  { name: 'Lever', tag: 'ATS plus CRM', hue: 'teal', icon: HeartHandshake },
  { name: 'Workable', tag: 'Job-board reach', hue: 'orange', icon: Megaphone },
];
const GREENHOUSE_PICKS: readonly SwitchPick[] = [
  { name: 'Fluxberry', tag: 'AI scoring', hue: 'blue', icon: Sparkles },
  { name: 'Ashby', tag: 'Analytics-led', hue: 'violet', icon: ChartNoAxesColumn },
  { name: 'Lever', tag: 'ATS plus CRM', hue: 'teal', icon: HeartHandshake },
  { name: 'Workable', tag: 'Job-board reach', hue: 'orange', icon: Megaphone },
];

/** Covers by post slug. A post without one gets `fallbackCover`. */
export const COVERS: Record<string, CoverSpec> = {
  'how-to-improve-recruitment-process': {
    lines: ['Hire faster,', 'keep the bar.'],
    sky: { x: 50, y: 0, zoom: 1.3 },
    Scene: HiringProcessScene,
  },
  'metaview-alternatives': {
    lines: ['Nine alternatives,', 'by tool type.'],
    sky: { x: 30, y: 0, zoom: 1.7 },
    Scene: ToolSortScene,
  },
  'tools-that-integrate-with-greenhouse': {
    lines: ['Greenhouse,', 'at the center.'],
    sky: { x: 100, y: 0, zoom: 1.5 },
    Scene: HubScene,
  },
  'tools-that-integrate-with-lever': {
    lines: ['Lever, across', 'the whole funnel.'],
    sky: { x: 30, y: 0, zoom: 1.45, flip: true },
    Scene: FunnelScene,
  },
  'tools-that-integrate-with-ashby': {
    lines: ["Ashby's API,", 'put to work.'],
    sky: { x: 55, y: 0, zoom: 1.6 },
    Scene: EventStreamScene,
  },
  'tools-that-integrate-with-bamboohr': {
    lines: ['BambooHR,', 'fully stacked.'],
    sky: { x: 75, y: 0, zoom: 1.35, flip: true },
    Scene: StackScene,
  },
  'ashby-alternatives': {
    lines: ['Life after', 'Ashby.'],
    sky: { x: 10, y: 0, zoom: 1.5 },
    Scene: ({ v }) => <SwitchScene v={v} from="Ashby" note="ATS · analytics-led" picks={ASHBY_PICKS} />,
  },
  'greenhouse-alternatives': {
    lines: ['Life after', 'Greenhouse.'],
    sky: { x: 65, y: 0, zoom: 1.45, flip: true },
    Scene: ({ v }) => <SwitchScene v={v} from="Greenhouse" note="ATS · structured hiring" picks={GREENHOUSE_PICKS} />,
  },
  'best-applicant-tracking-systems': {
    lines: ['Ten ATS,', 'one shortlist.'],
    sky: { x: 40, y: 0, zoom: 1.55, flip: true },
    Scene: ShortlistScene,
  },
  'recruiting-software': {
    lines: ['Eight tools,', 'one hiring stack.'],
    sky: { x: 90, y: 0, zoom: 1.35 },
    Scene: StackTypesScene,
  },
  'tools-that-integrate-with-sap-successfactors': {
    lines: ['12 tools for', 'SuccessFactors.'],
    sky: { x: 85, y: 0, zoom: 1.5 },
    Scene: SystemOfRecordScene,
  },
};

/** A post without its own cover: the title as the cover line (split near the middle) over the brand mark. */
export function fallbackCover(title: string): CoverSpec {
  const words = title.split(/\s+/);
  let split = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < best) {
      best = diff;
      split = i;
    }
  }
  const lines = [words.slice(0, split).join(' '), words.slice(split).join(' ')] as const;
  // Manrope semibold averages about half an em per character; keep the longer line inside ~1080px.
  const longest = Math.max(...lines.map((line) => line.length));
  return {
    lines,
    size: Math.min(66, Math.floor(1080 / (longest * 0.52))),
    sky: { x: 50, y: 0, zoom: 1.4 },
    Scene: FallbackScene,
  };
}
