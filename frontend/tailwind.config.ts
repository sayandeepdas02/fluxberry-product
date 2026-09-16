import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './content/**/*.md',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1200px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },

        /*
         * Marketing-only scales (landing, blog, auth). Flat hex on purpose: these pages are
         * light-only by design, so they don't participate in the dashboard's HSL theme tokens.
         * `berry` is the Fluxberry brand (primary #ec4899) expanded into a usable ramp;
         * `ink` is the neutral/hairline ramp the ruled-paper layout is built from.
         */
        berry: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          900: '#831843',
        },
        ink: {
          DEFAULT: '#202020',
          secondary: '#2a2a2a',
          muted: '#81838a',
          /*
           * Two line weights, as chanhdai.com does it: `ink-200` is structural
           * (the frame rails, a section's outer edge, the header rule) and
           * `ink-line` — 64% of the way from that border to the background — is
           * for interior rules between cells. Using one weight for both makes a
           * grid read as heavy as its frame.
           */
          line: '#f0f0f0',
          50: '#fafafa',
          100: '#f2f2f2',
          200: '#e8e8e8',
          300: '#c4c4c4',
          400: '#7a7a7a',
          500: '#6b6b6b',
          600: '#646464',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // deliberate type scale (spec §7) — named by role, not size, so meaning survives a rescale
        display: ['3rem', { lineHeight: '3.375rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        'page-title': ['1.75rem', { lineHeight: '2.125rem', fontWeight: '600', letterSpacing: '-0.01em' }],
        'section-title': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'card-title': ['1rem', { lineHeight: '1.375rem', fontWeight: '600' }],
        'subtle-title': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.625rem', fontWeight: '400' }],
        body: ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '500', letterSpacing: '0.01em' }],

        // Marketing scale. Headings sit at weight 500 — the restraint is the whole look.
        'mk-hero': ['clamp(40px, 5vw, 60px)', { lineHeight: '1.04', fontWeight: '500', letterSpacing: '-0.032em' }],
        'mk-h1': ['clamp(36px, 4vw, 48px)', { lineHeight: '1.15', fontWeight: '500', letterSpacing: '-0.03em' }],
        'mk-h2': ['clamp(32px, 3.35vw, 44px)', { lineHeight: '1.14', fontWeight: '500', letterSpacing: '-0.045em' }],
        'mk-h3': ['28px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '-0.01em' }],
        'mk-h4': ['24px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '-0.03em' }],
        'mk-h5': ['20px', { lineHeight: '1.25', fontWeight: '500', letterSpacing: '-0.025em' }],
        'mk-title': ['17px', { lineHeight: '24px', fontWeight: '500' }],
        'mk-lead': ['18px', { lineHeight: '1.55', fontWeight: '400', letterSpacing: '-0.01em' }],
        'mk-body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'mk-label': ['14px', { lineHeight: '21px', fontWeight: '400' }],
        'mk-nav': ['13px', { lineHeight: '16px', fontWeight: '450' }],
        'mk-meta': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'mk-micro': ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.04em' }],
      },
      typography: {
        DEFAULT: {
          css: {
            'code, pre': { fontFamily: 'var(--font-geist-mono)' },
          },
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'mk-reveal-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [
    typography,
    // `retina:border-[0.5px]` — on 2x screens a 1px border is two device pixels,
    // so hairlines that should read as one line are drawn at half a CSS pixel.
    plugin(({ addVariant }) => {
      addVariant('retina', '@media (min-resolution: 2dppx)');
    }),
  ],
};

export default config;
