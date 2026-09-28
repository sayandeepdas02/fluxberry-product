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
