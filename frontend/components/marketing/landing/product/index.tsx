'use client';

import { CoverFrame } from '@/components/marketing/blog/covers/cover';
import type { ProductVisualKind } from '../content';
import { PRODUCT_COVERS } from './registry';

/** The animated cover for one Product card. It is the card's picture, so it carries a text alternative. */
export function ProductCover({ kind, className }: { kind: ProductVisualKind; className?: string }) {
  const cover = PRODUCT_COVERS[kind];
  return (
    <CoverFrame
      cover={cover}
      label={cover.label}
      sizes="(min-width: 1200px) 640px, (min-width: 810px) 70vw, 100vw"
      className={className}
    />
  );
}
