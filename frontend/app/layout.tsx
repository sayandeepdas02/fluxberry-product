import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { publicConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: {
    default: publicConfig.appName,
    template: `%s · ${publicConfig.appName}`,
  },
  description: 'A simple, AI-native applicant tracking system.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
