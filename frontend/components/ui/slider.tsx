'use client';

import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';
import * as React from 'react';

/*
 * Base UI slider (coss/ui). The original classes target Tailwind v4; this app
 * runs Tailwind 3.4, so v4-only syntax is translated: `data-x:` becomes
 * `data-[x]:`, `has-focus-visible:` becomes `has-[:focus-visible]:`,
 * `--theme()` and `shadow-xs/5` become plain rgba shadows, and opacities
 * outside v3's scale use arbitrary values.
 */

export function Slider({
  className,
  children,
  defaultValue,
  value,
  min = 0,
  max = 100,
  getAriaLabel,
  getAriaValueText,
  ...props
}: SliderPrimitive.Root.Props &
  Pick<SliderPrimitive.Thumb.Props, 'getAriaLabel' | 'getAriaValueText'>): React.ReactElement {
  const _values = React.useMemo(() => {
    if (value !== undefined) return Array.isArray(value) ? value : [value];
    if (defaultValue !== undefined) return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    return [min];
  }, [value, defaultValue, min]);

  return (
    <SliderPrimitive.Root
      className={cn('data-[orientation=horizontal]:w-full', className)}
      defaultValue={defaultValue}
      max={max}
      min={min}
      thumbAlignment="edge"
      value={value}
      {...props}
    >
      {children}
      <SliderPrimitive.Control
        // The vertical padding widens the pointer target around the 4px track.
        className="flex touch-none select-none data-[disabled]:pointer-events-none data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:min-w-44 data-[orientation=horizontal]:py-2 data-[orientation=vertical]:flex-col data-[disabled]:opacity-[.64]"
        data-slot="slider-control"
      >
        <SliderPrimitive.Track
          className="relative grow select-none before:absolute before:rounded-full before:bg-input data-[orientation=horizontal]:h-1 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1 data-[orientation=horizontal]:before:inset-x-0.5 data-[orientation=vertical]:before:inset-x-0 data-[orientation=horizontal]:before:inset-y-0 data-[orientation=vertical]:before:inset-y-0.5"
          data-slot="slider-track"
        >
          <SliderPrimitive.Indicator
            className="select-none rounded-full bg-primary data-[orientation=horizontal]:ms-0.5 data-[orientation=vertical]:mb-0.5"
            data-slot="slider-indicator"
          />
          {Array.from({ length: _values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              className="block size-5 shrink-0 select-none rounded-full border border-input bg-white bg-clip-padding shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-[box-shadow,transform] before:absolute before:inset-0 before:rounded-full before:shadow-[0_1px_rgba(0,0,0,0.04)] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/25 data-[dragging]:scale-[1.2] sm:size-4 dark:border-background dark:has-[:focus-visible]:ring-ring/50 [&:has(*:focus-visible)]:shadow-none data-[dragging]:shadow-none"
              data-slot="slider-thumb"
              getAriaLabel={getAriaLabel}
              getAriaValueText={getAriaValueText}
              index={index}
              key={String(index)}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export function SliderValue({ className, ...props }: SliderPrimitive.Value.Props): React.ReactElement {
  return (
    <SliderPrimitive.Value className={cn('flex justify-end text-sm', className)} data-slot="slider-value" {...props} />
  );
}

export { SliderPrimitive };
