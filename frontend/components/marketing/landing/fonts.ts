import { Inter, Manrope } from 'next/font/google';

/*
 * The landing design (converted from Framer) sets headings and UI in Manrope
 * and body copy in Inter. The marketing pages and the auth pages share these;
 * the dashboard keeps Geist.
 */
const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-manrope', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400'], variable: '--font-inter', display: 'swap' });

/** Classes that define --font-manrope and --font-inter for everything inside. */
export const landingFonts = `${manrope.variable} ${inter.variable}`;
