import { Inter } from 'next/font/google';

/**
 * Inter with a real 600 weight for bold text in articles (posts use a lot of
 * it). Only blog posts load this, so the landing page keeps its single Inter
 * weight; it redefines --font-inter for everything inside the article.
 */
export const articleInter = Inter({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-inter', display: 'swap' });
