import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from './providers';
import { publicConfig } from '@/lib/config';
import { FOUNDER, FOUNDER_PERSON } from '@/lib/founder';

const description =
  'Fluxberry is the AI native hiring platform for founders and hiring managers. Screen applicants with AI, run your pipeline and careers page, and hire faster without the bloat of a legacy ATS.';

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: publicConfig.appName,
  url: publicConfig.appUrl,
  logo: `${publicConfig.appUrl}/logo-mark.png`,
  founder: FOUNDER_PERSON,
  description: 'AI Native Hiring Platform',
};

export const metadata: Metadata = {
  metadataBase: new URL(publicConfig.appUrl),
  applicationName: publicConfig.appName,
  title: {
    default: `${publicConfig.appName} - AI Native Hiring Platform`,
    template: `%s · ${publicConfig.appName}`,
  },
  description,
  keywords: ['applicant tracking system', 'ATS', 'AI hiring', 'recruiting software', 'hiring platform'],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: publicConfig.appName,
    title: `${publicConfig.appName} - AI Native Hiring Platform`,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    site: FOUNDER.xHandle,
    creator: FOUNDER.xHandle,
    title: `${publicConfig.appName} - AI Native Hiring Platform`,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-scroll-behavior lets Next pause the landing page's smooth scrolling during route changes.
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c') }}
        />
        {publicConfig.hasClerk ? (
          <ClerkProvider publishableKey={publicConfig.clerkPublishableKey}>
            <Providers>{children}</Providers>
          </ClerkProvider>
        ) : (
          <Providers>{children}</Providers>
        )}
      </body>
    </html>
  );
}
