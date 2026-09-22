import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { noIndexMetadata } from '@/lib/seo';
import { safeNextPath } from '@/lib/safe-path';

export const metadata: Metadata = { title: 'Sign in', ...noIndexMetadata };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        {...(next ? { forceRedirectUrl: next } : {})}
        {...(params.email ? { initialValues: { emailAddress: params.email } } : {})}
      />
    </div>
  );
}
