'use client';

import * as React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import Balancer from 'react-wrap-balancer';

import { cn } from '@/lib/utils';

import { Play } from 'lucide-react';
import { MkButton } from '@/components/marketing/mk-button';

export interface Hero02Props {
  title: string;
  titleLine2?: string;
  description: string;
  washImage: string;
  animation?: 'none' | 'subtle';
  ctaText?: string;
  ctaLink?: string;
  variant?: 'standard' | 'compact';
}

const variantStyles = {
  standard: {
    section: 'py-20 sm:py-28',
    title: 'text-mk-hero',
    description: 'max-w-md text-mk-body',
    header: 'gap-5',
    content: 'gap-14 sm:gap-20',
  },
  compact: {
    section: 'py-14 sm:py-20',
    title: 'text-mk-h1',
    description: 'max-w-sm text-mk-body',
    header: 'gap-4',
    content: 'gap-10 sm:gap-14',
  },
} as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const mediaItem: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

function Reveal({
  active,
  variants,
  className,
  children,
}: Readonly<{
  active: boolean;
  variants?: Variants;
  className?: string;
  children: React.ReactNode;
}>) {
  if (!active) return <div className={className}>{children}</div>;

  return (
    <motion.div variants={variants ?? item} className={className}>
      {children}
    </motion.div>
  );
}

export function Hero02({
  title,
  titleLine2,
  description,
  washImage,
  animation = 'none',
  ctaText = 'Get started',
  ctaLink = '/sign-up',
  variant = 'standard',
}: Readonly<Hero02Props>) {
  const reduce = useReducedMotion();
  const animate = animation === 'subtle' && !reduce;
  const vs = variantStyles[variant];

  const titleElement = title && (
    <h1
      className={cn(
        'tracking-tight text-balance text-foreground',
        vs.title,
      )}
    >
      <Balancer>{title}</Balancer>
      {titleLine2 && (
        <>
          <br />
          <Balancer>{titleLine2}</Balancer>
        </>
      )}
    </h1>
  );

  const descriptionElement = description && (
    <p className={cn('text-muted-foreground', vs.description)}>
      <Balancer>{description}</Balancer>
    </p>
  );

  const ctaElement = <MkButton href={ctaLink}>{ctaText}</MkButton>;

  const mediaElement = (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted/30">
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Play className="size-7 translate-x-0.5" fill="currentColor" />
        </div>
        <span className="text-sm text-muted-foreground">Product demo coming soon</span>
      </div>
    </div>
  );

  return (
    <section className="bg-background relative isolate w-full overflow-hidden">
      <motion.div
        className={cn(
          'relative z-10 mx-auto flex max-w-6xl flex-col px-6',
          vs.section,
          vs.content,
        )}
        variants={animate ? container : undefined}
        initial={animate ? 'hidden' : false}
        whileInView={animate ? 'visible' : undefined}
        viewport={{ once: true, margin: '-80px' }}
      >
        <Reveal
          active={animate}
          className={cn('flex max-w-2xl flex-col items-start', vs.header)}
        >
          {titleElement}
          {descriptionElement}
          {ctaElement}
        </Reveal>

        <Reveal active={animate} variants={mediaItem} className="w-full">
          {mediaElement}
        </Reveal>
      </motion.div>
    </section>
  );
}

export default Hero02;
