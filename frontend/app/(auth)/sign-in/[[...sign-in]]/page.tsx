import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = { title: 'Sign in', ...noIndexMetadata };

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn />
    </div>
  );
}
