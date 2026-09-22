import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { noIndexMetadata } from '@/lib/seo';
import { safeNextPath } from '@/lib/safe-path';

export const metadata: Metadata = { title: 'Sign up', ...noIndexMetadata };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp
        {...(next ? { forceRedirectUrl: next } : {})}
        {...(params.email ? { initialValues: { emailAddress: params.email } } : {})}
      />
    </div>
  );
}
