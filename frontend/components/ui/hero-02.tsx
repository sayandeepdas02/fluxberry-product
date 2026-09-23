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
  descriptionLine2?: string;
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
  descriptionLine2,
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
        'tracking-tight whitespace-nowrap text-white drop-shadow-md',
        vs.title,
      )}
    >
      {title}
      {titleLine2 && (
        <>
          <br />
          {titleLine2}
        </>
      )}
    </h1>
  );

  const descriptionElement = description && (
    <p className={cn('text-white/80 drop-shadow', vs.description)}>
      {description}
      {descriptionLine2 && (
        <>
          <br />
          {descriptionLine2}
        </>
      )}
    </p>
  );

  const ctaElement = <MkButton href={ctaLink} className="border-white/20 bg-white text-primary hover:bg-white/90">{ctaText}</MkButton>;

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
    <section className="relative isolate w-full overflow-hidden">
      {washImage && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          src={washImage}
        />
      )}
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
          className={cn('flex w-full flex-col items-center text-center', vs.header)}
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
