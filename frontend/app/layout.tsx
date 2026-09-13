import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
import { publicConfig } from '@/lib/config';

const description = 'A simple, AI-native applicant tracking system.';

export const metadata: Metadata = {
  metadataBase: new URL(publicConfig.appUrl),
  title: {
    default: publicConfig.appName,
    template: `%s · ${publicConfig.appName}`,
  },
  description,
  keywords: ['applicant tracking system', 'ATS', 'AI hiring', 'recruiting software', 'hiring platform'],
  openGraph: {
    type: 'website',
    siteName: publicConfig.appName,
    title: publicConfig.appName,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: publicConfig.appName,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
